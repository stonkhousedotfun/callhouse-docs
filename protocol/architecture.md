# Architecture

Callhouse is one non-upgradeable vault contract on Robinhood Chain (chain id 4663). It pools NVDA Stock Tokens and runs a weekly covered call on them. Each week it arms a Valorem call option type, lists those calls on Seaport 1.6 as an order whose zone is the vault itself, and writes calls into Valorem only when a buyer fills, exactly the number bought. The USDG premium is paid to shareholders through a per-share index. Off-chain services support it: a keeper, an indexer, a web app with the fill page, and a small alert relay. None of them holds or can move depositor funds.

This page covers the components, the Seaport zone hooks, the phase machine, and the behaviours that integrators most often misread. Money maths is on [Accounting](accounting.md), permissions are on [Roles and admin powers](roles.md), and addresses are on [Contracts and addresses](addresses.md).

{% hint style="warning" %}
The vault is not deployed yet and is unaudited: no external security firm has reviewed it. See [Security and audits](security.md).
{% endhint %}

Source paths on this page refer to the `callhouse-contracts` repository (`src/`, `script/`, `test/`) unless marked as the app repository. Where the prose and the code disagree, the code is the specification.

{% hint style="info" %}
**History.** Earlier designs read each week's strikes from Overcall's NVDA registry, wrote the week's calls up front, and listed them on Overcall's order book with a 5% Overcall fee item. The current vault does none of that: there is no registry, no Overcall book, no Overcall fee and no signature.
{% endhint %}

## Components

```
                         depositors (wallets)
                     NVDA in / shares, NVDA, USDG out
                                 |
                                 v
+----------------------------------------------------------------------+
| Vault  (src/Vault.sol)  one deployment, not upgradeable              |
|   ERC-20 shares, AccessControl, ReentrancyGuard                      |
|   inherits: Distributor | AdapterValorem | AdapterSeaport            |
|   calls internal library: Policy (hard caps, pure maths)             |
|   DELEGATECALLs linked libraries: ValoremLib, SeaportOrderLib        |
|   is the Seaport offerer AND the Seaport zone of its own listing     |
+-----+-------------------------+-----------------------+--------------+
      |                         ^                       |
      | write (inside a fill),  | authorizeOrder /      | reads spot
      | redeem the claim        | validateOrder         | (arm, listing, fill)
      v                         | (Seaport calls these) v
 Valorem Clear              Seaport 1.6            Chainlink RHNVDA/USD
 (collateral, option        (validate, cancel,     AggregatorProxy
  ERC-1155, claim NFT)       counter; buyers fill)

 off-chain, non-custodial:
   keeper   creates the week's option type, arms it, authorises and
            reprices the listing, serves the order at /orders, locks the
            book, closes the week, settles the queue, retries a strand
   indexer  reads events, serves the public cycle history (read-only API)
   web app  builds transactions the user signs; the fill page is the venue
   relay    forwards keeper alerts to Discord or Telegram (no vault keys)
```

### The vault and what it inherits

`Vault` is the only contract Callhouse deploys for the product, apart from its two linked libraries and, at launch, its own Valorem clearinghouse instance (see [The clearinghouse](#the-clearinghouse-is-a-deploy-time-choice)). It is an ERC-20 share token (the deploy script's default name and symbol are `Callhouse NVDA` / `cNVDA`, with 18 decimals). It also uses OpenZeppelin `AccessControl` and `ReentrancyGuard`, and it inherits three abstract bases:

| Base | Job |
|---|---|
| `Distributor` | The USDG accrual index (`accUsdgPerShare`). It settles on every share balance change and handles USDG claims. |
| `AdapterValorem` | Records each fill's write, redeems the claim, and reads the live position (`lockedAssets`, `claimedExerciseProceeds`, `contractsAssigned`). Its ERC-1155 receiver accepts only mints from the clearinghouse. |
| `AdapterSeaport` | The listing lifecycle (approve, cancel, invalidate), the per-cycle budget of three listings, and the one-time ERC-1155 approval to Seaport. |

These are inherited rather than deployed separately because the external protocols check the caller's identity. Valorem mints the claim NFT to `msg.sender` and `redeem` reverts for anyone who does not own it. Seaport accepts `validate` and `cancel` only from the order's offerer, and calls the zone hooks on the zone. The code therefore has to run as the vault (`src/AdapterValorem.sol`, `src/AdapterSeaport.sol` NatSpec).

### Libraries

| Library | Kind | What it holds |
|---|---|---|
| `SeaportOrderLib` (`src/lib/SeaportOrderLib.sol`) | `public` functions, deployed separately and linked, reached by `DELEGATECALL` | The listing shape check and Seaport's three encoders (`getOrderHash`, `validate`, `cancel`). |
| `ValoremLib` (`src/lib/ValoremLib.sol`) | `public`, linked, `DELEGATECALL` | The arm gate (`open`), the fill gate and the write (`writeOnFill`), the low-level claim redeem (`tryRedeemClaim`), the oracle reads, and the position views. |
| `Policy` (`src/Policy.sol`) | `internal`, compiled into the vault | Pure bounds maths: the OTM strike band, the premium floor, position size, the fee split, oracle normalisation, and the compiled-in hard caps. |

Because the linked libraries run by `DELEGATECALL`, `address(this)` inside them is the vault. Calls they make to Seaport and Valorem therefore come from the vault. Both libraries must be deployed before the vault and linked into it. `script/Verify.s.sol` checks every library link site in the vault's runtime bytecode (eight in the rehearsal record, `docs/DEPLOY.md`), reading the expected count from the build artifact. It also compares the runtime bytecode of the vault and both libraries byte for byte with the compiled artifacts of the commit it is run from, masking only the link sites, immutables and each library's own address word (see [Roles and admin powers](roles.md)).

### Contract size and the chain's code limit

Robinhood Chain enforces a **98,304 byte** contract code limit, not the 24,576 bytes of EIP-170 (verified with `eth_call --create` probes: 98,304 bytes deploy, 98,305 bytes fail; `README.md` item 1). The vault's runtime is above 24,576 bytes (25,775 bytes at commit `bec4dbd`, `README.md` item 1) and deploys on 4663. `foundry.toml` sets `code_size_limit = 98304`, and a local anvil fork needs `--code-size-limit 98304` or it refuses the vault. The libraries are kept as separate contracts because each has its own `Verify.s.sol` check and a smaller vault is a smaller review surface, not because of size (`src/lib/SeaportOrderLib.sol` NatSpec). The contracts are not portable to an EIP-170 chain without another extraction.

### External contracts

| Contract | Role in the system | Trust notes |
|---|---|---|
| Valorem Clear | Holds the written collateral, mints the option ERC-1155 and the claim NFT, settles exercise, returns collateral and strike proceeds on `redeem`. The keeper creates each week's option type on it with `newOptionType`, which anyone may call. | The vault is the writer and keeps its own claim NFT. Assignment is pro rata by amount written across every writer of the option id, not by who sold. Because the vault writes only what it sells, it can be assigned on at most the contracts it sold (`src/AdapterValorem.sol` NatSpec). The clearinghouse has no owner, no pause and no proxy; its one privileged key, `feeTo`, holds the 15 bps engine fee switch. |
| Seaport 1.6 | The marketplace. The vault is both the offerer and the zone of its listing. | Listings are authorised on chain: `approveListing` calls `seaport.validate`, so a fill needs no signature. Seaport calls the vault's `authorizeOrder` before any transfer and `validateOrder` after all transfers, on every fulfilment path. The conduit key is zero (`script/Deploy.s.sol`), so the vault approves Seaport itself for the option ERC-1155, once, in the constructor. Seaport has no admin, no proxy and no fee switch. |
| USDG | Premium and strike currency, 6 decimals. | Third-party upgradeable proxy. Its issuer can pause it and freeze addresses instantly; in an assigned week, a pause or a freeze of the vault or the clearinghouse strands the week's close rather than blocking it (see [Stranded claims](#stranded-claims)). |
| NVDA Stock Token | The underlying asset, 18 decimals. | Third-party beacon proxy. The vault probes `oraclePaused()` before an arm, a listing and every fill, and reads `uiMultiplier()` for display only. |
| Chainlink RHNVDA/USD | Spot price for the strike band and the premium floor, and for display. | Read only in `rollOpen`, `approveListing`, every fill (`authorizeOrder`) and the `spotUsdg()` view. Redemption, harvest, the redeem queue, `rollClose` and `retryStrandedClaim` never read a price. An arm, a listing or a fill is refused if the answer is older than `maxPriceAge` (4 days at launch, bounded in bytecode to 1 hour through 7 days). |

Addresses for all of these are on [Contracts and addresses](addresses.md).

### The clearinghouse is a deploy-time choice

The vault takes its clearinghouse as a constructor argument and reads every option fact it needs from it (`src/Vault.sol` `Config`). `script/Deploy.s.sol` accepts any instance whose `feeBps()` is 15, whose fee switch is off and which is ERC-1155. `script/DeployClear.s.sol` deploys a Callhouse-owned instance from the vendored upstream Valorem artifact (commit `6436c823`), with `feeTo` set to the address passed as `CLEAR_FEE_TO`: the vault admin, in the launch plan.

**The launch plan uses Callhouse's own instance** (`SECURITY.md` §3; the internal review of 2026-09-14, finding I-01). One consequence is that the vault admin holds both ends of the Valorem engine fee: the switch on the clearinghouse and `acceptValoremFee` on the vault. That is covered on [Roles and admin powers](roles.md#the-valorem-engine-fee-on-our-own-clearinghouse) and [Security and audits](security.md#what-each-key-compromise-buys).

### Not upgradeable

There is no proxy, no `delegatecall` to a mutable target, no rescue function and no admin-gated token transfer. The external addresses (asset, USDG, clearinghouse, Seaport, price feed) and the conduit key are `immutable`, and the zone is the vault's own address. A defect fix means deploying a new vault and migrating (`src/Vault.sol` header NatSpec).

## How a week works on chain

1. **The keeper creates the option type.** It calls `clear.newOptionType(NVDA, 1e18, USDG, strike, exerciseTs, expiryTs)`. The keeper picks the strike about 5% above spot, rounded to a whole USDG, and the exercise time at the NYSE Friday close (see [Timing](#timing)). Anyone can create an option type; the vault trusts nothing about it until the next step.
2. **`rollOpen(optionId)` arms the week and writes nothing.** The vault reads the option tuple back from the clearinghouse, checks it (see [Transitions](#transitions)), snapshots the strike and window, and moves to `Listed`. `RollOpen.contractsCount` is always 0.
3. **`approveListing(components)` authorises one Seaport order** sized to the vault's remaining capacity. The vault checks every field, then calls `seaport.validate`. The order is served by the keeper at `/orders` and filled through the web app's fill page or any Seaport 1.6 client.
4. **Every fill is a write.** Seaport calls the vault's `authorizeOrder`, which re-checks the price floors at live spot and writes exactly the contracts being bought into Valorem. Seaport moves them to the buyer and the USDG to the vault. `validateOrder` then confirms nothing stayed behind.
5. **At `cycleExerciseTs`,** deposits and fills close, anyone can call `lockBook`, and Valorem opens exercise.
6. **After `cycleExpiryTs`,** `rollClose` redeems the claim (if anything sold), harvests the premium, settles the redeem queue, and returns the vault to `Idle`.

In a fork rehearsal of the production keeper on 2026-09-14 (an anvil fork of chain 4663 at block 63,348,605, with the price feed mocked at the live Chainlink answer; `keeper/DRYRUN.md` in the app repository), spot was 211.93 USDG, the keeper created a 223 USDG strike for its second week (the 2026-09-25 16:00 ET close), listed 14 contracts at 0.856189 USDG each, and two buyers filled 2 and 3. The vault wrote exactly 5 and held no option tokens after either fill.

## The Seaport zone hooks

Every listing is a `PARTIAL_RESTRICTED` Seaport 1.6 order whose offerer and zone are both the vault (`src/lib/SeaportOrderLib.sol`). "Restricted" makes Seaport call the zone's hooks on every fill; "partial" lets a buyer take part of the order and leave the rest offered. The order hash commits to the zone, the order type, the items, the times, the salt and the counter, so no other order can borrow the vault's authorisation.

### `authorizeOrder`: before any transfer

Seaport calls it before it moves anything and before it records the fill, on every fulfilment path (`src/Vault.sol` `authorizeOrder`). It reverts unless, in order:

1. The caller is Seaport (`NotSeaport`).
2. The order hash equals the recorded `listingHash` and the offerer is the vault (`NotLiveListing`). A stranger's restricted order naming the vault as zone fails here, before any state moves.
3. The phase is `Listed` (`WrongPhase`) and writes are not halted (`WritesAreHalted`).

It then runs the fill gate in `ValoremLib.writeOnFill`, which reverts unless:

4. `block.timestamp < cycleExerciseTs` (`WriteWindowClosed`), and the fill size is non-zero.
5. Valorem's engine fee is off, or the admin has accepted it (`ValoremFeeNotAccepted`).
6. The Stock Token's oracle is not paused (`OraclePaused`) and the price is not older than `maxPriceAge` (`StalePrice`).
7. The strike is at or above the band floor at live spot, `spot × (1 + minOtmBps / 10,000)` (`StrikeBelowBand`). The ceiling is not re-checked: after a sell-off, a strike above the band is safer to sell, not riskier.
8. This fill's USDG, `unit price × k`, is at least the premium floor at live spot, `spot × k × minPremiumBps / 10,000`, plus the engine fee valued at spot when the fee is on (`PremiumBelowFloorAtFill`).
9. `contractsWritten + k` is within `maxContractsCap` and within `maxUtilizationBps` of `totalAssets()` at that moment (`ContractsAboveCap`, `ContractsAboveUtilization`).

If every check passes, the library approves exactly the collateral plus any fee to the clearinghouse, writes `k` contracts (`clear.write(optionId, k)` on the first fill of the week, which opens the claim; `clear.write(claimKey, k)` afterwards, refused unless the same claim comes back), resets the approval to zero, and requires the vault's NVDA balance to still cover `reservedAssets` (`ReserveBreached`). The vault then emits `CallsWritten` for that fill.

The first `authorizeOrder` of a transaction records the vault's option-token balance in transient storage and sets a flag. The flag also closes deposits for the rest of that transaction (see [Things that look wrong but are not](#things-that-look-wrong-but-are-not)).

### `validateOrder`: after all transfers

Seaport calls it after every transfer of the fill. It reverts unless the caller is Seaport and the vault's balance of the week's option token equals the balance recorded before the transaction's first write (`InventoryLeftBehind`). If any freshly written token stayed in the vault, the whole fill reverts, and the write with it. The vault therefore never holds an unsold call.

### What this guarantees, and what it does not

- **Written equals sold.** Nothing is written at `rollOpen`, each fill writes exactly what Seaport moves to the buyer, and a fill that leaves anything behind reverts. `invariant_vaultHoldsNoOptionTokens` and `invariant_assignedNeverExceedsSold` assert this after every call of the stateful suite.
- **The vault can never be assigned on more than it sold.** Valorem assigns pro rata by amount written across every writer of an id, so a third party writing into the vault's series and exercising can assign the vault at most the calls it was paid for (`test/regression/AF01_UnsoldInventory.t.sol`, on the real Clear bytecode).
- **The vault never calls a Seaport fulfil function.** Seaport exempts only the zone itself from the hooks, and the vault never fills, so every fill runs through them.
- **A fill can be refused after a rally.** The floors are re-derived at the spot of the fill's block. The keeper then reprices, within the vault's three listings a week. Inside `fulfillAvailableAdvancedOrders` a refused hook skips the vault's order and the buyer's other orders still fill; on every other path the fill reverts.
- **Not a price guarantee.** The floors are minimums set by policy. They do not make a sale fair value (see [Security and audits](security.md#what-each-key-compromise-buys)).

## The phase machine

`Vault.phase` is one of `Idle`, `Listed`, `Exercisable` or `Settling`. `Idle` has two sub-states: flat, and **stranded** (`isStranded()`: `Idle` with a claim still open).

```
                  rollOpen(optionId)
                  KEEPER_ROLE; not halted; not stranded; arm gate passes
      +--------+ ------------------------------------------> +----------+
      |  Idle  |                                              |  Listed  |  fills write here,
      +--------+ <---------------+                            +----------+  until cycleExerciseTs
        ^    ^                   |                                 |
        |    |                   |  rollClose()                    |  lockBook()
        |    |                   |  from Listed (nobody            |  anyone, once
        |    |                   |  called lockBook)               |  now >= cycleExerciseTs
        |    |                   |                                 v
        |    |                   |                          +-------------+
        |    |                   +------------------------- | Exercisable |
        |    |                      rollClose()             +-------------+
        |    |
        |    |   rollClose(): allowed once now >= cycleExpiryTs
        |    |     KEEPER_ROLE            from cycleExpiryTs
        |    |     any other address      from cycleExpiryTs + 1 hour
        |    |   Inside that one transaction: phase = Settling -> ... -> Idle
        |    |
        |    +-- redeem succeeded (or nothing sold): Idle, flat
        |
        +------- redeem reverted: Idle, STRANDED (claim kept)
                   anyone: retryStrandedClaim() -> Idle, flat
```

### Transitions

| Edge | Function | Who may call | Preconditions enforced on chain |
|---|---|---|---|
| Idle to Listed | `rollOpen(uint256 optionId)` | `KEEPER_ROLE` | Phase is `Idle`. `writesHalted` is false. No claim is open (`StillStranded` otherwise). In `ValoremLib.open`: the id is an option type, not a claim id or an unknown id (`NotAnOptionType`); its underlying is the vault's asset and its exercise asset is USDG; one contract is exactly one token, `1e18` (`UnexpectedLotSize`); the exercise time is at least 1 hour away (`ExerciseTooSoon`, `MIN_LEAD`); the exercise window is at least 1 day (`MIN_EXERCISE_WINDOW`) and expiry is no more than 21 days from now (`BadCycleWindow`, `MAX_CYCLE_TENOR`); Valorem's fee switch is off or `valoremFeeAccepted` is true; the oracle is not paused and the price is not stale; the strike is inside the OTM band, **both** bounds. The vault numbers its own cycles (`cycleNumber` increments) and resets the listing budget. |
| Listed to Exercisable | `lockBook()` | Anyone | Phase is `Listed` and `block.timestamp >= cycleExerciseTs`. Any live listing is invalidated by bumping the Seaport counter. |
| Listed or Exercisable to Idle | `rollClose()` | `KEEPER_ROLE` from `cycleExpiryTs`; any address from `cycleExpiryTs + 1 hour` (a non-keeper calling earlier gets `GuardianTooEarly`, whatever its role) | Phase is `Listed` or `Exercisable` and `block.timestamp >= cycleExpiryTs`. |
| Idle (stranded) to Idle (flat) | `retryStrandedClaim()` | Anyone | `isStranded()` (`NotStranded` otherwise), and Valorem's `redeem` now succeeds (`StillStranded` otherwise). |

`Settling` is set at the start of `rollClose` and cleared at the end of the same transaction. An outside observer never sees it, and the stateful test suite asserts this (`invariant_phaseSanity`).

`rollClose` runs these steps in order:

1. Set `phase = Settling`.
2. If a listing hash is recorded, invalidate all listings (`seaport.incrementCounter`).
3. Read `contractsAssigned()`. It must be read before the redeem, which zeroes `claimKey`.
4. If nothing was sold this week (`claimKey == 0`), skip the redeem and forget the armed type. Otherwise attempt `clear.redeem(claimKey)` as a low-level call, measuring the NVDA and USDG balance changes (`ValoremLib.tryRedeemClaim`).
   - If the redeem succeeds, the claim, `optionId` and `contractsWritten` are cleared.
   - If it reverts, the claim is **stranded**: kept as it is, a new strand generation opens, and `ClaimStranded(cycleNumber, claimKey, gen)` is emitted. A call that starved the redeem of gas reverts `RedeemOutOfGas` instead, so a stranding cannot be faked.
5. Emit `RollClose(cycleNumber, assetsReturned, usdgFromAssignment, contractsAssignedCount)`. On a stranded close both amounts are 0.
6. Harvest: index new USDG, credit strike proceeds fee-free, attempt the fee payment, emit `Harvest`.
7. Settle the redeem queue into an epoch. While stranded, the epoch also records its pro-rata share of the claim (`EpochStrandShare`).
8. Set `phase = Idle`.

### Stranded claims

Valorem's `redeem` pushes the strike USDG and then the unassigned NVDA to the vault in one call, and a revert on either leg reverts it. Each leg is pushed only when it is non-zero. The causes a token issuer can produce are: in a week with any assignment, USDG paused, the vault or the clearinghouse frozen on USDG, or the clearinghouse's USDG burnt by a supply controller; and in any week that was not fully assigned, the vault blocklisted on the Stock Token (`src/lib/ValoremLib.sol` `tryRedeemClaim` NatSpec).

While a claim is stranded (`src/Vault.sol` stranded-claim section):

- Deposits are refused and instant redemption is off. Nobody buys in or leaves at a NAV that cannot yet see the claim's proceeds.
- `rollOpen` reverts `StillStranded`, so no new week starts and there is only ever one stranded claim.
- `queueRedeem`, `settleQueue`, `completeRedeem` and `claimUsdg` are not blocked by the strand itself, though any leg that moves a token still needs that token to be transferable. A queue that settles pays its slice of the idle NVDA now, and its pro-rata share of the claim once the claim is redeemed.
- Anyone can call `retryStrandedClaim()`. It reverts `StillStranded` while the cause persists and settles the claim the first time Valorem lets it through.

The fork rehearsal on 2026-09-14 ran this path against the real USDG: after a week with 2 contracts sold and 1 exercised, USDG's freeze role froze the vault, `rollClose` stranded the claim, a retry reverted `StillStranded`, and the retry after the unfreeze redeemed 1 NVDA and 239 USDG (`keeper/DRYRUN.md` in the app repository). The maths is on [Accounting](accounting.md#stranded-claims).

### What each phase allows

| Action | Idle, flat | Idle, stranded | Listed, before `cycleExerciseTs` | Listed, from `cycleExerciseTs` | Exercisable |
|---|---|---|---|---|---|
| `deposit` / `mint` | yes, unless another refusal applies | no (`DepositsClosed`) | yes, unless another refusal applies | no (`DepositsClosed`) | no (`DepositsClosed`) |
| `redeem` / `withdraw` (instant) | yes | no (`UseQueue`) | no (`UseQueue`) | no | no |
| `queueRedeem` | yes | yes | yes | yes | yes |
| `settleQueue` | yes, with shares queued | yes, with shares queued | no (`WrongPhase`) | no | no |
| `completeRedeem` (settled epochs) | yes | yes | yes | yes | yes |
| `claimUsdg` / `claimUsdgTo` | yes | yes | yes | yes | yes |
| `retryStrandedClaim` | no (`NotStranded`) | anyone | no | no | no |
| `rollOpen` | keeper, unless halted | no (`StillStranded`) | no | no | no |
| `approveListing` | no | no | keeper, unless halted (a listing's `endTime` must be after now and no later than `cycleExerciseTs`) | no | no |
| A Seaport fill (`authorizeOrder`) | no | no | yes, unless halted and within the fill gate | no (`WriteWindowClosed`) | no |
| `invalidateAllListings` | keeper or guardian | keeper or guardian | keeper or guardian | keeper or guardian | keeper or guardian |
| `cancelListing` (needs a recorded `listingHash`, else `NoLiveListing`) | no listing recorded | no listing recorded | keeper or guardian | keeper or guardian | no listing recorded (`lockBook` cleared it) |
| `lockBook` | no | no | no | anyone | no |
| `rollClose` | no | no | no | from expiry | from expiry |
| `sweepFee` | anyone | anyone | anyone | anyone | anyone |

**One deposit gate.** `deposit` and `mint` revert `DepositsClosed`, and `maxDeposit` / `maxMint` return 0, on exactly the same conditions, decided by one private predicate, `_depositRefused` (`src/Vault.sol`):

1. A Seaport fill of the vault's listing has already written earlier in the same transaction.
2. The phase is not `Idle` or `Listed`.
3. The phase is `Listed` and `block.timestamp >= cycleExerciseTs`.
4. A claim is open and either the vault is `Idle` (stranded) or the claim holds unredeemed assignment proceeds (`claimedExerciseProceeds() != 0`).
5. The vault's NVDA balance is below `reservedAssets`, which only an issuer burn (or a Valorem fee past the utilisation ceiling) can cause.
6. The share price is below the compiled floor: `totalSupply() > totalAssets() × 1,000,000`.

Separately, a deposit that would take `totalAssets()` past `depositCap` reverts `DepositCapExceeded`, and `maxDeposit` is capped at `depositCap - totalAssets()`. The launch cap is 20 NVDA (`script/Deploy.s.sol` `LAUNCH_DEPOSIT_CAP`). A halt does not close deposits.

**A halt** (`writesHalted`) is checked in `rollOpen`, `approveListing` and every fill (`authorizeOrder`), and nowhere else. See [Roles and admin powers](roles.md#guardian_role).

### Timing

The vault never reads the wall clock for a week's schedule. It snapshots `cycleExerciseTs` and `cycleExpiryTs` from the option type at `rollOpen`, and the option type is immutable in Valorem.

The keeper chooses them (`keeper/src/calendar.ts` in the app repository):

- **Exercise:** the next NYSE Friday close, 16:00 America/New_York. That is 20:00 UTC while US daylight saving time is in effect and 21:00 UTC otherwise (daylight saving ends 2026-11-01). When the Friday is a full-day NYSE holiday, the close moves back to Thursday 16:00 ET.
- **Expiry:** 24 hours after exercise.
- **Lead:** if the next close is closer than the keeper's arm lead (6 hours by default), it uses the following Friday.

The arm gate accepts any option type whose exercise is at least 1 hour away, whose window is at least 1 day, and whose expiry is at most 21 days away, so both a normal week and a holiday week fit. Valorem allows `exercise` while `exerciseTimestamp <= now < expiryTimestamp` and `redeem` from `expiryTimestamp` on, so the two windows meet with no gap. Fills and deposits close at `cycleExerciseTs`, the same second exercise opens. The depositor-level view of the cycle is on [The weekly cycle](../product/weekly-cycle.md).

## Off-chain services

**Keeper.** A Node process holding a hot EOA with `KEEPER_ROLE` and gas, nothing else (`keeper/README.md` in the app repository). Each week it:

- creates the option type on the clearinghouse, or reuses it if the same tuple already exists
- calls `rollOpen`, then `approveListing` at the vault's full capacity, priced 1% above the premium floor by default
- serves the order at `/orders` for the fill page, with an empty signature
- every tick, mirrors the fill gate at live spot and reprices (cancel, then approve again) when a rally has pushed the price under the floor, within the three listings a week
- calls `lockBook` at the exercise time and `rollClose` at expiry
- calls `settleQueue` when the vault is `Idle` with shares queued, and `retryStrandedClaim` on a timer (hourly by default) while a claim is stranded

The keeper only proposes. The vault re-checks every field against its own state and the policy at the arm, at the listing and at every fill. The keeper never holds an option token, the claim NFT, collateral, USDG or shares, and no code path lets it transfer them. It can still choose, within policy, the strike and the price. That limit is covered in [Roles and admin powers](roles.md#keeper_role). If the keeper is down, a live listing still fills on the vault's terms for anyone holding the order, `lockBook`, `settleQueue` and `retryStrandedClaim` are permissionless, and `rollClose` opens to everyone an hour after expiry (`keeper/README.md`, "When the keeper is dead").

**Indexer.** A Ponder indexer (`indexer/README.md` in the app repository). It reads vault, Valorem, Seaport and Stock Token events and serves a read-only JSON API: `/v1/vault`, `/v1/cycles`, `/v1/cycles/:cycle`, `/v1/activity`, `/v1/account/:addr`, `/v1/listings`, `/v1/listings/:hash`, `/v1/strands`, `/v1/snapshots` and `/v1/health`. A week nobody bought is published as a row of zeros, not left out. The week's size is the sum of its `CallsWritten` events, stranded weeks and their recovery are published, and premium is kept separate from strike proceeds. It holds no keys that can act on the vault.

**Web app and the fill page.** A Next.js app at `app.callhouse.finance` (`web/README.md` in the app repository). Deposits, queued withdrawals, redemptions, claims, settling the queue and retrying a stranded claim are all transactions the user signs in their own wallet. The fill page, `/vault/nvda/cycle`, is the venue for the vault's calls. Its server route fetches the keeper's `/orders` and serves an order only if it rebuilds to the vault's own `listingHash` on chain. The page then simulates the exact fill with `eth_call`, shows a decoded refusal if the vault would refuse it, and fills with a USDG approval to Seaport followed by `fulfillAdvancedOrder`. Any other Seaport 1.6 client can fill the same order. The app has no custody, no private keys and no server-side signing.

**Alert relay.** A small HTTP service (`relay/` in the app repository) with `GET /health` and `POST /alert`. The keeper sends its alerts there with a shared bearer token; the relay forwards them to Discord and/or Telegram. It holds no vault keys and cannot act on the vault.

The keeper and the indexer do not talk to each other. Each reads the chain independently. The web server reads the keeper only for `/orders` (`docs/WIRING.md` in the app repository).

## Things that look wrong but are not

Each item below was checked against the contract source.

1. **A filled week does not move the share price.** `totalAssets()` counts only NVDA: the vault's balance plus what is locked in the Valorem claim, less what is reserved for settled redemptions. A fill moves NVDA from the balance into the claim one for one. Premium goes to the USDG index and is claimed separately. See [Accounting](accounting.md#two-ledgers).
2. **An assigned week lowers the share price, and it happens mid-transaction.** `lockedAssets()` reads Valorem's live position, so `totalAssets()` falls inside the exerciser's own transaction. The offsetting strike USDG stays inside the claim until `rollClose` redeems it. There is no callback into the vault. This is why deposits close on `cycleExerciseTs` whether or not anyone calls `lockBook`.
3. **The vault can stay `Listed` through the whole exercise window.** Nobody is obliged to call `lockBook`, and `rollClose` accepts `Listed`. Do not infer "exercise window has not started" from `phase == Listed`. Compare `block.timestamp` with `cycleExerciseTs`.
4. **`phase == Idle` does not mean flat.** A stranded vault is `Idle` with a claim open. Check `isStranded()`, or `canRedeemInstantly()` for whether an instant redemption would work.
5. **`RollOpen.contractsCount` is always 0, and `CallsWritten` fires once per fill.** Nothing is written at the open. The week's size is `contractsWritten`, or the sum of the week's `CallsWritten` events, and it equals the number sold. There is no `contractsRemaining` or `contractsSold` view.
6. **The vault holds no option tokens outside a fill.** `clear.balanceOf(vault, optionId)` is 0 at every block boundary. A non-zero reading is a bug, not leftovers: `validateOrder` reverts the fill that would leave one, and the ERC-1155 receiver accepts only mints from the clearinghouse.
7. **A fill can be refused, and that is the floor working.** `PremiumBelowFloorAtFill` or `StrikeBelowBand` after a price move means the listing no longer clears the policy at today's spot. The keeper reprices; if the strike itself is under the band floor, no price fixes that week's listing.
8. **The band ceiling is checked at arm only; the floor at arm, at the listing and at every fill.** After a sell-off the strike can sit above the band and the listing still fills. That sells a call further out of the money than policy requires.
9. **Previews return 0 on purpose.** `previewRedeem` and `previewWithdraw` return 0 unless an instant redemption would succeed right now (`phase == Idle` and `contractsWritten == 0`). `maxDeposit` and `maxMint` return 0 in every state where `deposit` would revert. The vault uses ERC-4626 function names for what it implements, but it does not declare `IERC4626` and has no `maxWithdraw` or `maxRedeem`. `redeem` and `withdraw` revert `UseQueue` while a position is open or a claim is stranded.
10. **Deposits are refused for the rest of a transaction once a fill has written.** A contract buyer's ERC-1155 receive hook runs after the vault writes and before the buyer's USDG arrives. A deposit from there would have taken part of the premium of the fill paying for it, so the vault refuses it (the internal review of 2026-09-14, finding L-01; `test/regression/L01_InFillDeposit.t.sol`). A contract that fills and then deposits in the same transaction is refused too. The next transaction is unaffected.
11. **A filled cycle can emit several `Harvest` events, and the close's own event can be `(0, 0, 0)`.** `deposit`, `mint` and `settleQueue` checkpoint the harvest first, so premium that landed earlier is indexed at that moment. A retry of a stranded claim emits a `Harvest` carrying the stranded cycle's number. Sum `Harvest` events per `cycleNumber` rather than reading only the close.
12. **`Harvest.feeUsdg / Harvest.grossUsdg` is not the fee rate on an assigned week.** The close's `grossUsdg` includes strike proceeds, which are credited fee-free. See [Accounting](accounting.md#reconciling-a-harvest-event).
13. **A stranded close returns normally.** `rollClose` succeeding with `RollClose(cycle, 0, 0, n)` preceded by `ClaimStranded` means the redeem reverted inside USDG or the Stock Token and the vault kept the claim. The week's proceeds are reported later by `ClaimRedeemed` and `StrandedClaimRecovered`.
14. **`contractsAssigned()` reads 0 after a successful close.** `rollClose` zeroes `claimKey`, and the view returns 0 for a zero key. The historical figure is `RollClose.contractsAssignedCount`, read inside the close before redemption. On a stranded close the claim is kept, so the view still reads it until the retry.
15. **`listingHash` is not a "live and fillable" flag.** It is cleared only by `cancelListing`, `invalidateAllListings`, `lockBook` and `rollClose`, and a fill, even a full one, does not clear it. While it is non-zero, a new `approveListing` reverts `PreviousListingLive`. Use Seaport's `getOrderStatus` for fill state.
16. **There is no signature.** The vault has no signing key and implements no EIP-1271 hook; `supportsInterface` advertises the ERC-1155 receiver and the Seaport zone interface only. A fill passes an empty signature because `approveListing` pre-validated the order on Seaport.
17. **The Seaport counter is re-read, never predicted.** `approveListing` requires the order's `counter` to equal `seaport.getCounter(vault)` at approval time. `lockBook`, `rollClose` and `invalidateAllListings` kill orders by `incrementCounter`, which does not mark individual orders cancelled. Seaport's counter increments by a quasi-random amount, not by one (`docs/ARCHITECTURE.md` §8 in the app repository).
18. **A stale price at the weekend is expected.** The RHNVDA/USD feed follows US equity market hours and stops updating while the market is shut. `maxPriceAge` is 4 days at launch so weekend arms and fills are not blocked. The feed is never read on a settlement path.
19. **A queue entry can settle without a payout.** `queueRedeem`, when it finds an older settled entry, moves it into `owedAssets` / `owedQueueUsdg` and emits `QueueEntrySettled`, without moving tokens. `CompleteRedeem` reports only payouts. Draw epoch balances down on `QueueEntrySettled`.
20. **Shares sent directly to the vault address are not a withdrawal request, and they are lost to the sender.** `_update` accepts the transfer, but only `queueRedeem` creates a queue entry. Those shares are never burned and never paid out: they stay in `totalSupply()`, so the NVDA behind them stays in the vault and nobody can redeem it. The USDG they accrue is credited to the vault's escrow account and swept into the next queue settlement's pot, where it goes to that epoch's last claimant (`docs/ACCOUNTING.md` §5). The equality `queuedShares == balanceOf(vault)` no longer holds after such a transfer.
21. **The vault refuses ERC-1155 transfers it did not mint.** Both receiver hooks return `0x00000000` unless the caller is the clearinghouse and the transfer is a mint (`from == address(0)`), so nobody can push option tokens or a claim NFT into the vault.
22. **`uiMultiplier()` is display only.** No share or policy maths reads it. The Chainlink answer already reflects the token's multiplier (`ops/addresses.json`, `nvdaStockToken._uiMultiplier`, in the app repository).
23. **`convertToAssets` and `totalAssets()` are not the economic value of a share.** They count NVDA only. They leave out the holder's claimable USDG, the USDG a queued entry is owed, and strike USDG from an assignment that is still inside the Valorem claim until `rollClose` (so mid-window the figure drops by the assigned NVDA with nothing offsetting it). The short call is never marked to market, so an open in-the-money call is not reflected either. While a claim is stranded, `totalAssets()` counts only the part of the claim live shares still own. Do not use `convertToAssets` alone as a price for collateral, a liquidation or a mark. Value a position as NVDA from `convertToAssets(balanceOf(account))`, plus `claimableUsdg(account)`, plus `previewCompleteRedeem(account)`, which covers a settled queue entry, anything already owed, a reserve haircut, and a share of a stranded claim once that claim has been redeemed. An entry that has not settled yet (`queuedSharesOf(account) != 0` and `queuedEpochOf(account) == epochId()`) is in none of these: its shares have left the account's balance, and `previewCompleteRedeem` returns only amounts already owed. For that entry only, use `convertToAssets(queuedSharesOf(account))` as an NVDA estimate. `queuedSharesOf` stays non-zero after settlement until the entry is collected, so adding it for a settled entry counts it twice. No view breaks out an unsettled entry's USDG, and a share of a claim that is still stranded is quoted as nothing. Treat an open cycle as carrying unmarked assignment risk (`docs/AUDIT-SCOPE.md` §3.1).
24. **`previewDeposit` and `previewMint` do not check the deposit gate.** They quote shares at the current price even when a deposit would revert (`DepositsClosed`, `DepositCapExceeded`). Only `maxDeposit` and `maxMint` mirror the gate. Check `maxDeposit(receiver) >= assets` before offering a deposit.
25. **`claimableUsdg(account)` is not clamped.** It can sit a base unit or so above what `claimUsdg` actually pays, because the per-share index floors at different points and the payout is clamped to USDG not reserved for the queue or the pending fee. See [Accounting](accounting.md#the-usdg-index).
26. **`Withdraw` is emitted only on the instant path.** A queued exit emits `QueueRedeem`, then `QueueSettled` at the settlement, then `QueueEntrySettled` and `CompleteRedeem` when collected. While stranded it can also emit `EpochStrandShare` and `StrandShareSettled`, and a USDG leg that could not move emits `UsdgLegDeferred`. An indexer that watches only `Withdraw` misses every queued exit.
27. **`spotUsdg()` reverts rather than returning a stale price.** It reverts `StalePrice` when the feed is older than `maxPriceAge` and `SpotZero` on a non-positive answer. A UI reading it should handle the revert, which is normal over a long holiday weekend.

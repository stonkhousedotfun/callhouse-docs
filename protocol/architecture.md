# Architecture

Stonkhouse is one non-upgradeable vault contract on Robinhood Chain (chain id 4663). It pools NVDA Stock Tokens and runs a covered-call cycle on them. Each cycle it writes call options on Valorem Clear against the idle collateral, lists them on Seaport 1.6 in the shape Overcall's order book uses, and pays the USDG premium to shareholders through a per-share index. Off-chain services support it: a keeper, an indexer, a web app, and a small alert relay that forwards keeper alerts to chat. None of them holds or can move depositor funds.

This page covers the components, the phase machine, and the behaviours that integrators most often misread. Money maths is on [Accounting](accounting.md), permissions are on [Roles and admin powers](roles.md), and addresses are on [Contracts and addresses](addresses.md).

{% hint style="warning" %}
The vault is not deployed yet and has not been audited. See [Security and audits](security.md).
{% endhint %}

Source paths on this page refer to the `callhouse-contracts` repository (`src/`, `script/`, `test/`). Where the prose and the code disagree, the code is the specification.

## Components

```
                         depositors (wallets)
                     NVDA in / shares, NVDA, USDG out
                                 |
                                 v
+----------------------------------------------------------------------+
| Vault  (src/Vault.sol)  one deployment, not upgradeable                |
|   ERC-20 shares, AccessControl, ReentrancyGuard                      |
|   inherits: Distributor | AdapterValorem | AdapterSeaport            |
|   calls internal library: Policy (hard caps, pure maths)             |
|   DELEGATECALLs linked libraries: ValoremLib, SeaportOrderLib        |
+-----+----------------+-----------------+-----------------+-----------+
      |                |                 |                 |
      | write/redeem   | validate/cancel | reads cycle     | reads spot
      v                | incrementCounter| and rungs       | (writes only)
 Valorem Clear         v                 v                 v
 (collateral,      Seaport 1.6      Overcall registry   Chainlink
  option ERC-1155,  (vault is the    (NVDA market)       RHNVDA/USD
  claim NFT)        offerer)                             AggregatorProxy

 off-chain, non-custodial:
   keeper   proposes the write and the listing, calls the rolls, posts the
            order to Overcall's API
   indexer  reads events, serves the public cycle history (read-only API)
   web app  builds transactions the user signs in their own wallet
   relay    forwards keeper alerts to Discord or Telegram (no vault keys)
```

### The vault and what it inherits

`Vault` is the only contract Stonkhouse deploys, apart from its two linked libraries. It is an ERC-20 share token (the deploy script's default name and symbol are `Callhouse NVDA` / `cNVDA`, with 18 decimals; the name was set before the product was renamed to Stonkhouse). It also uses OpenZeppelin `AccessControl` and `ReentrancyGuard`, and it inherits three abstract bases:

| Base | Job |
|---|---|
| `Distributor` | The USDG accrual index (`accUsdgPerShare`). It settles on every share balance change and handles USDG claims. |
| `AdapterValorem` | Writes calls, redeems the claim, and reads the live position (`lockedAssets`, `claimedExerciseProceeds`, `contractsAssigned`). Accepts ERC-1155 transfers only from the clearinghouse. |
| `AdapterSeaport` | The listing lifecycle, the EIP-1271 `isValidSignature` answer, and the one-time ERC-1155 approval to Seaport. |

These are inherited rather than deployed separately because the external protocols check the caller's identity. Valorem mints the claim NFT to `msg.sender` and `redeem` reverts for anyone who does not own it. Seaport accepts `validate` and `cancel` only from the order's offerer. The code therefore has to run as the vault (`src/AdapterValorem.sol`, `src/AdapterSeaport.sol` NatSpec).

### Libraries

| Library | Kind | Why |
|---|---|---|
| `SeaportOrderLib` (`src/lib/SeaportOrderLib.sol`) | `public` functions, deployed separately and linked, reached by `DELEGATECALL` | Seaport's nested order structs and three encoders (`getOrderHash`, `validate`, `cancel`) pushed the vault past the EIP-170 24 KB runtime limit. |
| `ValoremLib` (`src/lib/ValoremLib.sol`) | `public`, linked, `DELEGATECALL` | The same size limit. It also holds the write-time checks that the option's asset and exercise asset match the vault's, that its lot size and window match the cycle's, and that the cycle's lot is exactly one token (1e18, else `UnexpectedLotSize`). |
| `Policy` (`src/Policy.sol`) | `internal`, compiled into the vault | Pure bounds maths: the OTM strike band, the premium floor, position size, fee split, oracle normalisation, and the compiled-in hard caps. |

Because the linked libraries run by `DELEGATECALL`, `address(this)` inside them is the vault. Calls they make to Seaport and Valorem therefore come from the vault. Both libraries must be deployed before the vault and linked into it. `script/Verify.s.sol` checks that all five library link sites in the vault's runtime bytecode hold the expected library addresses. It also compares the runtime bytecode of the vault and both libraries byte for byte with the compiled artifacts of the commit it is run from, masking only the link sites, immutables and each library's own address word, which it checks separately (see [Roles and admin powers](roles.md)).

### External contracts

| Contract | Role in the system | Trust notes |
|---|---|---|
| Overcall registry (NVDA market) | Defines each cycle: approved option ids (up to 5 rungs), exercise and expiry timestamps, lot size. Read by `rollOpen`. | One registry per collateral token. The vault's constructor reverts `RegistryAssetMismatch` unless the registry's `collateralToken`, `exerciseToken` and `clearinghouse` equal the vault's asset, USDG and Valorem Clear. The registry is owned by a single third-party EOA and holds no funds. |
| Valorem Clear | Holds the written collateral, mints the option ERC-1155 and the claim NFT, settles exercise, returns collateral and strike proceeds on `redeem`. | The vault is the writer and keeps its own claim NFT. Assignment is by bucket across every writer of the option series, not by who sold the exercised call. Any number from 0 to N of the vault's contracts can be assigned, including in a week the vault's own listing never filled. |
| Seaport 1.6 | The marketplace. The vault is the offerer. | Listings are authorised by hash on chain: `approveListing` calls `seaport.validate`, and `isValidSignature` returns the EIP-1271 magic value only for the recorded `listingHash` or its EIP-712 digest. No zone and no conduit are used (both zero in `script/Deploy.s.sol`), so the vault approves Seaport itself for the option ERC-1155, once, in the constructor. |
| USDG | Premium and strike currency, 6 decimals. | Third-party upgradeable proxy. |
| NVDA Stock Token | The underlying asset, 18 decimals. | Third-party beacon proxy. The vault probes `oraclePaused()` before a write or a listing and reads `uiMultiplier()` for display only. |
| Chainlink RHNVDA/USD | Spot price for the strike-band and premium-floor gates, and for display. | Read only in `rollOpen`, `approveListing` and the `spotUsdg()` view. Redemption, harvest, the redeem queue and `rollClose` never read a price. Writes and listings are refused if the answer is older than `maxPriceAge` (4 days at launch, bounded in bytecode to 1 hour through 7 days). |

Addresses for all of these are on [Contracts and addresses](addresses.md).

### Not upgradeable

There is no proxy, no `delegatecall` to a mutable target, no rescue function and no admin-gated token transfer. The external addresses (asset, USDG, clearinghouse, Seaport, registry, price feed, Overcall fee recipient, conduit key, zone) are `immutable`. A defect fix means deploying a new vault and migrating (`src/Vault.sol` header NatSpec).

## The phase machine

`Vault.phase` is one of `Idle`, `Listed`, `Exercisable` or `Settling`.

```
                  rollOpen(optionId, contracts)
                  KEEPER_ROLE, registry writing window open
      +--------+ ------------------------------------------> +----------+
      |  Idle  |                                              |  Listed  |
      +--------+ <---------------+                            +----------+
          ^                      |                                 |
          |                      |  rollClose()                    |  lockBook()
          |                      |  from Listed (nobody            |  anyone, once
          |                      |  called lockBook)               |  now >= cycleExerciseTs
          |                      |                                 v
          |                      |                          +-------------+
          |                      +------------------------- | Exercisable |
          |                         rollClose()             +-------------+
          |
          |   rollClose(): allowed once now >= cycleExpiryTs
          |     KEEPER_ROLE            from cycleExpiryTs
          |     any other address      from cycleExpiryTs + 1 hour
          |   Inside that one transaction: phase = Settling -> ... -> Idle
```

### Transitions

| Edge | Function | Who may call | Preconditions enforced on chain |
|---|---|---|---|
| Idle to Listed | `rollOpen(uint256 optionId, uint112 contracts)` | `KEEPER_ROLE` | Phase is `Idle`. `writesHalted` is false. `registry.isWritingOpen()` is true. The cycle number is not 0. `registry.isApproved(optionId)` is true and `registry.cycleOf(optionId)` equals the current cycle. The expiry is after the exercise time and no more than `MAX_CYCLE_TENOR` (21 days) from now. If Valorem's fee switch is on, `valoremFeeAccepted` must be true. The token's oracle is not paused and the price is not stale. The strike is inside the policy OTM band. The contract count is non-zero and within `maxContractsCap` and `maxUtilizationBps` of idle assets. In `ValoremLib`, the option's underlying asset and exercise asset must match the vault's, its lot size must equal the cycle's and be exactly one token (1e18, else `UnexpectedLotSize`), and its exercise and expiry timestamps must equal the cycle's. |
| Listed to Exercisable | `lockBook()` | Anyone | Phase is `Listed` and `block.timestamp >= cycleExerciseTs`. Any live listing is invalidated by bumping the Seaport counter. |
| Listed or Exercisable to Idle | `rollClose()` | `KEEPER_ROLE` from `cycleExpiryTs`; any address from `cycleExpiryTs + 1 hour` (a non-keeper calling earlier gets `GuardianTooEarly`, whatever its role) | Phase is `Listed` or `Exercisable` and `block.timestamp >= cycleExpiryTs`. |

`Settling` is set at the start of `rollClose` and cleared at the end of the same transaction. An outside observer never sees it, and the stateful test suite asserts this (`invariant_phaseSanity`).

`rollClose` runs these steps in order:

1. Set `phase = Settling`.
2. If a listing hash is recorded, invalidate all listings (`seaport.incrementCounter`).
3. Read `contractsAssigned()`. It must be read before the next step, which zeroes `claimKey`.
4. `clear.redeem(claimKey)`, measuring the asset and USDG balance changes.
5. Emit `RollClose(cycleNumber, assetsReturned, usdgFromAssignment, contractsAssignedCount)`.
6. Harvest: index new USDG, credit strike proceeds fee-free, attempt the fee push, emit `Harvest`.
7. Settle the redeem queue into an epoch.
8. Set `phase = Idle`.

### What each phase allows

| Action | Idle | Listed, before the exercise timestamp | Listed, from the exercise timestamp | Exercisable |
|---|---|---|---|---|
| `deposit` / `mint` | yes, within `depositCap` | yes, within `depositCap` | no (`DepositsClosedForCycle`) | no (`WrongPhase`) |
| `redeem` / `withdraw` (instant) | yes | no (`UseQueue`) | no | no |
| `queueRedeem` | yes | yes | yes | yes |
| `completeRedeem` (settled epochs) | yes | yes | yes | yes |
| `claimUsdg` / `claimUsdgTo` | yes | yes | yes | yes |
| `rollOpen` | keeper | no | no | no |
| `approveListing` | no | keeper, unless halted | no (a listing's `endTime` must be after now and no later than `cycleExerciseTs`) | no |
| `invalidateAllListings` | keeper or guardian | keeper or guardian | keeper or guardian | keeper or guardian |
| `cancelListing` (needs a recorded `listingHash`, else `NoLiveListing`) | no listing recorded | keeper or guardian | keeper or guardian | no listing recorded (`lockBook` cleared it) |
| `lockBook` | no | no | anyone | no |
| `rollClose` | no | no | from expiry | from expiry |
| `sweepFee` | anyone | anyone | anyone | anyone |

Deposits have a second, clock-independent refusal. `deposit` and `mint` revert whenever a claim is open and `claimedExerciseProceeds()` is non-zero, meaning an assignment has happened and its strike USDG has not been redeemed yet (`_requireDepositPhase`). `maxDeposit` and `maxMint` return 0 in exactly the states where a deposit would revert.

A halt (`writesHalted`) is checked only in `rollOpen` and `approveListing`. See [Roles and admin powers](roles.md#guardian_role).

### Timing

The exercise window runs from `cycleExerciseTs` to `cycleExpiryTs`. The vault snapshots both from the registry at `rollOpen`, because the registry may move to a new cycle while this one is still settling. The NVDA registry's first cycle (cycle 1) sets an exactly 24-hour window: Friday 2026-09-18 20:00 UTC to Saturday 2026-09-19 20:00 UTC (`ops/recon/R1-overcall-registry.md` §4). The registry enforces a minimum window of 1 day (`MIN_EXERCISE_WINDOW`). Valorem allows `exercise` while `exerciseTimestamp <= now < expiryTimestamp` and `redeem` from `expiryTimestamp` on, so the two windows meet with no gap. The depositor-level view of the cycle is on [The weekly cycle](../product/weekly-cycle.md).

## Off-chain services

**Keeper.** A Node process holding a hot EOA with `KEEPER_ROLE` and gas, nothing else. Each cycle it:

- picks a rung and a size, then calls `rollOpen`
- builds the Seaport order and calls `approveListing`
- posts the order to Overcall's listings API
- later calls `lockBook` and `rollClose`

The keeper only proposes. The vault re-checks every field against its own state and the policy before anything moves. The keeper never holds the option ERC-1155, the claim NFT, collateral, USDG or shares, and no code path lets it transfer them. It can still choose, within policy, what to write and at what price. That limit is covered in [Roles and admin powers](roles.md#keeper_role). If the keeper is down, `lockBook` is permissionless and `rollClose` opens to everyone an hour after expiry (`keeper/README.md`, "When the keeper is dead").

Overcall's API only accepts a 64- or 65-byte signature, so the keeper sends a well-formed 65-byte placeholder. The vault ignores signature bytes. Authorisation is the on-chain `listingHash` together with `seaport.validate`.

**Indexer.** A Ponder indexer. It reads vault, registry, Valorem, Seaport and token events and serves a read-only JSON API (`/v1/vault`, `/v1/cycles`, `/v1/account/:addr`, and others). A week nobody bought is published as a row, not left out. If nothing was assigned either, its status is `unfilled` and its premium, fee and strike-proceeds figures are 0. A week nobody bought can still be assigned, because Valorem assigns across every writer of the option series; that row's status is `assigned`, `filled` is false, and `harvest.strikeProceedsUsdg` is not 0. Premium and strike proceeds are published as separate fields under `harvest` (`premiumGross`, `premiumNet`, `premiumNetPerShare`, `strikeProceedsUsdg`), with `creditedUsdg` as the total credited to holders. Every `premium*` field is premium only. It holds no keys that can act on the vault. It also has an HMAC-authenticated relay route to Overcall, which currently has no caller (`docs/WIRING.md` §7 in the app repository).

**Web app.** A Next.js app. Deposits, queued withdrawals, redemptions, claims and the fallback fill page are all transactions the user signs in their own wallet. It has no custody, no private keys and no server-side signing.

**Alert relay.** A small HTTP service (`relay/` in the app repository) with `GET /health` and `POST /alert`. The keeper sends its alerts there with a shared bearer token; the relay checks the token, validates the payload and forwards it to Discord and/or Telegram. It holds no vault keys and cannot act on the vault.

The keeper and the indexer do not talk to each other. Each reads the chain independently (`docs/WIRING.md`).

## Things that look wrong but are not

Each item below was checked against the contract source.

1. **A filled week does not move the share price.** `totalAssets()` counts only NVDA: idle minus reserved, plus what is locked in the Valorem claim. Premium goes to the USDG index and is claimed separately. See [Accounting](accounting.md#two-ledgers).
2. **An assigned week lowers the share price, and it happens mid-transaction.** `lockedAssets()` reads Valorem's live position, so `totalAssets()` falls inside the exerciser's own transaction. The offsetting strike USDG stays inside the claim until `rollClose` redeems it. There is no callback into the vault. This is why deposits close on `cycleExerciseTs` whether or not anyone calls `lockBook`.
3. **The vault can stay `Listed` through the whole exercise window.** Nobody is obliged to call `lockBook`, and `rollClose` accepts `Listed`. Do not infer "exercise window has not started" from `phase == Listed`. Compare `block.timestamp` with `cycleExerciseTs`.
4. **Previews return 0 on purpose.** `previewRedeem` and `previewWithdraw` return 0 unless an instant redemption would succeed right now (`phase == Idle` and `contractsWritten == 0`). `maxDeposit` and `maxMint` return 0 in every state where `deposit` would revert. The vault uses ERC-4626 function names for what it implements, but it does not declare `IERC4626` and has no `maxWithdraw` or `maxRedeem`. `redeem` and `withdraw` revert `UseQueue` while a position is open.
5. **A filled cycle can emit several `Harvest` events, and the close's own event can be `(0, 0, 0)`.** `deposit` and `mint` checkpoint the harvest before minting, so premium that landed earlier is indexed at that deposit. Sum `Harvest` events per `cycleNumber` rather than reading only the close.
6. **`Harvest.feeUsdg / Harvest.grossUsdg` is not the fee rate on an assigned week.** The close's `grossUsdg` includes strike proceeds, which are credited fee-free. See [Accounting](accounting.md#reconciling-a-harvest-event).
7. **`contractsAssigned()` reads 0 after the close.** `rollClose` zeroes `claimKey`, and the view returns 0 for a zero key. The historical figure is `RollClose.contractsAssignedCount`, read inside the close before redemption.
8. **`contractsRemaining()` and `contractsSold()` are derived views, not counters.** They read the vault's ERC-1155 balance, because a Seaport fill moves tokens out without calling the vault. After `rollClose`, `optionId` is 0 and both views return 0. Any unsold option tokens are still in the vault's ERC-1155 balance, but they are worthless after expiry. Valorem's `redeem` does not require them to be burned. The claim returns whatever collateral was not assigned, and assignment does not follow which contracts the vault sold, so part of that collateral may have been taken at the strike and come back as strike USDG instead of NVDA.
9. **`listingHash` is not a "live and fillable" flag.** It is cleared only by `cancelListing`, `invalidateAllListings`, `lockBook` and `rollClose`, and a fill does not clear it. While it is non-zero, a new `approveListing` reverts `PreviousListingLive`. Use Seaport's order status for fill state.
10. **`isValidSignature` ignores the signature bytes.** It answers `0x1626ba7e` for exactly the recorded `listingHash` or its EIP-712 digest (domain separator read live from `seaport.information()`), and `0xffffffff` for everything else.
11. **The Seaport counter is re-read, never predicted.** `approveListing` requires the order's `counter` to equal `seaport.getCounter(vault)` at approval time. `lockBook`, `rollClose` and `invalidateAllListings` kill orders by `incrementCounter`, which does not mark individual orders cancelled. The ops docs note that Seaport's counter increments by a quasi-random amount, not by one (`docs/ARCHITECTURE.md` §8 in the app repository).
12. **A stale price at the weekend is expected.** The RHNVDA/USD feed follows US equity market hours and stops updating while the market is shut. `maxPriceAge` is 4 days at launch so weekend writes are not blocked. The feed is never read on a settlement path.
13. **A queue entry can settle without a payout.** `queueRedeem`, when it finds an older settled entry, moves it into `owedAssets` / `owedQueueUsdg` and emits `QueueEntrySettled`, without moving tokens. `CompleteRedeem` reports only payouts. Draw epoch balances down on `QueueEntrySettled`.
14. **Shares sent directly to the vault address are not a withdrawal request.** `_update` accepts the transfer, but only `queueRedeem` creates a queue entry. Shares transferred to the vault by hand are never burned or paid out, so they are lost to the sender.
15. **The vault refuses ERC-1155 transfers from anyone but Valorem Clear.** Both receiver hooks return `0x00000000` for any other sender, so the vault cannot be used as a dumping ground for arbitrary option tokens.
16. **There is a decoy registry.** Overcall's frontend config has a top-level `registry` key that points at the JUGGERNAUT market, not NVDA. The constructor's pair check rejects it. See [Contracts and addresses](addresses.md).
17. **`uiMultiplier()` is display only.** No share or policy maths reads it. The Chainlink answer already reflects the token's multiplier (`ops/addresses.json`, `nvdaStockToken._uiMultiplier`).
18. **`convertToAssets` and `totalAssets()` are not the economic value of a share.** They count NVDA only. They leave out the holder's claimable USDG, the USDG a queued entry is owed, and strike USDG from an assignment that is still inside the Valorem claim until `rollClose` (so mid-window the figure drops by the assigned NVDA with nothing offsetting it). The short call is never marked to market and unsold option tokens count as zero, so an open in-the-money call is not reflected either. Do not use `convertToAssets` alone as a price for collateral, a liquidation or a mark. Value a position as NVDA from `convertToAssets(balanceOf(account))`, plus `claimableUsdg(account)`, plus `previewCompleteRedeem(account)`, which covers a settled queue entry and anything already owed. An entry that has not settled yet (`queuedSharesOf(account) != 0` and `queuedEpochOf(account) == epochId()`) is in none of these: its shares have left the account's balance, and `previewCompleteRedeem` returns only amounts already owed. For that entry only, use `convertToAssets(queuedSharesOf(account))` as an NVDA estimate. `queuedSharesOf` stays non-zero after settlement until the entry is collected, so adding it for a settled entry counts it twice. No view breaks out an unsettled entry's USDG. Treat an open cycle as carrying unmarked assignment risk (`docs/AUDIT-SCOPE.md` §3.1, ERC-4626 deviation 6).
19. **`previewDeposit` and `previewMint` do not check the phase.** They quote shares at the current price even when a deposit would revert (`DepositsClosedForCycle`, `WrongPhase`, `DepositCapExceeded`). Only `maxDeposit` and `maxMint` mirror the deposit gate. Check `maxDeposit(receiver) >= assets` before offering a deposit.
20. **`claimableUsdg(account)` is not clamped.** It can sit a base unit or so above what `claimUsdg` actually pays, because the per-share index floors at different points and the payout is clamped to USDG not reserved for the queue or the pending fee. See [Accounting](accounting.md#the-usdg-index).
21. **`Withdraw` is emitted only on the instant path.** A queued exit emits `QueueRedeem`, then `QueueSettled` at the close, then `QueueEntrySettled` and `CompleteRedeem` when collected. An indexer that watches only `Withdraw` misses every queued exit.
22. **`spotUsdg()` reverts rather than returning a stale price.** It reverts `StalePrice` when the feed is older than `maxPriceAge` and `SpotZero` on a non-positive answer. A UI reading it should handle the revert, which is normal over a long holiday weekend.

# Roles and admin powers

The vault uses OpenZeppelin `AccessControl` with three roles. It never calls `_setRoleAdmin`, so `DEFAULT_ADMIN_ROLE` administers all three. There is no timelock on any role-gated function. This page lists every state-changing entry point in the vault's ABI, who may call it, what bounds it in bytecode, and the worst case if each key is compromised.

Source paths refer to the `callhouse-contracts` repository. Every "cannot" below comes from reading `src/Vault.sol` and its bases, not from operating policy. The launch values of each bound are on [Launch policy and hard caps](../product/policy.md).

| Role | Identifier | Intended holder |
|---|---|---|
| `DEFAULT_ADMIN_ROLE` | `0x0000000000000000000000000000000000000000000000000000000000000000` | At launch: one hot key (the deployer). Later: an Admin Safe, 2 of 3 |
| `KEEPER_ROLE` | `keccak256("KEEPER_ROLE")` = `0xfc8737ab85eb45125971625a9ebdb75cc78e01d5c1fa80c4c6e5203f47bc4fab` | Keeper hot EOA |
| `GUARDIAN_ROLE` | `keccak256("GUARDIAN_ROLE")` = `0x55435dd261a4b9b3364963f7738a7a662ad9c84396d64be3365284bb7f0a5041` | Guardian, 1 of 1 on separate hardware |

Two more callers have fixed powers without a role. **Seaport 1.6** is the only address that may call the zone hooks. **The fee recipient** holds no role; it can only receive the protocol fee.

## How roles are assigned at deployment

- **The constructor grants `DEFAULT_ADMIN_ROLE` to exactly one address.** `script/Deploy.s.sol` passes `ADMIN` if it is set, otherwise the admin Safe (`SAFE_ADMIN`). When the admin has no code, the script prints a warning that it is a plain key.
- **The launch plan is a bootstrap admin.** At launch `ADMIN` is the deployer's own externally owned key (`docs/DEPLOY.md`, "The plan: bootstrap admin now, Safe later"): one hot key, not a multisig. That key grants the keeper and guardian roles directly (`script/Configure.s.sol` with `ADMIN_PK`, which refuses a guardian that is the same address as the keeper), and later hands the admin role to a 2-of-3 Safe with `script/HandoverAdmin.s.sol`. No admin Safe exists yet.

{% hint style="danger" %}
**Until the handover, one hot key holds every admin power** listed below, with no multisig and no timelock: the fee up to its 20%-of-premium ceiling and its recipient, the deposit cap, the policy inside its hard caps, the price age, unhalting, accepting the Valorem engine fee, and granting or revoking every role, including granting itself `KEEPER_ROLE`. With Stonkhouse's own clearinghouse, the same key is also that clearinghouse's `feeTo` (see [below](#the-valorem-engine-fee-on-our-own-clearinghouse)). Anyone who obtains that key obtains all of it. This page will say when the handover has happened, with the transactions.
{% endhint %}

- **The handover is two separate steps with a Safe transaction in between.**
  - `STEP=grant` gives the admin role to the Safe. It refuses a `SAFE_ADMIN` that has no code (a key rather than a Safe), a threshold below 2, fewer owners than the threshold, or any module enabled.
  - The Safe then executes a harmless admin transaction (re-setting `maxPriceAge` to its current value).
  - `STEP=renounce` removes the key's admin role. It refuses until the Safe's nonce shows it has executed a transaction since the grant, so the key is never dropped before the Safe has proven it can act.
- **After the handover every admin action is a Safe transaction.** `Configure.s.sol` without a key writes a Safe{Wallet} Transaction Builder batch for the owners to decode, sign and execute, and broadcasts nothing.
- **`script/Verify.s.sol` checks a deployed vault read-only.** It compares the vault's and both libraries' runtime bytecode byte for byte with the compiled artifacts of the commit it is run from (masking only library link sites, immutables and each library's own address word), so the logic and compiled-in caps are exactly that commit's. Run it from the commit that was deployed. It also checks every immutable and parameter, that the zone is the vault, the Seaport version and runtime hash, the clearinghouse's fee state, and the roles for the current phase:
  - bootstrap: the deployer holds admin
  - after the handover: the Safe holds admin and the deployer holds nothing
  - in both: the keeper and guardian each hold only their own role
  - the Safe's build, threshold, owners, and that it has no modules or guard

The contract deploy runbook is `docs/DEPLOY.md` in the contracts repository. Both admin paths were rehearsed end to end on an anvil fork of chain 4663 on 2026-09-13, with real Safes and Stonkhouse's own clearinghouse on the bootstrap path, including checks that fail on purpose (a tampered vault byte, swapped library addresses, a renounce before the Safe has acted).

The vault uses plain `AccessControl`, not `AccessControlEnumerable`. Current role holders cannot be listed from the contract. Read them from `RoleGranted` and `RoleRevoked` events, or check a specific address with `hasRole`.

## DEFAULT_ADMIN_ROLE

Held by the bootstrap hot key at launch, then by the admin Safe after the handover described above.

| Function | Effect | Bound enforced in bytecode |
|---|---|---|
| `setPolicy(PolicyParams)` | Sets the six policy fields at once, effective immediately | `Policy.validate`: `minOtmBps >= 100`; `maxOtmBps <= 2500`; `minOtmBps <= maxOtmBps`; `minPremiumBps >= 10`; `maxUtilizationBps <= 9985`; `protocolFeeBps <= 2000`; `maxContractsCap != 0` |
| `setFeeRecipient(address)` | Changes where the protocol fee is paid | Non-zero only |
| `setDepositCap(uint256)` | Sets the ceiling on `totalAssets()` that deposits may reach | None. Setting it to 0 closes deposits. |
| `setMaxPriceAge(uint32)` | Sets how stale the spot price may be before an arm, a listing or a fill is refused | 3,600 to 604,800 seconds (1 hour to 7 days, `MIN_PRICE_AGE` / `MAX_PRICE_AGE_CEIL`) |
| `acceptValoremFee(bool)` | Allows arms and fills while Valorem's engine fee is switched on | None. While the fee is on and this is false, `rollOpen` and every fill revert `ValoremFeeNotAccepted`. |
| `unhaltWrites()` | Clears `writesHalted` | None. Only admin can unhalt. |
| `haltWrites()` | Sets `writesHalted` (shared with the guardian) | None |
| `grantRole(role, account)` / `revokeRole(role, account)` | Adds or removes keeper, guardian, or admin holders, including granting `DEFAULT_ADMIN_ROLE` to more addresses | None |

Any holder can also `renounceRole` its own role, which is standard `AccessControl`. If every admin renounces, governance is frozen permanently.

Values that no role can change:

- **External addresses.** The asset, USDG, clearinghouse, Seaport, price feed and conduit key are `immutable`. The zone is the vault's own address.
- **The arm-gate bounds** in `ValoremLib`: `MIN_LEAD` (1 hour), `MIN_EXERCISE_WINDOW` (1 day), `MAX_CYCLE_TENOR` (21 days), and the one-token lot.
- **`Policy.MAX_LISTINGS_PER_CYCLE`**, 3.
- **The hard caps** in `Policy.validate` above, and the share-price floor `MAX_SHARES_PER_ASSET` (deposits close while there are more than 1,000,000 share base units per NVDA base unit of `totalAssets()`).
- **The fee-free treatment of strike proceeds.**
- **The listing shape**: one ERC-1155 offer item, one USDG consideration item paid to the vault, zone equal to the vault.
- **Code.** There is no proxy.

### The Valorem engine fee on our own clearinghouse

The launch plan constructs the vault on a clearinghouse deployed by `script/DeployClear.s.sol`, whose `feeTo` is the vault admin (`SECURITY.md` §3; the internal review of 2026-09-14, finding I-01). `feeTo` is the only privileged key on a Valorem clearinghouse. On that instance the admin can:

- switch the clearinghouse's 15 bps engine fee on or off (`setFeesEnabled`), immediately
- sweep accumulated fee balances to itself (`sweepFees`)
- nominate a new `feeTo` (`setFeeTo`, which emits no event; the nominee must call `acceptFeeTo`)
- replace the token URI generator used for metadata display (`setTokenURIGenerator`)

Clear has no owner, no pause, no blocklist and no proxy, and `feeTo` cannot touch collateral. The fee rate is a compiled 15 bps; only on or off can change.

**Why it matters.** The vault treats the engine fee as opt-in: with the switch on, `rollOpen` and every fill revert until `acceptValoremFee(true)`. With our own clearinghouse, **both switches sit with the same key**, and both act immediately. If that key turns them on, every fill pulls 15 bps of its notional in NVDA from the vault into the clearinghouse's fee balance, which `sweepFees` sends to the admin, and exercisers pay 15 bps of the strike in USDG to the same place. Depositors are compensated only through the fill floor: the vault raises the premium a buyer must pay by the fee's value at spot, so the buyer pays for the NVDA in USDG. The net effect is a forced sale of 15 bps of NVDA per fill at the oracle's spot, less the 5% protocol fee on that extra premium. With 95% of NAV sold, that is about 0.14% of NAV a week in NVDA to the admin, capped by the compiled 15 bps (`SECURITY.md` §3). The fee is off at deployment; `script/DeployClear.s.sol` and `script/Deploy.s.sol` both refuse an instance with the switch on.

## KEEPER_ROLE

Held by the keeper's hot EOA.

| Function | Effect | Checked on chain |
|---|---|---|
| `rollOpen(uint256 optionId)` | Arms the week on a Valorem option type and moves to `Listed`. Writes nothing. | Phase `Idle`, not halted, no claim open (`StillStranded`). The option type is an option, not a claim or an unknown id; its assets are NVDA and USDG; one contract is exactly one token; exercise at least 1 hour away; a window of at least 1 day; expiry at most 21 days away; Valorem's fee off or accepted; oracle not paused and price not stale; strike inside the OTM band, both bounds. See [Architecture](architecture.md#transitions). |
| `approveListing(OrderComponents)` | Authorises one Seaport order and records its hash, size and gross | See the list below |
| `cancelListing(OrderComponents)` | Cancels the recorded order on Seaport | The components must hash to `listingHash`. Also callable by the guardian. |
| `invalidateAllListings()` | Bumps the vault's Seaport counter, killing every outstanding order | Also callable by the guardian |
| `rollClose()` | Redeems the claim (or strands it), harvests, settles the queue, returns to `Idle` | The keeper may call it from `cycleExpiryTs`, one hour before everyone else |

The keeper also creates each week's option type with `clear.newOptionType`, but that call is on the clearinghouse and anyone may make it. The vault trusts nothing about the type until `rollOpen` has checked it.

`approveListing` reverts unless every one of these holds (`src/lib/SeaportOrderLib.sol`, `src/AdapterSeaport.sol`, `src/Vault.sol`):

- The phase is `Listed` and writes are not halted.
- No other listing is recorded (`PreviousListingLive`), and fewer than 3 listings have been approved this cycle (`TooManyListings`). Every approval spends one, cancelled or not.
- The offerer is the vault, the **zone is the vault**, the conduit key equals the vault's immutable (zero at launch), `zoneHash` is zero, and the order type is `PARTIAL_RESTRICTED`.
- There is exactly one offer item: the ERC-1155 on the vault's clearinghouse with the armed `optionId`, at a fixed amount (start equals end) that is non-zero and no more than the vault's remaining capacity, `Policy.maxContracts(totalAssets()) − contractsWritten` (`OfferExceedsCapacity`).
- There is exactly one consideration item: USDG, identifier 0, a fixed amount, paid to the vault (`BadVaultRecipient`). The gross divides evenly by the contract count (`PremiumNotDivisibleByOrderSize`), and the unit price is no more than the strike (`UnitPriceExceedsStrike`).
- `startTime <= now < endTime`, and `endTime <= cycleExerciseTs`.
- The order's `counter` equals `seaport.getCounter(vault)`.
- The oracle is not paused, the price is not stale, the strike is at or above the band floor at live spot, and the gross is at least `spot × contracts × minPremiumBps / 10,000`.

These floors are checked again at every fill, at the fill's own spot, which is the line of defence (see [Architecture](architecture.md#the-seaport-zone-hooks)).

**The keeper cannot:**

- Transfer, approve or receive any token on the vault's behalf. The only approvals are to the clearinghouse, set and reset to zero inside each fill, and to Seaport, set once in the constructor.
- Make the vault write. Only a buyer's fill does that, through the zone hook.
- Route premium to itself. The one payment recipient is fixed to the vault.
- Change parameters, unhalt, grant roles, or change the fee recipient.
- Arm outside the policy band or the compiled window bounds, list more than three times in a cycle, list more than the vault's capacity, or list past the exercise timestamp.

**The keeper can** choose the least favourable terms the current policy allows. It can arm the lowest in-band strike and price the listing at exactly the premium floor, and a buyer it controls can fill it in the next block, before a guardian could react. At launch policy that means strikes at least 3% above spot and a premium of at least 0.40% of spot notional. `SECURITY.md` §3 estimates the value this moves from depositors to that buyer at about 1.1% of the sold notional per week at 50% implied volatility (about 2.7% at 80%). It can also skip a week by not arming or not listing. Neither lets it take tokens from the vault, but a sale at the floor moves option value to whoever fills.

## GUARDIAN_ROLE

Held by a separate 1-of-1 hardware key. It is an emergency brake that one person can use without waiting for a Safe quorum.

| Function | Effect |
|---|---|
| `haltWrites()` | Sets `writesHalted = true` (shared with the admin) |
| `cancelListing(OrderComponents)` | Cancels the recorded listing (shared with the keeper) |
| `invalidateAllListings()` | Bumps the Seaport counter. It needs no order data, so it still works when the keeper and its database are gone. |

**What a halt blocks.** `writesHalted` is read in exactly three places: `rollOpen`, `approveListing`, and every fill (`authorizeOrder`). The halt stops sales the instant it lands, without cancelling anything on Seaport. Inside `fulfillAvailableAdvancedOrders` the vault's order is skipped; on every other fill path the fill reverts.

**What a halt never blocks:**

- `queueRedeem`, `settleQueue`, `completeRedeem`, `claimUsdg` and `claimUsdgTo`
- `redeem` and `withdraw` (which still need the vault to be flat)
- `deposit` and `mint` (still subject to the deposit gate and the cap)
- `lockBook`, `rollClose`, `retryStrandedClaim` and `sweepFee`
- `cancelListing` and `invalidateAllListings`
- ERC-20 share transfers

**The guardian cannot:**

- Unhalt. It can stop sales but never restart them.
- Change any parameter, grant or revoke roles, or touch the fee recipient.
- Close a week early. It has no `rollClose` power of its own; like anyone, it may call it from expiry plus one hour.
- Move a token. None of its three functions reaches a transfer or approval; they change one boolean and Seaport's order state.

At worst, a compromised guardian keeps writes halted, or keeps killing listings until the three-listing budget for a cycle is spent. The result is weeks with no premium until the admin revokes the role and unhalts. Exits keep working throughout.

## Seaport 1.6

| Function | Who | Effect |
|---|---|---|
| `authorizeOrder(ZoneParameters)` | Seaport only (`NotSeaport`) | Called before any transfer of a fill. Checks the order is the live listing, runs the fill gate, and writes exactly the contracts being bought. |
| `validateOrder(ZoneParameters)` | Seaport only (`NotSeaport`) | A view called after every transfer of a fill. Reverts the fill unless the vault's option-token balance is back where it started. |

The checks are listed in [Architecture](architecture.md#the-seaport-zone-hooks).

## Permissionless functions

| Function | Who | Conditions |
|---|---|---|
| `deposit(assets, receiver)` / `mint(shares, receiver)` | anyone | The deposit gate is open (see [Accounting](accounting.md#the-deposit-gate)) and the deposit stays within `depositCap` |
| `redeem(shares, receiver, owner)` / `withdraw(assets, receiver, owner)` | owner, or a spender with share allowance | `phase == Idle` and `contractsWritten == 0` (not while a claim is stranded) |
| `queueRedeem(shares)` | share holder | any phase |
| `settleQueue()` | anyone | `phase == Idle` (flat or stranded) and `queuedShares > 0`. Pays nothing out; it settles the epoch at the instant-redeem price. |
| `completeRedeem(receiver)` | the queued owner | the owner's epoch has settled, owed balances exist, or a staged share of a stranded claim has been redeemed |
| `claimUsdg()` / `claimUsdgTo(to)` | holder | accrued USDG > 0, clamped to what the vault can back |
| `lockBook()` | anyone | `Listed` and `block.timestamp >= cycleExerciseTs` |
| `rollClose()` | anyone | `Listed` or `Exercisable`, `block.timestamp >= cycleExpiryTs + 1 hour` (the keeper from `cycleExpiryTs`) |
| `retryStrandedClaim()` | anyone | `isStranded()`; reverts `StillStranded` until Valorem lets the redeem through |
| `sweepFee()` | anyone | `pendingFeeUsdg > 0` and the transfer succeeds. It always pays the stored `feeRecipient`, never the caller. |
| A Seaport 1.6 fill of the vault's listing | anyone | Through any Seaport fulfil function, including the app's fill page. The zone hooks apply. |
| ERC-20 `transfer` / `approve` / `transferFrom` on shares | holders | USDG accrual is settled for both sides on every transfer. Shares sent to the vault address are lost to the sender (see [Architecture](architecture.md#things-that-look-wrong-but-are-not)). |

Because `lockBook`, `rollClose`, `settleQueue` and `retryStrandedClaim` are permissionless, settlement, the redeem queue and recovery from a stranded claim do not depend on the keeper or the guardian staying alive.

## Worst case: a compromised admin

The admin trust assumption covers fees and parameters, not custody. Stated plainly, an attacker who controls the admin role (the bootstrap hot key until the handover, or 2 of the 3 Safe signers after it) can do the following, with no timelock:

- **Take up to 20% of fee-bearing USDG from then on.** They can raise `protocolFeeBps` to the 2000 ceiling and point `feeRecipient` at their own address. The redirect also covers any `pendingFeeUsdg` accrued but not yet paid. The fee base is premium, plus any USDG sent to the vault directly. Strike proceeds from assignment are excluded by code, so the ceiling limits a cut of premium, not of the collateral assigned depositors sold at the strike.
- **Loosen the policy to its compiled-in limits and run the week themselves.** They can grant `KEEPER_ROLE` to an address they control, then set `minOtmBps` to 100 (strikes 1% above spot), `minPremiumBps` to 10 (a premium floor of 0.10% of spot notional), `maxUtilizationBps` to 9985, and any non-zero contract cap. They can then arm and list on those terms with a buyer they control ready to fill. Every arm, listing and fill still passes the checks above, so this moves option value to the buyer rather than moving tokens out of the vault. `SECURITY.md` §3 estimates it at about 2.2% of the sold notional per week at 50% implied volatility (about 3.9% at 80%), a real economic loss to depositors.
- **Turn on the Valorem engine fee and collect it.** With Stonkhouse's own clearinghouse, the admin is its `feeTo`: `setFeesEnabled(true)` there and `acceptValoremFee(true)` on the vault take 15 bps of every fill's notional in NVDA from the vault to the admin, compensated to depositors only through a higher fill floor paid by the buyer (see [above](#the-valorem-engine-fee-on-our-own-clearinghouse)). The fee is off today.
- **Reshape governance.** They can grant `DEFAULT_ADMIN_ROLE` to other addresses, revoke the guardian and keeper, close deposits (`setDepositCap(0)`), widen `maxPriceAge` to 7 days, or halt writes indefinitely.

**Even with the admin role, an attacker cannot:**

- Call any vault function that transfers NVDA, USDG or shares to them. No admin-gated vault function makes a token transfer. The admin's only influence on a vault transfer is choosing where `_tryPayFee` sends the protocol fee.
- Upgrade the vault, change an immutable address, or add a rescue function.
- Block `queueRedeem`, `settleQueue`, `completeRedeem`, `claimUsdg`, `lockBook`, `rollClose` or `retryStrandedClaim`. The permissionless ones run on their timers.
- Hold collateral in Valorem longer than one cycle. `MAX_CYCLE_TENOR` caps any option type the vault arms at 21 days from the arm, and the queue settles at every close.
- Charge a protocol fee on strike proceeds, or set `protocolFeeBps` above 2000, `minOtmBps` below 100, `minPremiumBps` below 10, or `maxUtilizationBps` above 9985.
- Change the engine fee rate, which is a compiled 15 bps in the clearinghouse.

For the depositor-facing statement of these risks, see [Risks](../product/risks.md). Every key's worst case, third parties included, is in [Security and audits](security.md#what-each-key-compromise-buys).

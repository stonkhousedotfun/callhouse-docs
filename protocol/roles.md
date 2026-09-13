# Roles and admin powers

The vault uses OpenZeppelin `AccessControl` with three roles. It never calls `_setRoleAdmin`, so `DEFAULT_ADMIN_ROLE` administers all three. There is no timelock on any role-gated function. This page lists every role-gated and permissionless entry point, what bounds each one in bytecode, and the worst case if each key is compromised.

Source paths refer to the `callhouse-contracts` repository. Every "cannot" below comes from reading `src/Vault.sol` and its bases, not from operating policy. The launch values of each bound are on [Launch policy and hard caps](../product/policy.md).

| Role | Identifier | Intended holder |
|---|---|---|
| `DEFAULT_ADMIN_ROLE` | `0x0000000000000000000000000000000000000000000000000000000000000000` | Admin Safe, 2 of 3 |
| `KEEPER_ROLE` | `keccak256("KEEPER_ROLE")` = `0xfc8737ab85eb45125971625a9ebdb75cc78e01d5c1fa80c4c6e5203f47bc4fab` | Keeper hot EOA |
| `GUARDIAN_ROLE` | `keccak256("GUARDIAN_ROLE")` = `0x55435dd261a4b9b3364963f7738a7a662ad9c84396d64be3365284bb7f0a5041` | Guardian, 1 of 1 on separate hardware |

The fee recipient (the fee Safe) holds no role. It can only receive the protocol fee.

## How roles are assigned at deployment

- **The constructor grants `DEFAULT_ADMIN_ROLE` to exactly one address.** `script/Deploy.s.sol` passes `ADMIN` if it is set, otherwise the admin Safe (`SAFE_ADMIN`).
- **The launch plan is a bootstrap admin.** At launch `ADMIN` is the deployer's own key. That key grants the keeper and guardian roles directly (`script/Configure.s.sol` with `ADMIN_PK`), and later hands the admin role to the 2-of-3 Safe with `script/HandoverAdmin.s.sol`.

{% hint style="warning" %}
**Until the handover, one key holds every admin power** listed below: the fee up to its 20%-of-premium ceiling and its recipient, the deposit cap, the policy inside its hard caps, the price age, unhalting, accepting the Valorem engine fee, and granting or revoking every role. This page will say when the handover has happened, with the transactions.
{% endhint %}

- **The handover is two separate steps with a Safe transaction in between.**
  - `STEP=grant` gives the admin role to the Safe. It refuses a Safe with a threshold below 2, fewer owners than the threshold, or any module enabled.
  - The Safe then executes a harmless admin transaction (re-setting `maxPriceAge` to its current value).
  - `STEP=renounce` removes the key's admin role. It refuses until the Safe's nonce shows it has executed a transaction since the grant, so the key is never dropped before the Safe has proven it can act.
- **After the handover every admin action is a Safe transaction.** `Configure.s.sol` without a key writes a Safe{Wallet} Transaction Builder batch for the owners to decode, sign and execute, and broadcasts nothing.
- **`script/Verify.s.sol` checks a deployed vault read-only.** It compares the vault's and both libraries' bytecode byte for byte with the audited build, so the compiled-in caps are the ones reviewed. It also checks every immutable and parameter, and the roles for the current phase:
  - bootstrap: the deployer holds admin
  - after the handover: the Safe holds admin and the deployer holds nothing
  - in both: the keeper and guardian each hold only their own role
  - the Safe's build, threshold, owners, and that it has no modules or guard

The contract deploy runbook is `docs/DEPLOY.md` in the contracts repository. Both admin paths were rehearsed end to end on an anvil fork of chain 4663 on 2026-09-13, with real Safes, including checks that fail on purpose (a tampered vault byte, swapped library addresses, a renounce before the Safe has acted).

The vault uses plain `AccessControl`, not `AccessControlEnumerable`. Current role holders cannot be listed from the contract. Read them from `RoleGranted` and `RoleRevoked` events, or check a specific address with `hasRole`.

## DEFAULT_ADMIN_ROLE

Held by the admin Safe (2 of 3).

| Function | Effect | Bound enforced in bytecode |
|---|---|---|
| `setPolicy(PolicyParams)` | Sets the six policy fields at once, effective immediately | `Policy.validate`: `minOtmBps >= 100`; `maxOtmBps <= 2500`; `minOtmBps <= maxOtmBps`; `minPremiumBps >= 10`; `maxUtilizationBps <= 10000`; `protocolFeeBps <= 2000`; `maxContractsCap != 0` |
| `setFeeRecipient(address)` | Changes where the protocol fee is paid | Non-zero only |
| `setDepositCap(uint256)` | Sets the ceiling on `totalAssets()` that deposits may reach | None. Setting it to 0 closes deposits. |
| `setMaxPriceAge(uint32)` | Sets how stale the spot price may be before a write is refused | 3,600 to 604,800 seconds (1 hour to 7 days, `MIN_PRICE_AGE` / `MAX_PRICE_AGE_CEIL`) |
| `acceptValoremFee(bool)` | Allows writes while Valorem's engine fee is switched on | None. While Valorem's fee is on and this is false, `rollOpen` reverts `ValoremFeeNotAccepted`. |
| `unhaltWrites()` | Clears `writesHalted` | None. Only admin can unhalt. |
| `haltWrites()` | Sets `writesHalted` (shared with the guardian) | None |
| `grantRole(role, account)` / `revokeRole(role, account)` | Adds or removes keeper, guardian, or admin holders, including granting `DEFAULT_ADMIN_ROLE` to more addresses | None |

Any holder can also `renounceRole` its own role, which is standard `AccessControl`. If every admin renounces, governance is frozen permanently.

Values that no role can change:

- **External addresses.** The asset, USDG, clearinghouse, Seaport, registry, price feed, Overcall fee recipient, conduit key and zone are `immutable`.
- **`MAX_CYCLE_TENOR`**, 21 days.
- **`Policy.MAX_LISTINGS_PER_CYCLE`**, 3.
- **`Policy.OVERCALL_FEE_BPS`**, 500.
- **The fee-free treatment of strike proceeds.**
- **Code.** There is no proxy.

## KEEPER_ROLE

Held by the keeper's hot EOA.

| Function | Effect | Checked on chain |
|---|---|---|
| `rollOpen(uint256 optionId, uint112 contracts)` | Writes the cycle's calls into Valorem and moves to `Listed` | Phase, halt, registry writing window, approved rung in the current cycle, cycle window and 21-day tenor, Valorem fee gate, oracle pause, price staleness, strike inside the OTM band, contract count within `maxContractsCap` and `maxUtilizationBps` of idle assets, option asset, lot size and window matching the cycle. See [Architecture](architecture.md#transitions). |
| `approveListing(OrderComponents)` | Authorises one Seaport order by hash: `seaport.validate` plus `listingHash` for EIP-1271 | See the list below |
| `cancelListing(OrderComponents)` | Cancels the recorded order on Seaport | The components must hash to `listingHash`. Also callable by the guardian. |
| `invalidateAllListings()` | Bumps the vault's Seaport counter, killing every outstanding order | Also callable by the guardian |
| `rollClose()` | Redeems the claim, harvests, settles the queue, returns to `Idle` | The keeper may call it from `cycleExpiryTs`, one hour before everyone else |

`approveListing` reverts unless every one of these holds (`SeaportOrderLib`, `AdapterSeaport`, `Vault`):

- The phase is `Listed` and writes are not halted.
- No other listing is recorded, and fewer than 3 listings have been approved this cycle.
- The offerer is the vault. The zone and conduit key equal the vault's immutables (both zero at launch), `zoneHash` is zero, and the order type is `FULL_OPEN` or `PARTIAL_OPEN`.
- There is exactly one offer item. It is the ERC-1155 from Valorem Clear with the cycle's `optionId`, at a fixed amount (start equals end) that is non-zero and no more than the vault's option balance.
- There are exactly two consideration items, both USDG ERC-20 at fixed amounts. Item 0 is paid to the vault and item 1 to the immutable Overcall fee recipient.
- The gross amount divides evenly by the contract count. The unit price is at least 20 base units and no more than the strike. The split exactly matches `Policy.splitPremium`.
- `startTime <= now < endTime`, and `endTime <= cycleExerciseTs`.
- The order's `counter` equals `seaport.getCounter(vault)`.
- The oracle is not paused, the price is not stale, and gross premium is at least `spot * contracts * minPremiumBps / 10_000`.

**The keeper cannot:**

- Transfer, approve or receive any token on the vault's behalf. The only approvals are to Valorem, set and reset to zero within `rollOpen`, and to Seaport, set once in the constructor.
- Route premium to itself. Payment recipients are fixed by the checks above.
- Change parameters, halt or unhalt, grant roles, or change the fee recipient.
- Write outside the policy band or caps, list more than three times in a cycle, or list past the exercise timestamp.

**The keeper can** choose the least favourable terms the current policy allows. It can pick the lowest in-band strike, write up to the utilization and contract caps, and price listings at the premium floor. Seaport listings are open orders, so a buyer the keeper controls could be the one to fill them. At launch policy that means strikes at least 3% above spot and gross premium of at least 0.40% of spot notional per listing. It can also skip a week entirely by not writing or not listing. Neither lets it take tokens from the vault, but a mispriced sale moves option value to whoever fills.

## GUARDIAN_ROLE

Held by a separate 1-of-1 hardware key. It is an emergency brake that one person can use without waiting for a Safe quorum.

| Function | Effect |
|---|---|
| `haltWrites()` | Sets `writesHalted = true` |
| `cancelListing(OrderComponents)` | Cancels the recorded listing (shared with the keeper) |
| `invalidateAllListings()` | Bumps the Seaport counter. It needs no order data, so it still works when the keeper and its database are gone. |

**What a halt blocks.** `writesHalted` is read in exactly two places: `rollOpen` and `approveListing`.

**What a halt never blocks:**

- `queueRedeem`, `completeRedeem`, `claimUsdg` and `claimUsdgTo`
- `redeem` and `withdraw` (which still need the vault to be flat)
- `deposit` and `mint` (still gated by phase and cap)
- `lockBook`, `rollClose` and `sweepFee`
- `cancelListing` and `invalidateAllListings`
- ERC-20 share transfers

**The guardian cannot:**

- Unhalt. It can stop writes but never restart them.
- Change any parameter, grant or revoke roles, or touch the fee recipient.
- Move a token. None of its three functions reaches a transfer or approval; it changes one boolean and Seaport's order state.

At worst, a compromised guardian keeps writes halted, or keeps killing listings until the three-listing budget for a cycle is spent. The result is weeks with no premium until the admin Safe revokes the role and unhalts. Exits keep working throughout.

## Permissionless functions

| Function | Who | Conditions |
|---|---|---|
| `deposit(assets, receiver)` / `mint(shares, receiver)` | anyone | `Idle`, or `Listed` before `cycleExerciseTs`; no unredeemed assignment proceeds; within `depositCap` |
| `redeem(shares, receiver, owner)` / `withdraw(assets, receiver, owner)` | owner, or a spender with share allowance | `phase == Idle` and `contractsWritten == 0` |
| `queueRedeem(shares)` | share holder | any phase |
| `completeRedeem(receiver)` | the queued owner | the owner's epoch has settled, or owed balances exist |
| `claimUsdg()` / `claimUsdgTo(to)` | holder | accrued USDG > 0, clamped to what the vault can back |
| `lockBook()` | anyone | `Listed` and `block.timestamp >= cycleExerciseTs` |
| `rollClose()` | anyone | `Listed` or `Exercisable`, `block.timestamp >= cycleExpiryTs + 1 hour` (the keeper from `cycleExpiryTs`) |
| `sweepFee()` | anyone | `pendingFeeUsdg > 0` and the transfer succeeds. It always pays the stored `feeRecipient`, never the caller. |
| ERC-20 `transfer` / `approve` / `transferFrom` on shares | holders | USDG accrual is settled for both sides on every transfer |

Because `lockBook` and `rollClose` are permissionless, settlement and the redeem queue do not depend on the keeper or the guardian staying alive.

## Worst case: a compromised admin Safe

The admin trust assumption covers fees and parameters, not custody. Stated plainly, an attacker holding 2 of the 3 admin signers can do the following, with no timelock:

- **Take up to 20% of fee-bearing USDG from then on.** They can raise `protocolFeeBps` to the 2000 ceiling and point `feeRecipient` at their own address. The redirect also covers any `pendingFeeUsdg` accrued but not yet paid. The fee base is premium, plus any USDG sent to the vault directly. Strike proceeds from assignment are excluded by code (`_accrueHarvest` subtracts the measured claim redemption), so the ceiling limits a cut of premium, not of the collateral assigned depositors sold at the strike.
- **Loosen the policy to its compiled-in limits and run the roll themselves.** They can grant `KEEPER_ROLE` to an address they control, then set `minOtmBps` to 100 (strikes 1% above spot), `minPremiumBps` to 10 (a gross premium floor of 0.10% of spot notional), `maxUtilizationBps` to 10000, and any non-zero contract cap. They can then write and list on those terms with a buyer they control ready to fill. Every write and listing still passes the checks in [KEEPER_ROLE](#keeper_role), so this moves option value to the buyer rather than moving tokens out of the vault, but it is a real economic loss to depositors.
- **Accept Valorem's engine fee.** If Valorem's fee switch is ever turned on, `acceptValoremFee(true)` lets writes proceed. The 15 bps of notional is then paid in NVDA from vault collateral to Valorem, collected by Valorem's `feeTo` and not by the admin. Today the switch is off (`ops/addresses.json`, `valoremClear.liveState`).
- **Reshape governance.** They can grant `DEFAULT_ADMIN_ROLE` to other addresses, revoke the guardian and keeper, close deposits (`setDepositCap(0)`), widen `maxPriceAge` to 7 days, or halt writes indefinitely.

**Even with the admin role, an attacker cannot:**

- Transfer any NVDA, USDG or shares. No admin-gated function makes a token transfer. The only admin influence on a transfer is choosing where `_tryPayFee` sends the fee.
- Upgrade the vault, change an immutable address, or add a rescue function.
- Block `queueRedeem`, `completeRedeem`, `claimUsdg`, `lockBook` or `rollClose`. The latter two are permissionless on their timers.
- Hold collateral in Valorem longer than one cycle. `MAX_CYCLE_TENOR` caps any cycle at 21 days from the write, and the queue settles at every close.
- Charge a fee on strike proceeds, or set `protocolFeeBps` above 2000, `minOtmBps` below 100, or `minPremiumBps` below 10.

For the depositor-facing statement of these risks, see [Risks](../product/risks.md). Responses to each key compromise are covered in [Security and audits](security.md#what-each-key-compromise-buys).

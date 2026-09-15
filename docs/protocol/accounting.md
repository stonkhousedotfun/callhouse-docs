# Accounting

How the vault accounts for NVDA and USDG, how the protocol fee is computed, how the redeem queue and stranded claims pay out, and which invariants the test suite asserts. This page is for integrators, indexers and auditors. The depositor-level explanation of fees is on [Fees](../product/fees.md), and assignment is covered on [Assignment](../product/assignment.md).

Source paths refer to the `callhouse-contracts` repository. The design notes are in `docs/ACCOUNTING.md` there. Where that document and the code differ, this page follows the code.

## Two ledgers

The vault keeps two separate ledgers and never mixes them.

| Ledger | Unit | Distributed through | Moves when |
|---|---|---|---|
| Collateral | NVDA Stock Token base units, 18 decimals | The share price (`totalAssets()` / `totalSupply()`) | Deposits, redemptions, writes into Valorem at each fill, assignment, claim redemption, an issuer burn |
| Premium | USDG base units, 6 decimals | A per-share index (`accUsdgPerShare`), claimed with `claimUsdg()` | Seaport fills, claim redemption (strike proceeds), any other USDG that reaches the vault |

```
totalAssets() = max(asset.balanceOf(vault) + lockedAssets() - reservedAssets, 0)
```

- `reservedAssets` is NVDA already promised to settled redeem-queue epochs. It comes off the whole book, and only the final figure is floored at zero (`src/Vault.sol` `totalAssets`).
- `lockedAssets()` reads Valorem's live `position(claimKey).underlyingAmount` (clamped at 0, and 0 if the call reverts). It falls the moment a contract is assigned.
- While a claim is stranded, the locked term counts only the part live shares still own: `lockedAssets() × strandedRemainingWad / 1e18` (`_lockedForNav`). See [Stranded claims](#stranded-claims).
- USDG does not appear in `totalAssets()`. The vault holds no option tokens outside a fill, and the short call is valued at zero.

**Why the reserve comes off the whole book.** The Stock Token issuer can burn NVDA from any address (`adminBurn`), pause or blocklist notwithstanding. An earlier draft computed `max(balance - reserved, 0) + locked`. A burn that took the balance below the reserve while a call was open then overstated NAV by the shortfall: 47 NVDA read against a true 30 NVDA in the 2026-09-13 internal audit's proof of concept (`SECURITY.md` §4, AF-05), and a depositor would have bought in above true value. Settled redeemers' claim is on the vault's collateral as a whole, so it now comes off the whole. Deposits are refused for as long as the balance is below the reserve (see [The deposit gate](#the-deposit-gate)), and settled redeemers are paid pro rata (see [The reserve haircut](#the-reserve-haircut)).

### Why premium is not in the share price

If USDG were folded into `totalAssets()`, the share price would jump the instant a buyer fills. That is marking the short call to market by another route, which the design forbids (`src/Distributor.sol` design note). Keeping premium out also keeps the oracle out of the money path. `redeem`, `withdraw`, `queueRedeem`, `settleQueue`, `completeRedeem`, the harvest, `rollClose` and `retryStrandedClaim` never read a price.

The consequences for anyone reading the share price:

- A filled week does not raise the share price. A fill moves NVDA from the balance into the Valorem claim one for one, so `totalAssets()` is unchanged, except by Valorem's engine fee if it is ever switched on and accepted (see [The fee formula](#the-fee-formula)).
- An out-of-the-money week leaves it unchanged.
- An assigned week lowers it, because collateral left and the strike proceeds went to the USDG ledger.
- Between an exercise and `rollClose` it is lower still than the week's final outcome: the assigned NVDA has already left `lockedAssets()`, while its strike USDG is inside the Valorem claim and appears nowhere in the vault's views except `claimedExerciseProceeds()`.

{% hint style="warning" %}
**For integrators: `convertToAssets` is not a mark.** It leaves out claimable USDG, queue USDG owed and unredeemed strike USDG in the claim, which make it lower than a position's value. It also values the open short call at zero whether it is far out of the money or deep in it, which can make it higher. Do not use it on its own to price cNVDA as collateral. Add `claimableUsdg(account)` and `previewCompleteRedeem(account)`, which covers a settled queue entry, anything already owed, the reserve haircut, and a share of a stranded claim once that claim has been redeemed. A queue entry whose epoch has not settled is in none of these figures: its shares have left the account's balance, so neither `convertToAssets(balanceOf(account))` nor `claimableUsdg(account)` counts them, and `previewCompleteRedeem` returns only amounts already owed. Estimate those shares' NVDA with `convertToAssets(queuedSharesOf(account))`; the USDG they earn in escrow has no per-account view until the entry settles, and a share of a claim that is still stranded is quoted as nothing. An open cycle carries unmarked assignment risk until `rollClose`.
{% endhint %}

## Units

| Quantity | Unit |
|---|---|
| `assets`, `idleAssets()`, `lockedAssets()`, `reservedAssets` | asset base units, 18 decimals (`1e18` = 1 NVDA) |
| Shares | 18 decimals (`decimals()` returns 18) |
| `spotUsdg`, `cycleStrikeUsdg` | USDG base units, 6 decimals, per lot of `1e18` asset base units |
| Premiums (`listingGrossUsdg`, `Harvest.grossUsdg`), fees (`Harvest.feeUsdg`, `pendingFeeUsdg`) | USDG base units, 6 decimals, as totals (on a close, `Harvest.grossUsdg` also includes strike proceeds) |
| Unit price (`listingGrossUsdg / listingAmount`) | USDG base units, 6 decimals, per contract; always exact, because `approveListing` requires the gross to divide by the contract count |
| `contracts`, `contractsWritten`, `CallsWritten.contractsCount` | whole lots; one contract covers exactly `1e18` NVDA |
| `*Bps` fields | basis points (`10_000` = 100%) |
| `accUsdgPerShare` | USDG base units per share, scaled by `1e27` |
| `strandedRemainingWad`, `epochStrandWad`, `owedStrandWad` | a share of one stranded claim, scaled by `1e18` (`1e18` = the whole claim) |
| Valorem `Claim.amountWritten` / `amountExercised` | `1e18`-scaled; `contractsAssigned()` divides by `1e18` |

**Contracts across fills.** Nothing is written at `rollOpen`. Each fill writes its own contracts into one Valorem claim for the week: the first fill opens it, later fills top it up. `CallsWritten(optionId, claimKey, contractsCount, collateral)` reports one fill, never the running total. `contractsWritten` is the running total and equals the number sold. `RollOpen.contractsCount` is always 0. `lockedAssets()`, `claimedExerciseProceeds()` and `contractsAssigned()` read Valorem's position for the whole claim, so they already cover every fill (`docs/ACCOUNTING.md` §2).

## Share price and rounding

The share maths is ERC-4626-style with a virtual offset of 1 on both sides (`src/Vault.sol`, `_convertToShares` / `_convertToAssets`):

```
shares = assets * (totalSupply + 1) / (totalAssets + 1)
assets = shares * (totalAssets + 1) / (totalSupply + 1)
```

| Path | Rounds | Favours |
|---|---|---|
| `deposit` / `previewDeposit`: shares minted | down | vault |
| `mint` / `previewMint`: assets charged | up | vault |
| `redeem` / `previewRedeem`: assets paid | down | vault |
| `withdraw` / `previewWithdraw`: shares burned | up | vault |

`previewRedeem` and `previewWithdraw` return 0 unless an instant redemption would succeed now (`phase == Idle` and `contractsWritten == 0`, `canRedeemInstantly()`). `maxDeposit` is measured against `totalAssets()`, not the raw balance, and returns 0 in every state where `deposit` would revert.

### The deposit gate

`deposit` and `mint` revert `DepositsClosed`, and `maxDeposit` / `maxMint` return 0, whenever the private predicate `_depositRefused()` is true (`src/Vault.sol`):

| # | Refused while | Why |
|---|---|---|
| 1 | A fill of the vault's listing has already written in this transaction | A contract buyer's ERC-1155 receive hook runs after the write and before its USDG arrives. A deposit from there would take part of the premium of the fill that is paying for it (the internal review of 2026-09-14, finding L-01; `test/regression/L01_InFillDeposit.t.sol`). |
| 2 | The phase is not `Idle` or `Listed` | Nothing can be priced honestly while the week is exercisable or settling. |
| 3 | `Listed` and `block.timestamp >= cycleExerciseTs` | From that second a contract can be assigned, and assignment lowers NAV with no callback while its strike USDG is still in the claim. |
| 4 | A claim is open and the vault is `Idle` (stranded), or the claim holds unredeemed assignment proceeds | The proceeds inside the claim belong to the holders of record. Nobody may buy in against that gap. |
| 5 | `asset.balanceOf(vault) < reservedAssets` | Only an issuer burn produces this: a fill whose write would leave the balance below the reserve reverts `ReserveBreached`. A new deposit would otherwise be paid straight out to earlier settled redeemers. |
| 6 | `totalSupply() > totalAssets() × 1,000,000` | The share-price floor (`MAX_SHARES_PER_ASSET`, compiled in). A book burnt or assigned to nothing with its shares outstanding must not sell new shares for dust, and the floor bounds the share supply far inside what the index arithmetic can carry. A fresh vault (`totalSupply() == 0`) is not below it. |

Separately, a deposit that would take `totalAssets()` past `depositCap` reverts `DepositCapExceeded`, and `maxDeposit` returns `depositCap - totalAssets()` (0 once the cap is reached). The live cap is 20 NVDA (`depositCap()`); the admin can change it with `setDepositCap`, with no bound. Each refusal lifts by itself when its condition clears; none needs governance.

A deposit made while `Listed`, before the exercise timestamp, is allowed. It buys into the open short: shares are priced on a NAV that values the week's call at zero, a later fill in the same week can be written against the new NVDA, and if the week ends assigned the loss reaches every share through the share price. What a late depositor does not get is premium indexed before their shares existed (see [Checkpoint before mint](#checkpoint-before-mint)).

## The USDG index

`Distributor` uses a MasterChef-style index, with settlement placed inside the ERC-20 `_update` hook so it stays correct across transfers, mints and burns.

```
on distribution of `amount` (already net of fee):
    pot            = amount + usdgDust + usdgUnallocated
    if totalSupply == 0 or pot == 0:
        usdgUnallocated = pot                 carried to the next distribution
    else:
        indexDelta      = floor(pot * 1e27 / totalSupply)
        credited        = floor(indexDelta * totalSupply / 1e27)
        accUsdgPerShare += indexDelta
        usdgDust        = pot - credited      carried to the next distribution

an account's pending USDG:
    floor(balanceOf(account) * (accUsdgPerShare - snapshot[account]) / 1e27)     computed with Math.mulDiv
```

The precision is `1e27` rather than `1e18` because USDG has only 6 decimals. At `1e18`, a small weekly premium spread over a large share supply could round to zero per share (`ACC_PRECISION`). The pending figure is computed in 512 bits with `Math.mulDiv`, so a balance times the index can never overflow and revert a transfer.

**Dust and unallocated carry.** Whatever the index cannot represent (`usdgDust`), and whatever arrives while there are no shares (`usdgUnallocated`), is carried into the next distribution rather than dropped. At the close, if `usdgUnallocated` is non-zero after the harvest, the vault distributes it once more with `_distributeUsdg(0)`.

**Rounding drift, and the clamps.** The index floors once per distribution, while an account's pending amount floors once over its combined delta. Because `floor(b*(d1+d2)) >= floor(b*d1) + floor(b*d2)`, the sum of what holders can claim can exceed what was recorded as credited by up to about one base unit per account per distribution. Two rules stop this from ever reaching real money:

- **Accounting is anchored on a measured balance, not an identity.** See `usdgAccounted` below.
- **Every holder payout is clamped** to `_usdgAvailableForHolders()`, which is the USDG balance minus `usdgReservedForQueue` and `pendingFeeUsdg`, saturating at 0. This applies to `claimUsdg` and to the queue's `_takeAccrued`. A clamped claim leaves the unpaid remainder in the account's accrued balance.

`usdgOwed()` saturates and is informational only. No payout path reads it.

## Harvest detection

`usdgAccounted` is the part of the vault's USDG balance that has already been attributed to someone: holders, the queue, the pending fee, dust or unallocated. New USDG is whatever exceeds it:

```
gross = usdg.balanceOf(vault) > usdgAccounted ? usdg.balanceOf(vault) - usdgAccounted : 0
usdgAccounted = usdg.balanceOf(vault)      (set on every accrual, even when gross == 0)
```

Every USDG outflow reduces `usdgAccounted` by the amount paid, saturating at 0 (`_debitUsdgOut`). There are three outflows: holder claims, the USDG leg of a queue payout, and the fee transfer. A USDG leg that fails to move debits nothing. Any other USDG balance increase counts as harvestable: fills, strike proceeds, and USDG transferred to the vault directly. `retryStrandedClaim` marks the queue's share of the redeemed USDG as accounted before it harvests, so that share is neither fee'd nor distributed a second time.

If the USDG issuer wipes USDG from the vault, the next accrual re-anchors `usdgAccounted` to the lower balance. That is an accepted risk: later premium then backs older claims first come, first served (`SECURITY.md` §4, "Known and accepted").

## The fee formula

The harvest is one private function, `Vault._accrueHarvest(uint256 feeFree)`:

```
gross      = balance - usdgAccounted          (0 if negative)
usdgAccounted = balance
if gross == 0: return (0, 0, 0)

feeBase    = gross > feeFree ? gross - feeFree : 0
feeUsdg    = feeBase == 0 ? 0 : floor(feeBase * policy.protocolFeeBps / 10_000)   Policy.splitHarvest
netUsdg    = gross - feeUsdg
pendingFeeUsdg += feeUsdg
_distributeUsdg(netUsdg)                      all of gross except the fee goes to holders
```

It has three callers, and they pass different `feeFree` values:

| Caller | Fee-free amount (feeFree) | Why |
|---|---|---|
| `rollClose` via `_harvest(usdgFromAssignment)` | `usdgFromAssignment`, the USDG balance change measured across `clear.redeem` in the same transaction, which `RollClose` also emits (0 on a stranded close) | Strike proceeds are the assigned depositors' collateral sold at the strike. They are principal, not yield, so they are credited to holders in full and never charged the fee. |
| `retryStrandedClaim` via `_harvest(usdgReturned - queueUsdg)` | the live shares' part of the USDG the stranded claim returned | The same strike proceeds, redeemed late. The queue's part goes to its reserve instead. |
| `deposit`, `mint` and `settleQueue` via `_checkpointHarvest()` | `0` | Strike proceeds sit inside the Valorem claim until it is redeemed, so none can be in the balance when a checkpoint runs. |

The fee rate is `policy.protocolFeeBps`, read when the harvest runs, not when the premium arrived. The live `policy()` has 500 (5% of premium). The admin can change it at any time with `setPolicy`, and `Policy.validate` caps it at 2000 (20%) in bytecode, so a change made before a harvest applies to premium already received but not yet indexed. The fee-free exclusion is code, not a policy field, so no admin setting can bring strike proceeds into the fee base. An unfilled week has no premium in the fee base and is charged nothing. If it is assigned anyway, the close harvests the strike proceeds, fee-free.

There is no other fee inside the fill. Every listing has exactly one consideration item, USDG to the vault, so the premium a buyer pays and the premium the vault receives are the same figure (`src/lib/SeaportOrderLib.sol` `_checkConsideration`).

**Valorem's engine fee is not a Stonkhouse fee, and it is off.** The clearinghouse can charge 15 bps of each write's notional, in NVDA, on top of the collateral. On the live clearinghouse `feesEnabled()` is `false`, and the vault's `valoremFeeAccepted()` is `false`. If it is ever switched on, the vault refuses to arm or fill until the admin calls `acceptValoremFee(true)`. Once accepted, every fill pulls `collateral × 15 / 10,000` NVDA (at least 1 base unit) from the vault's balance, which lowers `totalAssets()` by that amount, and the fill's premium floor is raised by that NVDA valued at spot, so the buyer pays its value in USDG (`src/lib/ValoremLib.sol` `writeOnFill`). The fee accrues in the clearinghouse and can be swept only by its `feeTo`, which on the live clearinghouse is a 1-of-1 Safe, not the vault admin; see [Roles and admin powers](roles.md#the-valorem-engine-fee-on-our-own-clearinghouse).

**The fee payment is best-effort.** The fee accrues in `pendingFeeUsdg`. `rollClose` and `retryStrandedClaim` try to pay it to `feeRecipient` with a raw `transfer` call, clamped to the vault's balance, that cannot revert them (`_tryPayFee`). If the transfer fails, the fee stays pending. Anyone can call `sweepFee()` later, and it always pays the stored `feeRecipient`, never the caller. It reverts `NothingToClaim` if nothing moved.

## Checkpoint before mint

`deposit` and `mint` call `_checkpointHarvest()` before any new shares exist:

- `deposit`: deposit gate, cap check, checkpoint, `previewDeposit`, transfer in, `_mint`.
- `mint`: deposit gate, checkpoint, `previewMint`, cap check, transfer in, `_mint`.

Without the checkpoint, premium that landed when a buyer filled mid-week would sit un-indexed until `rollClose`. Anyone could then deposit just before the close and take a share of premium earned entirely by other depositors' collateral. With it, the index is fixed first and new shares start from the current value. The checkpoint transfers nothing. Its only external call is a read of the vault's own USDG balance (`usdg.balanceOf`). Any fee it charges goes to `pendingFeeUsdg` and is paid at the close or by `sweepFee`.

**Premium is not claimable until it is indexed.** A fill's USDG lands in the vault's balance at once, but it enters the index, and `claimableUsdg`, only when `_accrueHarvest` next runs: at a `deposit` or `mint`, `settleQueue`, `rollClose` or `retryStrandedClaim`. `claimUsdg` does not harvest, and there is no public `harvest()` function.

The checkpoint cannot see premium from a fill in the same transaction whose USDG has not landed yet. That is why reason 1 of the deposit gate refuses any deposit after a fill in the same transaction.

The checkpoint emits `Harvest(cycleNumber, gross, fee, net)` only if `gross != 0`. The close always emits `Harvest`, including `(0, 0, 0)`. So:

- One cycle can have several `Harvest` events with the same `cycleNumber`, including one from `retryStrandedClaim` after a strand.
- A filled week's close can emit `Harvest(cycle, 0, 0, 0)` if a deposit already checkpointed the premium.
- Weekly figures are the sum over the cycle's `Harvest` events. The fee recipient's balance rises by the sum of their `feeUsdg`, whenever the payment succeeds (`FeeSwept`).

## Reconciling a Harvest event

On an assigned week, `Harvest.grossUsdg` on the close includes the strike proceeds. `feeUsdg / grossUsdg` is therefore not the fee rate. To reconcile the close:

1. In the same `rollClose` transaction, take `usdgFromAssignment` from the `RollClose` event. It is emitted before the close's `Harvest`, though `UsdgDistributed`, `UsdgUnallocated` or `FeeSwept` can be emitted in between.
2. Take `protocolFeeBps` in effect at that block. It is `policy()`, and it changes only through `setPolicy`, which emits `PolicyUpdated`.
3. Check:

```
feeUsdg == floor((grossUsdg - usdgFromAssignment) * protocolFeeBps / 10_000)    (base floored at 0)
netUsdg == grossUsdg - feeUsdg
```

For a checkpoint `Harvest`, or a close where `usdgFromAssignment == 0`, this reduces to `feeUsdg == floor(grossUsdg * protocolFeeBps / 10_000)`.

**Worked example, from a fork rehearsal.** The keeper, before vol pricing, ran against an anvil fork of chain 4663 on 2026-09-15 UTC (`keeper/DRYRUN.md` in the app repository, week 2). Strike 223 USDG, unit price 0.856189 USDG, two fills of 2 and 3 contracts, a deposit while `Listed` that checkpointed the premium, then 2 contracts exercised:

```
fills                          1.712378 + 2.568567 = 4.280945 USDG premium
checkpoint Harvest (deposit)   gross 4.280945   fee 0.214047   net 4.066898
                               floor(4_280_945 * 500 / 10_000) = 214_047
RollClose.usdgFromAssignment   446.000000 USDG   (2 contracts x 223.00 strike)
RollClose.assetsReturned       3.000000 NVDA     (5 written, 2 assigned)
close Harvest                  gross 446.000000   fee 0   net 446.000000
                               floor((446_000_000 - 446_000_000) * 500 / 10_000) = 0
cycle total                    gross 450.280945   fee 0.214047   net 450.066898
fee / gross over the cycle     ~0.048%            not the 5% rate
```

**Stylised example, from `docs/ACCOUNTING.md` §8.** 10 contracts sold at a 231.00 strike for 1.90 each:

```
premium paid by the buyers      19.000000, all of it to the vault (one consideration item)
not assigned:   Harvest gross 19.000000, fee 0.950000, net 18.050000; share price unchanged
fully assigned: RollClose.usdgFromAssignment 2310.000000
                Harvest gross 2329.000000, fee 0.950000, net 2328.050000; totalAssets falls by 10 NVDA
```

The fee is 0.95 USDG either way.

## The redeem queue

Instant `redeem` and `withdraw` work only while the vault is flat (`phase == Idle` and `contractsWritten == 0`). Otherwise they revert `UseQueue`, and exits go through the queue. Anyone may also queue while flat.

```
queueRedeem(shares)       any phase; never blocked by a halt
  if the caller has an entry in an earlier (settled) epoch: move it to owed balances (no tokens)
  require shares <= balanceOf(caller)
  queuedEpochOf[caller] = epochId;  queuedSharesOf[caller] += shares;  queuedShares += shares
  settle caller's USDG accrual (they keep everything earned so far, claimable via claimUsdg)
  queueAccDebt[caller] += shares * accUsdgPerShare   the index these shares enter escrow at
  transfer the shares into escrow at the vault's own address

settleQueue()             anyone; phase == Idle (WrongPhase otherwise); queuedShares > 0 (NothingQueued)
  _checkpointHarvest()    USDG that arrived since the last close is indexed first
  _settleQueue()          as below

_settleQueue()            inside rollClose AFTER the harvest, or from settleQueue(); no-op if queuedShares == 0
  q            = queuedShares
  escrowUsdg   = _takeAccrued(vault)                    the escrow account's USDG accrual, clamped
  epochAccUsdgPerShare[epochId] = accUsdgPerShare       the index this epoch settled at
  payoutAssets = floor(q * (idleAssets() + 1) / (totalSupply + 1))   supply still includes escrow
  if a claim is open (stranded):
      share = floor(strandedRemainingWad * q / totalSupply)
      strandedRemainingWad -= share
      epochStrandWad[epochId] = share;  epochStrandGen[epochId] = strandGen;  emit EpochStrandShare
  burn the escrowed shares
  epochs[epochId] = {sharesRemaining: q, assetsRemaining: payoutAssets, usdgRemaining: escrowUsdg}
  reservedAssets += payoutAssets;  usdgReservedForQueue += escrowUsdg
  emit QueueSettled(epochId, q, payoutAssets, escrowUsdg);  epochId += 1

completeRedeem(receiver)  any phase
  if the caller's entry is in a settled epoch (entryEpoch < epochId): settle it into owed balances
  if the caller holds a share of a stranded claim that has since been redeemed: fold it in
  pay owedAssets (NVDA leg, haircut if the reserve is unbacked), then owedQueueUsdg (USDG leg, best-effort)
```

`epochId` starts at 1 and advances every time a queue actually settles. An entry can be collected once its epoch number is lower than the current `epochId`.

**The queue's asset price is the instant-redeem price.** `payoutAssets` uses the same virtual offset as `redeem`, so while `Idle` and flat, `settleQueue` pays to the base unit what an instant redemption of the same shares would pay. An earlier draft paid `idleAssets() × q / totalSupply` with no offset. Once `settleQueue` made the queue an atomic, permissionless exit, that turned first-depositor donation inflation into a profit: in the proof of concept an attacker seeded 3 wei, donated 20 NVDA, let a 9.8 NVDA deposit round down to one share, then queued and settled out with 22.35 NVDA. Priced with the offset, the same exit pays 17.88 (`test_settleQueue_doesNotMakeDonationInflationProfitable`).

**While a call is open the queue waits for the close.** `settleQueue` refuses `Listed` and `Exercisable`. The asset leg is priced on `idleAssets()`, which is the whole NAV only when nothing is locked in Valorem. Queued shares stay in `totalSupply` and exposed until settlement: they earn their share of every distribution up to and including the close's harvest, a later fill can be written against the NVDA behind them, and they are priced against the collateral that is idle after the claim is redeemed. After an assigned week, the epoch therefore pays a mix of remaining NVDA and USDG, not a promise of a fixed number of tokens.

**What each entry draws.** NVDA is pro rata, because every escrowed share is worth the same slice of the settled book. USDG is not: shares that entered escrow at different index values earned different amounts, so each entry is paid the index growth of its own shares.

```
assets = floor(ep.assetsRemaining * shares / ep.sharesRemaining)
usdg   = min( floor((shares * epochAccUsdgPerShare[e] - queueAccDebt[owner]) / 1e27),  ep.usdgRemaining )
```

`queueAccDebt` and `epochAccUsdgPerShare` here are the private `_queueAccDebt` and `_epochAccUsdgPerShare`. Neither is in the public ABI. The debt is stored as a quotient and a remainder by `1e27`, so `shares × index` is never formed in 256 bits and an account that queued can always settle (`_entryUsdg`, `_addQueueDebt`). Read an entry's figures with `previewCompleteRedeem(owner)`, which uses the same code path as the payout.

**Last claimant takes the remainder.** The final claimant has `shares == ep.sharesRemaining` and receives exactly what is left of both, so the epoch ends at zero (`test_zeroDust_threeAwkwardClaimantsLeaveNothingBehind`). The remainder absorbs the rounding of every earlier entry, and also anything in the pot that no entry's index growth accounts for: accrual on shares sent straight to the vault address, or a residual carried from an earlier clamped settlement. Entries draw in the order they are collected. If `_takeAccrued` clamped the escrow's accrual, each entry collected earlier is still paid its own index growth, capped at what the epoch still holds, so the shortfall falls on whoever collects last, and on the entries just before it if the shortfall is larger than that entry's growth.

{% hint style="info" %}
**Why USDG is per entry (fixed 2026-09-13).** The escrow's accrual is one pot, earned tranche by tranche on whatever the escrow held when each tranche was indexed. It used to be split pro rata by shares, so a deposit that indexed premium between two queue entries moved value from the earlier queuer to the later one. In the test sequence, alice's epoch USDG was 1,504,166 instead of 4,512,500, and a newcomer who deposited and then queued could take most of an earlier queuer's premium. The per-entry index fixes it (`test/unit/VaultQueueFairness.t.sol`, including a fuzz test).
{% endhint %}

**Settling is not paying.** Moving an entry into `owedAssets` / `owedQueueUsdg` touches no token and emits `QueueEntrySettled`. That happens both when `queueRedeem` flushes a stale entry and inside `completeRedeem`. Only `_payoutOwed` transfers tokens, and `completeRedeem` emits `CompleteRedeem` after it. So an issuer freeze on the Stock Token can stop the payout but never the act of queueing (`test_issuerFreezeDoesNotBlockQueueingForAStaleSlotHolder`). Indexers should reduce epoch balances on `QueueEntrySettled` and reserves on `CompleteRedeem`.

**The two payout legs are independent.** `_payoutOwed` pays the NVDA leg first with `safeTransfer`. It then attempts the USDG leg with a raw call. `owedQueueUsdg`, `usdgReservedForQueue` and `usdgAccounted` move only if the USDG actually left. On failure (USDG paused, the vault or the receiver frozen) the vault emits `UsdgLegDeferred(owner, receiver, usdgOwed)` and the USDG stays booked, collectable by a later `completeRedeem` to the same or another receiver. A call with nothing left but a blocked USDG leg reverts `UsdgLegBlocked(usdgOwed)`. A Stock Token pause still reverts the whole call: there is nothing to pay principal with, and the USDG waits behind it (`SECURITY.md` §4, AF-03).

**Reserves are outside NAV.** `reservedAssets` is subtracted in `totalAssets()`, and `usdgReservedForQueue` is subtracted from what holders can claim. A settled but uncollected redemption neither dilutes nor is diluted by anyone. `completeRedeem` has no deadline.

For the depositor-level view, see [Withdrawing and the redeem queue](../getting-started/withdrawing.md).

## The reserve haircut

`reservedAssets` is a claim on the vault's NVDA, senior to live shares. The issuer's `adminBurn` can take the balance below it. When that happens, every uncollected reserved claimant is paid the same fraction of what is booked to them (`_haircut`, `_payoutOwed`):

```
paid = booked                                  while balance >= reservedAssets
paid = floor(booked * balance / reservedAssets) while balance <  reservedAssets
reservedAssets -= booked                       released by the BOOKED amount, whatever was paid
emit ReserveHaircut(owner, booked, paid)       when paid != booked
```

The fraction does not change as people collect: paying `a × b / r` leaves `(b − a×b/r) / (r − a) = b / r`. The order of collection therefore does not matter, and the last claimant drains the reserve to exactly the balance (`testFuzz_haircutFractionIsTheSameForEveryClaimant`). `previewCompleteRedeem` quotes the haircut figure.

- Live shares' idle backing is already zero while the balance is below the reserve, so nothing more is taken from them.
- While a call is open, collateral returning at `rollClose` refills the balance, and a claimant who has not yet collected is then paid in full, with the burn borne by live shares through NAV.
- The haircut is permanent for whoever collected during the shortfall, even if the issuer later restores tokens. Restored tokens accrue to live shares through NAV. That is the accepted trade for never paying a shortfall out of a newcomer's deposit.
- Deposits are refused throughout and reopen once `balance >= reservedAssets` again.

## Stranded claims

A claim is **stranded** when `rollClose` could not redeem it: Valorem's `redeem` reverted because, in a week with any assignment, USDG was paused, the vault or the clearinghouse was frozen on USDG, or the clearinghouse's USDG was burnt; or because the vault was blocklisted on the Stock Token in a week that was not fully assigned. `rollClose` still reaches `Idle`, harvests what is in the vault, and settles the queue on the idle balance, but keeps the claim. `isStranded()` is `phase == Idle && claimKey != 0`, a state no other path produces. Each stranding opens a new **generation** (`strandGen`).

```
rollClose (redeem fails)   strandGen += 1;  strandedRemainingWad = 1e18;  emit ClaimStranded
                           harvest(0);  _settleQueue();  phase = Idle

while stranded             deposits refused (DepositsClosed);  instant redeem off (contractsWritten != 0)
                           rollOpen reverts StillStranded (one stranded claim at a time)
                           totalAssets = max(balance + lockedAssets * strandedRemainingWad / 1e18 - reserved, 0)
                           queueRedeem and settleQueue keep working on the IDLE balance

each _settleQueue          the epoch's idle slice as usual, plus
                           share = floor(strandedRemainingWad * q / totalSupply)   (supply before the burn)
                           strandedRemainingWad -= share;  epochStrandWad[epoch] = share;  emit EpochStrandShare

_settleEpochEntry          mine = floor(share * shares / ep.sharesRemaining)   (last claimant: the rest)
                           staged as owedStrandWad[owner] / owedStrandGen[owner]; no token, no value yet

retryStrandedClaim()       anyone; reverts NotStranded if nothing is stranded, StillStranded if the redeem still fails
  (a, b)   = NVDA and USDG the redeem returned
  queueWad = 1e18 - strandedRemainingWad
  strands[gen] = { assetsIn: a, usdgIn: b, wadLeft: queueWad,
                   assetsLeft: floor(a * queueWad / 1e18), usdgLeft: floor(b * queueWad / 1e18) }
  reservedAssets += assetsLeft;  usdgReservedForQueue += usdgLeft;  usdgAccounted += usdgLeft
  lastResolvedGen = gen;  strandedRemainingWad = 0;  emit StrandedClaimRecovered
  _harvest(b - usdgLeft)   live shares' USDG through the index, fee-free like strike proceeds;
                           their NVDA is simply back in the balance, so NAV rises by it

completeRedeem (later)     _materializeStrand(owner): the staged WAD becomes
                             w == strands[gen].wadLeft ? (assetsLeft, usdgLeft)                        last owner
                                                       : (floor(assetsIn * w / 1e18), floor(usdgIn * w / 1e18))
                           moved into owedAssets / owedQueueUsdg; emit StrandShareSettled; paid by _payoutOwed
```

**Generations resolve strictly in order.** `rollOpen` refuses to open over a stranded claim, so a second claim can strand only after the first was redeemed. When an owner holding a share of an older, already-redeemed generation is staged a share of a newer one, the older share is folded in first (`_stageStrandShare`). An account therefore never holds unresolved shares of two generations. `previewCompleteRedeem` folds in the same order with the same rounding, so it quotes exactly what `completeRedeem` pays; a share whose claim has not been redeemed is quoted as nothing, and a `completeRedeem` with nothing else to collect reverts `StillStranded`.

**Zero dust, by construction.** A generation's epoch shares sum to exactly `1e18 − strandedRemainingWad`, an epoch's owner shares sum to exactly the epoch's share, and the last owner of a generation takes exactly what its `assetsLeft` / `usdgLeft` still hold. The floors of the others sum to at most those amounts, so the last slice is never short.

**Worked example, from a fork rehearsal.** Week 3 of the same keeper fork rehearsal (`keeper/DRYRUN.md`, run 2026-09-15 UTC), strike 239 USDG, with 16 shares outstanding:

```
fills                          2 contracts written and sold; 12.4 NVDA idle after the fill
queue while Listed             the depositor queues 2 shares
exercise                       1 contract exercised on the real Clear
USDG freeze of the vault       rollClose STRANDS: ClaimStranded(3, claimKey, 1), RollClose(3, 0, 0, 1)
epoch 4 idle slice             floor(2e18 * (12.4e18 + 1) / (16e18 + 1)) = 1.55 NVDA
epoch 4 claim share            floor(1e18 * 2e18 / 16e18) = 0.125e18   (EpochStrandShare)
strandedRemainingWad           0.875e18
retry before the unfreeze      reverts StillStranded
retry after the unfreeze       redeem returns 1 NVDA and 239 USDG
  queue's part                 0.125 NVDA and 29.875 USDG to the reserves
  live shares' part            209.125 USDG harvested fee-free; 0.875 NVDA back in the balance
completeRedeem (depositor)     1.675 NVDA (1.55 + 0.125) and 30.093766 USDG
                               (0.218766 escrow premium + 29.875 claim share)
```

The protocol fee on that week's premium could not be paid while the vault was frozen. It stayed in `pendingFeeUsdg` and was paid once the freeze lifted.

**What changes for readers.** A stranded `RollClose` reports `assetsReturned == 0` and `usdgFromAssignment == 0`, preceded by `ClaimStranded(cycleNumber, claimKey, gen)`. The claim's real proceeds arrive later in `ClaimRedeemed` and `StrandedClaimRecovered`, and the retry's `Harvest` carries the stranded cycle's number. `EpochStrandShare` is what a UI needs to show a queuer's pending claim share. `StrandShareSettled` is the strand analogue of `QueueEntrySettled`: books move, no token.

## Rounding direction, summarised

| Computation | Direction | Who absorbs the remainder |
|---|---|---|
| Shares on `deposit`, assets on `redeem` | down | stays in the vault, for existing holders |
| Assets on `mint`, shares on `withdraw` | up | caller pays the extra base unit |
| `indexDelta`, `credited` | down | `usdgDust`, carried to the next distribution |
| Per-account pending USDG | down | stays in the vault; see drift above |
| Protocol fee | down | holders (the fee is never rounded up) |
| Queue `payoutAssets` (with the +1/+1 offset) | down | remaining holders |
| Epoch draw-down (NVDA pro rata, USDG per entry index growth) | down, last claimant exact | nobody; the epoch ends at zero |
| Epoch and owner shares of a stranded claim | down, last owner exact | nobody; the generation ends at zero |
| Reserve haircut | down | live shares, through NAV, once the reserve is fully collected |
| Strike band (`strikeBand`), premium floor (`minPremium`) | down | n/a (gates, not payments) |
| Valorem engine fee, if accepted | down, with a minimum of 1 base unit | matches upstream `write` |

## The invariants

`test/invariant/VaultInvariant.t.sol` asserts thirteen `invariant_*` functions after every call of a handler-driven stateful campaign (64 runs, depth 600, 26 handler actions including a third-party writer and exerciser in the vault's option series, an issuer `adminBurn`, USDG pause and freeze toggles, an NVDA blocklist toggle, and `retryStrandedClaim`). The formulas below are abridged from `docs/ACCOUNTING.md` §7, which lists every clause the code asserts. `burned` and `burnReserveShortfall` are ghosts of the handler's burns; `strandAssetsLeft` / `strandUsdgLeft` sum the uncollected queue share of every redeemed stranded claim; `navLocked` is `lockedAssets()`, scaled by `strandedRemainingWad / 1e18` while stranded; `totalSold` sums every fill's size.

```
1.  invariant_assetConservation
    deposited >= withdrawn + assignedOut + burned
    asset.balanceOf(vault) + lockedAssets() == deposited - withdrawn - assignedOut - burned

2.  invariant_usdgBooksBalance
    usdgOwed() + usdgReservedForQueue + usdgDust + usdgUnallocated + pendingFeeUsdg
        <= usdg.balanceOf(vault) + maxIndexRoundingDrift
    usdgAccounted <= usdg.balanceOf(vault)
    usdgReservedForQueue == sum(epoch.usdgRemaining) + sum(owedQueueUsdg) + strandUsdgLeft

3.  invariant_usdgHolderSolvency
    sum(claimableUsdg) + usdgReservedForQueue + usdgDust + usdgUnallocated + pendingFeeUsdg
        <= usdg.balanceOf(vault) + maxIndexRoundingDrift

4.  invariant_shareAccounting
    totalSupply() == sum of holder balances (escrow at the vault included)
    balanceOf(optionBuyer) == 0
    queuedShares == balanceOf(vault)

5.  invariant_noFreeShares
    totalSupply() > 0  =>  convertToAssets(totalSupply()) <= totalAssets()
    sum(convertToAssets(holder balance)) + min(reservedAssets, asset.balanceOf(vault))
        <= asset.balanceOf(vault) + lockedAssets()
    totalAssets() == max(asset.balanceOf(vault) + navLocked - reservedAssets, 0)

6.  invariant_reservesAreReal
    reservedAssets <= asset.balanceOf(vault) + burnReserveShortfall
    usdgReservedForQueue + pendingFeeUsdg <= usdg.balanceOf(vault)
    reservedAssets == sum(epoch.assetsRemaining) + sum(owedAssets) + strandAssetsLeft
    claimKey != 0  =>  claim.amountWritten == contractsWritten * 1e18,
                       |lockedAssets() - (claim.amountWritten - claim.amountExercised)| <= 1 wei
    contractsAssigned() <= contractsWritten

7.  invariant_phaseSanity
    contractsWritten > 0  =>  phase != Idle || isStranded()
    Idle, not stranded  =>  claimKey == 0, lockedAssets() == 0, canRedeemInstantly()
    Idle, stranded      =>  contractsWritten > 0, !canRedeemInstantly(), maxDeposit() == 0
    phase != Settling

8.  invariant_feeNeverTouchesStrikeProceeds
    (usdg.balanceOf(feeRecipient) + pendingFeeUsdg) * 10_000 <= premiumToVault * protocolFeeBps

9.  invariant_depositGateTracksTheReserve
    balance < reservedAssets, or isStranded(), or totalSupply() > totalAssets() * 1e6
        =>  maxDeposit() == 0 && maxMint() == 0

10. invariant_strandSharesAreConserved
    unresolved generation:  strandedRemainingWad + its epoch shares + its owner shares == 1e18
    resolved generation:    its epoch shares + its owner shares == strands[g].wadLeft

11. invariant_vaultHoldsNoOptionTokens
    optionId != 0  =>  clear.balanceOf(vault, optionId) == 0
    claimKey != 0  =>  clear.balanceOf(vault, claimKey) == 1

12. invariant_assignedNeverExceedsSold
    assignedOut <= totalSold * 1e18   (lifetime, every cycle summed)
    contractsAssigned() <= contractsWritten

13. invariant_longSupplyIsUnexercisedCollateral
    for every option id the vault ever armed:
      clear.optionSupply(id) == clear.unexercisedContracts(id)
      clear.optionSupply(id) == balanceOf(buyer, id) + balanceOf(thirdPartyWriter, id) + balanceOf(vault, id)
```

`maxIndexRoundingDrift` is the handler's exact bound for the index drift described above. The run is refused if it ever reaches one dollar. The queue reserve and the pending fee are asserted with no allowance (invariant 6).

Know the limits of this suite (`docs/AUDIT-SCOPE.md` §6). The handler never calls `setPolicy`, `setDepositCap`, `setFeeRecipient`, `setMaxPriceAge`, `acceptValoremFee`, `sweepFee`, `claimUsdgTo` or `invalidateAllListings`. It never donates tokens, never sends shares to the vault address, never turns Valorem's fee on, and fills through a mock that reproduces Seaport 1.6's hook order rather than the real runtime. Those paths are covered, if at all, by deterministic unit tests: the real Seaport 1.6 runtime by `test/unit/VaultRealSeaport.t.sol`, the fee-on fill by `VaultWriteOnFill.t.sol` and `AF04_FeeSizing.t.sol`. In particular, `queuedShares == balanceOf(vault)` in invariant 4 holds in the suite only because nothing there sends shares to the vault. The contract does not reject a share transfer to its own address, so any holder can break the equality with one transfer, and those shares are never burned. No invariant checks that a queue entry received its own index growth, so the per-entry USDG payout is asserted only by `VaultQueueFairness.t.sol`.

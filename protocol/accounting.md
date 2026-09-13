# Accounting

How the vault accounts for NVDA and USDG, how the protocol fee is computed, how the redeem queue pays out, and which invariants the test suite asserts. This page is for integrators, indexers and auditors. The depositor-level explanation of fees is on [Fees](../product/fees.md), and assignment is covered on [Assignment](../product/assignment.md).

Source paths refer to the `callhouse-contracts` repository. The design notes are in `docs/ACCOUNTING.md` there. Where that document and the code differ, this page follows the code.

## Two ledgers

The vault keeps two separate ledgers and never mixes them.

| Ledger | Unit | Distributed through | Moves when |
|---|---|---|---|
| Collateral | NVDA Stock Token base units, 18 decimals | The share price (`totalAssets()` / `totalSupply()`) | Deposits, redemptions, writes into Valorem, assignment, claim redemption |
| Premium | USDG base units, 6 decimals | A per-share index (`accUsdgPerShare`), claimed with `claimUsdg()` | Seaport fills, claim redemption (strike proceeds), any other USDG that reaches the vault |

```
totalAssets() = max(asset.balanceOf(vault) - reservedAssets, 0) + lockedAssets()
```

- `reservedAssets` is NVDA already promised to settled redeem-queue epochs, so it is excluded from the share price.
- `lockedAssets()` reads Valorem's live `position(claimKey).underlyingAmount` (clamped at 0, and 0 if the call reverts). It falls the moment a contract is assigned.
- USDG does not appear in `totalAssets()`. Unsold option tokens are valued at zero.

### Why premium is not in the share price

If USDG were folded into `totalAssets()`, the share price would jump the instant a buyer fills. That is marking the short call to market by another route, which the design forbids (`src/Distributor.sol` design note). Keeping premium out also keeps the oracle out of the money path. `redeem`, `withdraw`, `queueRedeem`, `completeRedeem`, the harvest and `rollClose` never read a price.

The consequences for anyone reading the share price:

- A filled week does not raise the share price.
- An out-of-the-money week leaves it unchanged.
- An assigned week lowers it, because collateral left and the strike proceeds went to the USDG ledger.

## Units

| Quantity | Unit |
|---|---|
| `assets`, `idleAssets()`, `lockedAssets()`, `reservedAssets` | asset base units, 18 decimals (`1e18` = 1 NVDA) |
| Shares | 18 decimals (`decimals()` returns 18) |
| `spotUsdg`, strikes, premiums, fees | USDG base units, 6 decimals, per lot of `1e18` asset base units |
| `contracts` | whole lots |
| `*Bps` fields | basis points (`10_000` = 100%) |
| `accUsdgPerShare` | USDG base units per share, scaled by `1e27` |
| Valorem `Claim.amountWritten` / `amountExercised` | `1e18`-scaled; `contractsAssigned()` divides by `1e18` |

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

`previewRedeem` and `previewWithdraw` return 0 unless an instant redemption would succeed now. `maxDeposit` is measured against `totalAssets()`, not the raw balance, and returns 0 in every state where `deposit` would revert.

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
    floor(balanceOf(account) * (accUsdgPerShare - snapshot[account]) / 1e27)
```

The precision is `1e27` rather than `1e18` because USDG has only 6 decimals. At `1e18`, a small weekly premium spread over a large share supply could round to zero per share (`ACC_PRECISION`).

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

Every USDG outflow reduces `usdgAccounted` by the amount paid, saturating at 0 (`_debitUsdgOut`). There are three outflows: holder claims, queue payouts and the fee transfer. Any USDG balance increase counts as harvestable: fills, strike proceeds, and USDG transferred to the vault directly.

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

It has two callers, and they pass different `feeFree` values:

| Caller | `feeFree` | Why |
|---|---|---|
| `rollClose` via `_harvest(usdgFromAssignment)` | `usdgFromAssignment`, the USDG balance change measured across `clear.redeem` in the same transaction, which `RollClose` also emits | Strike proceeds are the assigned depositors' collateral sold at the strike. They are principal, not yield, so they are credited to holders in full and never charged the fee. |
| `deposit` / `mint` via `_checkpointHarvest()` | `0` | Strike proceeds sit inside the Valorem claim until `rollClose` redeems it, so none can be in the balance when a deposit runs. |

The fee rate is `policy.protocolFeeBps`. It is 500 (5%) at launch (`Policy.launchDefaults`), and `Policy.validate` caps it at 2000 (20%) in bytecode. The fee-free exclusion is code, not a policy field, so no admin setting can bring strike proceeds into the fee base. An unfilled week harvests 0 and is charged nothing.

The fee is charged on the premium that reaches the vault. Overcall separately takes 5% of gross premium as the second Seaport consideration item in the same fill, rounded down per contract and then multiplied (`Policy.splitPremium`, enforced on chain by `SeaportOrderLib`). With both at 5%, the combined deduction is 9.75% of gross premium (`docs/ACCOUNTING.md` §6).

**The fee payment is best-effort.** The fee accrues in `pendingFeeUsdg`. `rollClose` tries to pay it to `feeRecipient` with a raw `transfer` call, clamped to the vault's balance, that cannot revert the close (`_tryPayFee`). If the transfer fails, the fee stays pending. Anyone can call `sweepFee()` later, and it always pays the stored `feeRecipient`, never the caller. It reverts `NothingToClaim` if nothing moved.

## Checkpoint before mint

`deposit` and `mint` call `_checkpointHarvest()` before any new shares exist:

- `deposit`: phase gate, cap check, checkpoint, `previewDeposit`, transfer in, `_mint`.
- `mint`: phase gate, checkpoint, `previewMint`, cap check, transfer in, `_mint`.

Without the checkpoint, premium that landed when a buyer filled mid-week would sit un-indexed until `rollClose`. Anyone could then deposit just before the close and take a share of premium earned entirely by other depositors' collateral. With it, the index is fixed first and new shares start from the current value. The checkpoint makes no external call. Its fee goes to `pendingFeeUsdg` and is paid at the close or by `sweepFee`.

The checkpoint emits `Harvest(cycleNumber, gross, fee, net)` only if `gross != 0`. The close always emits `Harvest`, including `(0, 0, 0)`. So:

- One cycle can have several `Harvest` events with the same `cycleNumber`.
- A filled week's close can emit `Harvest(cycle, 0, 0, 0)` if a deposit already checkpointed the premium.
- Weekly figures are the sum over the cycle's `Harvest` events. The fee Safe's balance rises by the sum of their `feeUsdg`, whenever the payment succeeds (`FeeSwept`).

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

**Worked example, from the recorded keeper fork dry run.** Cycle 3, 9 of 23 contracts assigned. These are the re-run figures after the fee change (`docs/AUDIT-SCOPE.md` §6 in `callhouse-contracts`, and `keeper/DRYRUN.md` in the app repository):

```
RollClose.usdgFromAssignment   2025.000000 USDG   (9 contracts x 225.00 strike)
Harvest.grossUsdg              2044.079259 USDG   (19.079259 premium + 2025 strike proceeds)
fee base                         19.079259
Harvest.feeUsdg                   0.953962        floor(19_079_259 * 500 / 10_000) = 953_962
Harvest.netUsdg                2043.125297        2044.079259 - 0.953962
feeUsdg / grossUsdg             ~0.047%           not the 5% rate
```

**Stylised example, from `docs/ACCOUNTING.md` §8.** 10 contracts at a 231.00 strike, sold at 2.00 each:

```
gross premium paid by buyer     20.000000   -> Overcall 1.000000, vault 19.000000
not assigned:  Harvest gross 19.000000, fee 0.950000, net 18.050000; share price unchanged
fully assigned: RollClose.usdgFromAssignment 2310.000000
                Harvest gross 2329.000000, fee 0.950000, net 2328.050000; totalAssets falls by 10 NVDA
```

The fee is 0.95 USDG either way.

## The redeem queue

While a position is open (`phase != Idle` or `contractsWritten != 0`), `redeem` and `withdraw` revert `UseQueue` and exits go through the queue.

```
queueRedeem(shares)       any phase; never blocked by a halt
  if the caller has an entry in an earlier (settled) epoch: move it to owed balances (no tokens)
  require shares <= balanceOf(caller)
  queuedEpochOf[caller] = epochId;  queuedSharesOf[caller] += shares;  queuedShares += shares
  settle caller's USDG accrual (they keep everything earned so far, claimable via claimUsdg)
  queueAccDebt[caller] += shares * accUsdgPerShare   the index these shares enter escrow at
  transfer the shares into escrow at the vault's own address

_settleQueue()            inside rollClose, AFTER the harvest; no-op if queuedShares == 0
  escrowUsdg   = _takeAccrued(vault)             the escrow account's USDG accrual, clamped
  epochAccUsdgPerShare[epochId] = accUsdgPerShare  the index this epoch settled at
  payoutAssets = floor(idleAssets() * queuedShares / totalSupply)   supply still includes escrow
  burn the escrowed shares
  epochs[epochId] = {sharesRemaining: q, assetsRemaining: payoutAssets, usdgRemaining: escrowUsdg}
  reservedAssets += payoutAssets;  usdgReservedForQueue += escrowUsdg
  emit QueueSettled(epochId, q, payoutAssets, escrowUsdg);  epochId += 1

completeRedeem(receiver)  any phase
  if the caller's entry is in a settled epoch (entryEpoch < epochId): settle it into owed balances
  pay owedAssets (NVDA) and owedQueueUsdg (USDG) to receiver; reduce the reserves by the same amounts
```

`epochId` starts at 1 and advances only when a close actually settles queued shares. An entry can be collected once its epoch number is lower than the current `epochId`.

**What each entry draws.** NVDA is pro rata, because every escrowed share is worth the same slice of the settled book. USDG is not: shares that entered escrow at different index values earned different amounts, so each entry is paid the index growth of its own shares.

```
assets = floor(ep.assetsRemaining * shares / ep.sharesRemaining)
usdg   = min( floor((shares * epochAccUsdgPerShare[e] - queueAccDebt[owner]) / 1e27),  ep.usdgRemaining )
```

**Last claimant takes the remainder.** The final claimant has `shares == ep.sharesRemaining` and receives exactly what is left of both, so the epoch ends at zero and the rounding of every earlier entry is absorbed (`test_zeroDust_threeAwkwardClaimantsLeaveNothingBehind`).

{% hint style="info" %}
**Why USDG is per entry (fixed 2026-09-13).** The escrow's accrual is one pot, earned tranche by tranche on whatever the escrow held when each tranche was indexed. It used to be split pro rata by shares, so a deposit that indexed premium between two queue entries moved value from the earlier queuer to the later one. In the test sequence, alice's epoch USDG was 1,504,166 instead of 4,512,500, and a newcomer who deposited and then queued could take most of an earlier queuer's premium. The per-entry index fixes it (`test/unit/VaultQueueFairness.t.sol`, including a fuzz test).
{% endhint %}

**Settling is not paying.** Moving an entry into `owedAssets` / `owedQueueUsdg` touches no token and emits `QueueEntrySettled`. That happens both when `queueRedeem` flushes a stale entry and inside `completeRedeem`. Only `_payoutOwed` transfers tokens, and it emits `CompleteRedeem`. So an issuer freeze on the Stock Token can stop the payout but never the act of queueing (`test_issuerFreezeDoesNotBlockQueueingForAStaleSlotHolder`). Indexers should reduce epoch balances on `QueueEntrySettled` and reserves on `CompleteRedeem`.

**What a queued position receives.** The escrowed shares stay in `totalSupply` until settlement. They earn their share of every distribution up to and including the close's harvest, and they are priced against the collateral that is idle after the claim is redeemed. After an assigned week, the epoch therefore pays a mix of remaining NVDA and USDG (strike proceeds and premium), not a guaranteed return of the token. The escrow is a single account (the vault's own address), but its USDG is paid per entry: each entry receives what its own shares earned between the moment they were escrowed and settlement.

**Reserves are outside NAV.** `reservedAssets` is subtracted in `totalAssets()`, and `usdgReservedForQueue` is subtracted from what holders can claim. A settled but uncollected redemption neither dilutes nor is diluted by anyone. `completeRedeem` has no deadline.

For the depositor-level view, see [Withdrawing and the redeem queue](../getting-started/withdrawing.md).

## Rounding direction, summarised

| Computation | Direction | Who absorbs the remainder |
|---|---|---|
| Shares on `deposit`, assets on `redeem` | down | stays in the vault, for existing holders |
| Assets on `mint`, shares on `withdraw` | up | caller pays the extra base unit |
| `indexDelta`, `credited` | down | `usdgDust`, carried to the next distribution |
| Per-account pending USDG | down | stays in the vault; see drift above |
| Protocol fee | down | holders (the fee is never rounded up) |
| Queue `payoutAssets` | down | remaining holders |
| Epoch draw-down (NVDA pro rata, USDG per entry index growth) | down, last claimant exact | nobody; the epoch ends at zero |
| Overcall split (`splitPremium`) | fee per contract down, then multiplied | vault's consideration item gets the per-contract remainder |
| Strike band (`strikeBand`), premium floor (`minPremium`) | down | n/a (gates, not payments) |
| Valorem engine fee approval, if accepted | down, with a minimum of 1 base unit | matches upstream `write` |

## The invariants

`test/invariant/VaultInvariant.t.sol` asserts eight `invariant_*` functions after every call of a handler-driven stateful campaign (inline config: 64 runs, depth 600, `fail-on-revert = true`). The formulas below are what the code asserts:

```
1. invariant_assetConservation
   deposited >= withdrawn + assignedOut
   asset.balanceOf(vault) + lockedAssets() == deposited - withdrawn - assignedOut
   (ghost totals built from what callers asked for and what the vault returned)

2. invariant_usdgBooksBalance
   usdgOwed() + usdgReservedForQueue + usdgDust + usdgUnallocated + pendingFeeUsdg
       <= usdg.balanceOf(vault) + maxIndexRoundingDrift
   usdgAccounted <= usdg.balanceOf(vault)
   usdgReservedForQueue == sum(epoch.usdgRemaining) + sum(owedQueueUsdg)

3. invariant_usdgHolderSolvency
   sum(claimableUsdg) + usdgReservedForQueue + usdgDust + usdgUnallocated + pendingFeeUsdg
       <= usdg.balanceOf(vault) + maxIndexRoundingDrift

4. invariant_shareAccounting
   totalSupply() == sum of holder balances (escrow at the vault included)
   balanceOf(optionBuyer) == 0
   queuedShares == balanceOf(vault)

5. invariant_noFreeShares
   totalSupply() > 0  =>  convertToAssets(totalSupply()) <= totalAssets()
   sum(convertToAssets(holder balance)) + reservedAssets <= asset.balanceOf(vault) + lockedAssets()

6. invariant_reservesAreReal
   reservedAssets <= asset.balanceOf(vault)
   usdgReservedForQueue <= usdg.balanceOf(vault)
   usdgReservedForQueue + pendingFeeUsdg <= usdg.balanceOf(vault)
   reservedAssets == sum(epoch.assetsRemaining) + sum(owedAssets)
   contractsAssigned() <= contractsWritten
   lockedAssets() == (contractsWritten - contractsAssigned()) * 1e18

7. invariant_phaseSanity
   contractsWritten > 0  =>  phase != Idle
   phase == Idle  =>  claimKey == 0 and lockedAssets() == 0 and canRedeemInstantly()
   phase != Settling

8. invariant_feeNeverTouchesStrikeProceeds
   protocolFeeBps == Policy.launchDefaults().protocolFeeBps     (one rate per run)
   (usdg.balanceOf(feeRecipient) + pendingFeeUsdg) * 10_000 <= premiumToVault * protocolFeeBps
   (premiumToVault: ghost of the vault's USDG balance change on every fill)
```

`maxIndexRoundingDrift` is the handler's exact bound for the index drift described above. The run is refused if it ever reaches one dollar. The queue reserve and the pending fee are asserted with no allowance (invariant 6).

Know the limits of this suite. According to `docs/AUDIT-SCOPE.md` §6, the handler never calls `setPolicy`, `setDepositCap`, `setFeeRecipient`, `setMaxPriceAge`, `acceptValoremFee`, `sweepFee`, `claimUsdgTo` or `invalidateAllListings`. It never donates tokens to the vault, and it runs against mocks of Valorem, Seaport and the registry. Those paths are covered, if at all, by deterministic unit tests.

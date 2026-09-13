# Security and audits

{% hint style="warning" %}
**The Callhouse contracts are unaudited and not deployed.** No external security firm has reviewed them. The reviews and tests described below were done by the team and are not a substitute for an audit.
{% endhint %}

Source paths refer to the `callhouse-contracts` repository unless marked as the app repository. The threat model and review record are kept in `SECURITY.md` there, and the audit scope in `docs/AUDIT-SCOPE.md`.

## Status

| Item | State |
|---|---|
| External audit | Not done. An engagement is planned, and the scope document exists (`docs/AUDIT-SCOPE.md`). The timeline is "to be confirmed", and no auditor is named in the project's documents. |
| Mainnet deployment | Not done. `docs/DEPLOY.md` says the mainnet steps must not be run before the audit engagement has closed and the deployed commit is the audited tag. |
| Internal adversarial review | Done 2026-09-12. Summarised below. |
| Bug bounty | Planned to open in mainnet week 2 (`SECURITY.md` §6). |
| Upgradeability | None. A defect fix means a new vault and a migration, announced in advance. |

## Internal review, 2026-09-12

An internal adversarial review covered 13 surfaces:

- vault core, share accounting, the phase machine and reentrancy
- the Valorem and Seaport adapters, the order library, and the distributor
- access control, token integration and USDG distribution
- economic and MEV behaviour
- the keeper, indexer API and web surfaces

It raised 72 raw findings, of which 51 survived adversarial refutation. To survive, a finding had to show a concrete, reachable loss or a false statement (`SECURITY.md` §4). The contract defects fixed as a result are recorded as five items, each with regression tests in `test/unit/VaultSecurity.t.sol` (eight tests):

| Severity | Class of defect | Fix now in the code |
|---|---|---|
| Critical | **Pricing new shares against a NAV that assignment had already written down.** Valorem takes collateral on exercise with no callback, so `totalAssets()` fell mid-transaction while the strike USDG stayed in the claim. With the vault still `Listed` during the exercise window, anyone could exercise, mint cheap shares, and collect strike proceeds at the close. | Deposits close at `cycleExerciseTs` whether or not `lockBook` is called, and are also refused whenever unredeemed assignment proceeds exist |
| High | **Unbounded cycle length set by a third party.** The registry bounds expiry only from below, so collateral could have been locked for years. | `MAX_CYCLE_TENOR = 21 days`, compiled in; `rollOpen` reverts `BadCycleWindow` |
| High | **Trusting the registry's validation of the option written.** An option window different from the cycle's would have broken the deposit gate's premise. | `rollOpen` reverts `OptionWindowMismatch` unless the option's window equals the cycle's |
| Medium | **Liveness tied to a token transfer.** A hard fee transfer inside `rollClose` could have frozen the close, the queue and every future cycle. | Best-effort fee payment, `pendingFeeUsdg`, permissionless `sweepFee()` |
| Medium | **A governance switch that could not work.** Accepting Valorem's engine fee still failed, because the approval did not cover the fee charged on top of collateral. | The write approves collateral plus fee and resets the allowance afterwards |

### Found and fixed on 2026-09-13, during documentation review

Writing these pages meant checking every claim against the code, and that surfaced two contract defects. Each was verified with an executable proof of concept, fixed, and pinned by regression tests that fail against the old code.

| Severity (internal) | Defect | Fix |
|---|---|---|
| High | **Lot size.** The vault priced strikes, the premium floor and utilisation per token but wrote whatever lot size the registry reported. The registry owner can change the lot size between cycles, so an unrescaled strike ladder would have been written in the money. In the proof of concept, at a lot of 2 tokens a buyer took about $4,879 out of an $11,000 book. | `ValoremLib.writeCalls` refuses any lot other than exactly one token (`test/unit/VaultLotSize.t.sol`) |
| High | **Redeem-queue USDG shared unfairly.** Queue entries in the same epoch shared one USDG pot pro rata by shares, so premium indexed between two entries moved from the earlier queuer to the later one. A newcomer could deposit and then queue to take most of an earlier queuer's premium (6,768,750 of 9,025,000 base units in the test). | Per-entry index snapshot: each entry is paid its own shares' index growth (`test/unit/VaultQueueFairness.t.sol`) |

The 2026-09-12 review pass also added a `QueueEntrySettled` event, refreshed the error and ABI copies used by the keeper, indexer and web app, and added indexer coverage of `FeeSwept`. `docs/AUDIT-SCOPE.md` §6 lists 15 contract defects found and fixed: 13 during the build and the 2026-09-12 review (it counts that review's two high findings, the tenor cap and the window mismatch, as one item), plus the two above. The source documents do not break down how the 51 surviving findings map to these fixes. It also records that a keeper-focused sweep the same day fixed 18 off-chain defects, outside contract scope.

## Properties enforced in bytecode

These are checks in the contract code, not operating conventions (`SECURITY.md` §2, checked against `src/`):

- **Hard policy caps.** `Policy.validate` runs at construction and on every `setPolicy`. `minOtmBps >= 100`, `maxOtmBps <= 2500`, `minPremiumBps >= 10`, `maxUtilizationBps <= 10000`, `protocolFeeBps <= 2000`, `maxContractsCap != 0`. `maxPriceAge` is bounded to 1 hour through 7 days. At most 3 listings per cycle.
- **The protocol fee never touches strike proceeds.** `rollClose` passes the USDG measured across `clear.redeem` to the harvest as fee-free. That exclusion is code, not a policy field. See [Accounting](accounting.md#the-fee-formula).
- **Deposits close on the cycle's exercise timestamp,** not on the phase and not on anyone calling `lockBook`. A second check, independent of the clock, refuses deposits while unredeemed assignment proceeds exist.
- **Cycle tenor is capped at 21 days** from the write (`MAX_CYCLE_TENOR`).
- **The option written must match the cycle.** Its asset, exercise asset and lot size must match, and its exercise and expiry timestamps must equal the cycle's (`ValoremLib.writeCalls`).
- **One contract is exactly one token.** `ValoremLib.writeCalls` reverts `UnexpectedLotSize` unless the cycle's lot size is `1e18`, because the strike band, premium floor and utilisation are all priced per token.
- **Each queue entry is paid the USDG its own escrowed shares earned,** not a pro-rata slice of what other entries earned (per-entry index snapshot; see [Accounting](accounting.md)).
- **Valorem's engine fee is opt-in.** While it is switched on and the admin has not accepted it, `rollOpen` reverts.
- **The fee payment cannot freeze the close.** `_tryPayFee` uses a raw call, clamped to balance, and changes state only on success. `sweepFee()` always pays the stored `feeRecipient`.
- **Payouts are clamped to what is backed.** Holder claims and the queue's USDG are limited to the balance minus the queue reserve and pending fee. USDG accounting is anchored on the measured `usdgAccounted`.
- **Share maths rounds in the vault's favour.** Deposits and redemptions round down; mints and withdrawals round up.
- **Every listing is validated field by field** against vault state before `seaport.validate`: recipients, tokens, amounts, fee split, timing and counter. EIP-1271 answers only for the recorded hash.
- **No role can transfer vault tokens.** The vault moves tokens only in these cases:
  - to a receiver named by a share owner or approved spender (`redeem`, `withdraw`, `completeRedeem`, `claimUsdg`)
  - into Valorem, when `rollOpen` writes collateral
  - to a Seaport filler, when an approved listing fills
  - to the stored `feeRecipient`, for the fee
- **The price feed is not on any settlement path.** It is read only in `rollOpen`, `approveListing` and the `spotUsdg()` view.
- **The eight invariants** in `test/invariant/VaultInvariant.t.sol` are asserted by the stateful suite. See [Accounting](accounting.md#the-invariants).

## What each key compromise buys

Full detail is on [Roles and admin powers](roles.md).

| Key | Powers | Worst case |
|---|---|---|
| Keeper (hot EOA) | `rollOpen`, `approveListing`, `cancelListing`, `invalidateAllListings`, early `rollClose` | Skipped weeks. Or writes and listings on the least favourable terms the current policy allows, filled by a buyer it controls. It cannot move a token, route premium to itself, or step outside the policy. |
| Guardian (1 of 1) | `haltWrites`, `cancelListing`, `invalidateAllListings` | Writes halted and listings killed until the admin acts. Exits and settlement keep working. It cannot unhalt. |
| Admin (at launch the deployer key; after `script/HandoverAdmin.s.sol`, the 2-of-3 Safe) | Policy within the caps, fee recipient, deposit cap, `maxPriceAge`, Valorem fee acceptance, halt and unhalt, role grants; no timelock | Up to 20% of premium, redirected to an address it chooses. Policy loosened to its compiled-in limits, with rolls run through a keeper it appoints. It cannot transfer tokens, charge a fee on strike proceeds, upgrade, or block exits. Until the handover, one EOA holds all of these powers (`docs/DEPLOY.md`). |
| Overcall registry owner (third-party EOA) | Sets each cycle's rungs, timestamps and lot size for the market | Refused by the vault: tenor over 21 days, inverted windows, unapproved or wrong-cycle rungs, option metadata that disagrees with the cycle, and (since 2026-09-13) any lot size other than one token. Not defended: bad but in-band strike ladders and the cycle-replacement race (`docs/AUDIT-SCOPE.md` §5). |
| NVDA Stock Token issuer (third party) | Transfer pause, account blocklist, oracle pause, burn from any holder (`adminBurn`), beacon upgrade; the role holders observed were single EOAs (`ops/recon/R6-stock-token.md` in the app repository) | A transfer pause, or a blocklist entry on the vault, stops NVDA transfers and with them settlement. An oracle pause stops only `rollOpen` and `approveListing`; settlement never reads the oracle, so an open week still closes. Separately, vault-held NVDA can be burned (`adminBurn`) or the token logic replaced by upgrade. Queueing and USDG claims keep working while transfers are frozen. There is no technical mitigation. |
| USDG issuer (third party) | Freeze, wipe of frozen balances, pause, upgrade; admin behind a 24-hour timelock (`R6-stock-token.md` §7) | USDG claims and queue USDG payouts stop, and a frozen vault's USDG can be wiped. The fee payment cannot revert `rollClose`, but a close that has to receive strike USDG from Valorem can revert if the vault is frozen (`docs/AUDIT-SCOPE.md` §5, area of concern 2). |
| Chainlink feed owner (third party) | Can rotate the aggregator or gate reads on the proxy (`ops/recon/R5-price-feed.md`, verification pass) | Writes stop (stale or reverting price). Settlement does not read the feed. |
| Valorem Clear `feeTo` (the Overcall fee EOA) | Switch the 15 bps notional engine fee on, with no timelock | Writes stop until the admin decides whether to accept the fee. |

Depositor-level disclosure of these risks is on [Risks](../product/risks.md).

## Test evidence

Everything here was run locally by the team. The GitHub Actions account currently fails before any step runs, so CI has confirmed nothing independently (`README.md`, "CI"; `docs/AUDIT-SCOPE.md` §6). None of it is an audit.

- **Unit and invariant tests: 319 tests in 14 suites, all passing,** against mock Valorem, Seaport, registry and feed contracts. Measured 2026-09-13 after the two fixes above (fix commit `d2c3b6d` in `callhouse-contracts`; `docs/AUDIT-SCOPE.md` §6; `README.md`). The commit hashes `SECURITY.md` and `docs/AUDIT-SCOPE.md` cite for this run (`6ed528f`, `b0ff57b`) predate a history rewrite and are not in the current history. This includes the eight invariants, run for 64 runs at depth 600.
- **Fork tests against live chain 4663: 21 tests,** in `test/fork/ForkLive.t.sol`. They cover:
  - code presence, versions and decimals at every address
  - the registry pair binding and rejection of the JUGGERNAUT registry
  - feed liveness and normalisation
  - Seaport hashing the vault's order shape, and EIP-1271 rejecting when nothing is listed
  - the guardian bumping the real Seaport counter, and a real Stock Token deposit
  - a real Valorem write plus a real `seaport.validate` whose EIP-712 digest `isValidSignature` accepts

  **Not covered on the fork:** any fill, exercise, claim redemption, `rollClose`, distribution or claim.
- **Keeper three-cycle fork dry run.** The production keeper modules drove three full cycles on an anvil fork of chain 4663, against the real Valorem Clear, Seaport 1.6, NVDA and USDG:
  - Cycle 1: filled.
  - Cycle 2: rolled while the keeper was down, then unfilled.
  - Cycle 3: filled, with a queued redemption and 9 of 23 contracts assigned on the real clearinghouse.
- **Keeper extended fork harness (K-22).** On the same kind of fork, against real Seaport and the real Valorem Clear: partial fills of 7/28, 6/21 and 5/15; a guardian `cancelListing` and an `invalidateAllListings`, each followed by a relist, ending in `TooManyListings(3, 3)`; three exercise transactions by two buyers with 13 contracts assigned; a role-less `rollClose` that fails until exactly expiry + 3600 and then succeeds; and the Valorem fee switched on, then accepted (`keeper/DRYRUN.md`, K-22).

  It was re-run and passed after the fee change on 2026-09-13 (`keeper/DRYRUN.md` in the app repository; `docs/AUDIT-SCOPE.md` §6). The registry and feed were mocks seeded with live data, Overcall's API was a stub, and token balances were written into storage. The vault was the only writer of each series, so Valorem's bucketed assignment across writers was not exercised.
- **Deploy rehearsal.** The full deploy, verify, Safe-configure and admin-handover flow (bootstrap key to Safe) passed on an anvil fork with real Safes on 2026-09-13 (`docs/DEPLOY.md`, "Rehearsal record").

According to `docs/AUDIT-SCOPE.md` §6, this evidence does **not** prove the following:

- **Overcall's production validator** has never accepted the vault's EIP-1271 listing.
- **Assignment against the real clearinghouse** has run only in the dry run and the extended harness, with several exercisers but the vault as the only writer, so Valorem's bucketed assignment across writers is untested. Every other assignment test uses a mock that does not model it.
- **Distribution and claims** have not run on the live chain outside the dry run.

## Open questions before launch

From `SECURITY.md` §5:

1. **EIP-1271 against Overcall's live validator.** One real 1-contract listing is planned before launch. If Overcall rejects the listing, the fallback is the app's cycle page, which serves the keeper's signed order after checking it against the chain (`docs/WIRING.md` §7 in the app repository). That path passed the fork acceptance test, including a tampered order that it refused, but it has not run against the live chain.
2. **Keeper pricing at exactly the policy floor.** An upward price tick between the keeper's read and `approveListing` reverts `PremiumBelowMinimum`. It self-heals on the next attempt. The keeper now has an optional `PREMIUM_MARGIN_BPS` setting (0 to 1000 bps above the floor) that absorbs such a tick at the cost of a higher ask. Its default is 0, which still prices at the floor, and which value to run with is undecided.
3. **Gas cost of the deposit-time harvest checkpoint.** To be measured on the first live week.

## Audit plan

An external audit is planned before mainnet deployment. The scope document, `docs/AUDIT-SCOPE.md` in `callhouse-contracts`, asks for:

- a manual review of the seven in-scope Solidity files: `Vault`, `Distributor`, `AdapterValorem`, `AdapterSeaport`, `ValoremLib`, `SeaportOrderLib` and `Policy`
- a configuration review of the deploy, configure, admin-handover and verify scripts, the deploy runbook and the role topology, including the bootstrap-admin phase and the handover's safety conditions
- a written verdict on each assumption the vault makes about the third-party contracts

The audit commit will be pinned and tagged at engagement. This page will be updated with the auditor, the report and the audited commit once they exist.

## Reporting a vulnerability

Do not open a public issue.

Send reports to **security@callhouse.finance**. The same address is published at `https://callhouse.finance/.well-known/security.txt` (RFC 9116) and on `https://callhouse.finance/legal#reporting` (`SECURITY.md` §6). Do not rely on addresses found elsewhere. `callhouse.xyz` is not a Callhouse domain.

A bug bounty with a dedicated disclosure channel is planned to open in mainnet week 2. Until then the contracts are unaudited and no bounty is offered.

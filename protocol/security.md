# Security and audits

{% hint style="warning" %}
**The Stonkhouse vault is live on Robinhood Chain and has had no external audit.** No external security firm has reviewed the contracts, and none has been engaged. The reviews and tests described below were done by the team. They are not a substitute for an audit. The admin role is one hot key with no timelock, and there is no bug bounty.
{% endhint %}

Source paths refer to the `callhouse-contracts` repository unless marked as the app repository. The threat model and the review record are kept in `SECURITY.md` there, and the review scope in `docs/AUDIT-SCOPE.md`.

## Status

| Item | State |
|---|---|
| External audit | **None.** The owner decided on 2026-09-13 not to commission an external audit (decision D14 in `SECURITY.md` and `README.md`). `docs/AUDIT-SCOPE.md` describes the scope for any reviewer. |
| Mainnet deployment | Live. The vault `0x88a9…ecbb` was deployed on 2026-09-15 at block 63,467,882, and week 1 was armed the same day. Addresses are on [Contracts and addresses](addresses.md). |
| Deployed source | The vault's Sourcify-verified sources are identical to `src/` in the contracts repository at commit `bec4dbd` (the L-01 fix), and `src/` has not changed since. |
| Source verification | Vault: Sourcify `match` on creation and runtime bytecode (a partial match: the metadata hash differs), and partially verified on Blockscout. Both libraries: Sourcify runtime `match` only, not verified on Blockscout. **The Valorem Clear `0x53d7…C6` is not source-verified**; its runtime equals upstream Valorem's except for the metadata hash (see [Contracts and addresses](addresses.md#source-verification)). |
| Admin key | One hot EOA holds `DEFAULT_ADMIN_ROLE`, with no timelock. A handover of the admin role to a Safe is planned and has not happened. See [Roles and admin powers](roles.md). |
| Internal reviews | 2026-09-12 adversarial review; 2026-09-13 documentation-review findings, a second pass and an internal audit, which led to the redesign; a 2026-09-14 internal review of the redesigned contracts. Summarised below. |
| Latest internal review (2026-09-14) | No Critical, High or Medium findings. One Low (L-01), fixed before deployment. One Informational (I-01), reflected in the trust table below. |
| Monitoring and alerts | **Not wired.** The keeper records its alerts in its own log and database only. The relay that would forward them to Discord or Telegram is not deployed, so nobody is paged when the keeper skips a week, a fill reverts or a claim strands. |
| Bug bounty | **None exists.** Report vulnerabilities to security@stonkhouse.fun (see [below](#reporting-a-vulnerability)). |
| Upgradeability | None. A defect fix means a new vault and a migration. |

## The 2026-09-13 redesign

The internal audit of 2026-09-13 found that the vault as it then stood wrote a week's calls before selling them and never exercised the unsold ones. Valorem assigns an exercise pro rata by amount written across the writers in a bucket, and every write before an option's first exercise shares one bucket, so anyone could write the same id, exercise, and take the in-the-money value of the vault's unsold calls out of depositor principal, every in-the-money week (AF-01, High). Rather than bound that, the contracts were redesigned (`SECURITY.md` §0):

- **Write on fill.** `rollOpen` arms a week and writes nothing. Every listing is a Seaport 1.6 order whose zone is the vault, and the vault's `authorizeOrder` hook writes exactly the contracts being bought, inside the fill. `validateOrder` reverts the fill if any token stayed behind. The vault never holds an unsold call, so it can be assigned on at most what it sold.
- **No registry.** The vault no longer reads strikes or cycles from a third-party registry. It validates each option type from the clearinghouse itself and numbers its own cycles. There is no third-party order book, venue fee item or signature (see the history note on [Architecture](architecture.md)).
- **The other four findings** were fixed at the same time: a stranded-claim state machine so a USDG or Stock Token issuer action cannot freeze the close (AF-02), independent payout legs so a USDG problem cannot hold queued principal (AF-03), a utilisation ceiling of 99.85% plus a post-write reserve check (AF-04), and an honest NAV with one deposit gate and a pro-rata reserve haircut (AF-05).

The mechanics are on [Architecture](architecture.md) and [Accounting](accounting.md).

## Internal review, 2026-09-14

A single-reviewer internal pass over every non-mock file in `src/` at commit `79cee08`, read against `docs/AUDIT-SCOPE.md` and `docs/ACCOUNTING.md`, with one Foundry proof of concept and one live read of chain 4663 (`SECURITY.md` §4, "The 2026-09-14 review"). **It found no Critical, High or Medium issue.** It confirmed the five 2026-09-13 findings closed on that commit.

| ID | Severity | Finding | Status |
|---|---|---|---|
| L-01 | Low | **A contract buyer could deposit from inside its own fill.** Seaport transfers the call to the buyer before it collects the USDG, so a contract buyer's ERC-1155 receive hook ran after the vault had written and before the premium arrived. A deposit made there passed every gate, and its shares then took a pro-rata part of the premium of the fill paying for them. In the proof of concept the existing holder was left 9.025 of the fill's 18.05 net USDG. No principal moved and the buyer made no profit after the fee. | **Fixed.** The deposit gate refuses any deposit or mint after a fill has written in the same transaction; `maxDeposit` and `maxMint` quote 0 from the same check. No ABI change. `test/regression/L01_InFillDeposit.t.sol`, and a test on the real Seaport 1.6 runtime in `test/unit/VaultRealSeaport.t.sol`. |
| I-01 | Informational | **Who holds the fee switch on Stonkhouse's own clearinghouse.** On its own Valorem clearinghouse, `feeTo` holds the 15 bps engine fee switch and the vault admin holds the vault's acceptance of it, both immediate. If both are on, every fill pulls 15 bps of its notional in NVDA from the vault to `feeTo`, compensated to depositors only through a higher fill floor paid by the buyer. | **Documented.** As deployed, `feeTo` is a 1-of-1 Safe (`0xff14…CF61`) separate from the admin EOA, so the switch and the acceptance sit on different keys. See the trust table below and [Roles and admin powers](roles.md#the-valorem-engine-fee-on-our-own-clearinghouse). No code change. |

The review also lists what it attacked and found holding, so the next reviewer does not repeat it: the zone hooks against foreign orders, spoofed offerers, repeated listings in one batch and a buyer re-entering between the hooks; bucket assignment and third-party writers on Valorem; every redeem failure and the gas-starvation guard; the queue, reserve and haircut maths; the USDG index; the oracle basis; and the timing edges between deposits, fills, exercise and redemption.

## Internal audit, 2026-09-13

An internal multi-agent audit ran on the pre-redesign checkpoint `25f4328`: 38 agents, 20 raw findings, 5 confirmed with proofs of concept (`SECURITY.md` §4, "The 2026-09-13 audit"). Every proof of concept is now a regression under `test/regression/` asserting the fixed behaviour; where the loss lived in Valorem's assignment engine, the regression runs on the real clearinghouse bytecode.

| ID | Severity | Finding | Fix |
|---|---|---|---|
| AF-01 | High | Anyone could take the in-the-money value of the vault's unsold calls by writing the same option id and exercising, steerable to all of the unsold inventory. | Write on fill (above). `test/regression/AF01_UnsoldInventory.t.sol` |
| AF-02 | Medium | A USDG pause or freeze in an assigned week reverted `rollClose`, the only exit from an open week, freezing all principal and the queue. | The close strands the claim instead; anyone can retry. `test/regression/AF02_UsdgFreezeRollClose.t.sol` |
| AF-03 | Medium | `completeRedeem` paid NVDA and USDG together, so a USDG pause or freeze held settled queuers' principal. | The NVDA leg is paid on its own; the USDG leg is deferred if it cannot move. `test/regression/AF03_CompleteRedeemLegs.t.sol` |
| AF-04 | Low | With Valorem's engine fee on, a maximum-size write could take the fee out of NVDA reserved for settled redeemers. | Utilisation ceiling 9,985 bps, the fee valued inside the fill floor, and a post-write reserve check. `test/regression/AF04_FeeSizing.t.sol` |
| AF-05 | Low | A saturating NAV hid an issuer burn, deposits stayed open, and later depositors funded earlier redeemers first come, first served. | Honest NAV, one deposit gate that also closes below the reserve and below a share-price floor, and a pro-rata reserve haircut. `test/regression/AF05_BurnShortfall.t.sol` |

## Earlier reviews, 2026-09-12 and 2026-09-13

An internal adversarial review on 2026-09-12 covered 13 surfaces (the vault core, share accounting, the phase machine and reentrancy, the Valorem and Seaport adapters, the order library, the distributor, access control, token integration, USDG distribution, economic and MEV behaviour, and the keeper, indexer and web surfaces). It raised 72 raw findings, of which 51 survived adversarial refutation (`SECURITY.md` §4). The contract fixes it produced, in their current form:

| Severity | Class of defect | Fix now in the code |
|---|---|---|
| Critical | **Pricing new shares against a NAV that assignment had already written down.** Valorem takes collateral on exercise with no callback, so `totalAssets()` fell mid-transaction while the strike USDG stayed in the claim. With the vault still `Listed` during the exercise window, anyone could exercise, mint cheap shares, and collect strike proceeds at the close. | Deposits close at `cycleExerciseTs` whether or not `lockBook` is called, and are also refused whenever unredeemed assignment proceeds exist |
| High | **Unbounded cycle length.** Collateral could have been locked in Valorem for years. | `MAX_CYCLE_TENOR = 21 days`, compiled in; the arm gate reverts `BadCycleWindow` |
| High | **A cycle window that differed from the option's.** It would have broken the deposit gate's premise. | Superseded by the redesign: the vault takes the window from the option type itself and bounds it at the arm |
| Medium | **Liveness tied to a token transfer.** A hard fee transfer inside `rollClose` could have frozen the close, the queue and every future cycle. | Best-effort fee payment, `pendingFeeUsdg`, permissionless `sweepFee()` |
| Medium | **A governance switch that could not work.** Accepting Valorem's engine fee still failed, because the approval did not cover the fee charged on top of collateral. | The write approves collateral plus fee and resets the allowance afterwards |

Writing the first version of these docs on 2026-09-13 surfaced two more defects, each verified with a proof of concept and fixed: **one contract must be exactly one token** (a larger lot would have been priced per token but written in the money; `test/unit/VaultLotSize.t.sol`), and **each queue entry is paid its own escrow USDG** (a later queuer could take most of an earlier queuer's premium; `test/unit/VaultQueueFairness.t.sol`). A second pass the same day added the permissionless `settleQueue()` for queues made while flat, documented the keeper's pricing leak, and fixed several issues against its own first drafts. The mechanisms from that pass that the redesign removed (tranche writes, price-cut listing slots, a permissionless stale-listing kill) are kept in `SECURITY.md` §4 as history.

## Properties enforced in bytecode

These are checks in the contract code, not operating conventions (`SECURITY.md` §2, checked against `src/`):

- **Hard policy caps.** `Policy.validate` runs at construction and on every `setPolicy`: `minOtmBps >= 100`, `maxOtmBps <= 2500`, `minPremiumBps >= 10`, `maxUtilizationBps <= 9985`, `protocolFeeBps <= 2000`, `maxContractsCap != 0`. `maxPriceAge` is bounded to 1 hour through 7 days. At most 3 listings per cycle.
- **The vault never holds an unsold call.** Nothing is written at `rollOpen`; `authorizeOrder` writes exactly what Seaport is moving to a buyer; `validateOrder` reverts the fill if anything stayed behind. The vault is assigned on at most what it sold.
- **Only Seaport can make the vault write, and only for its own live listing.** Both hooks refuse any caller but Seaport; `authorizeOrder` refuses any order whose hash is not `listingHash` or whose offerer is not the vault.
- **The arm gate.** An option type must be an option (not a claim or unknown id), on NVDA and USDG, one token per contract, with exercise at least 1 hour away, a window of at least 1 day, expiry at most 21 days away, the engine fee off or accepted, a live oracle, and a strike inside the band on both bounds.
- **The fill gate, at the fill's own spot.** A fill is refused at or after `cycleExerciseTs`, while halted, with the engine fee on and unaccepted, on a paused or stale oracle, with the strike below the band floor, with the premium under the floor at live spot (plus the engine fee valued at spot when on), or past the size caps. After the write the NVDA balance must still cover `reservedAssets`.
- **The protocol fee never touches strike proceeds.** `rollClose` and `retryStrandedClaim` pass the USDG measured coming out of the claim to the harvest as fee-free. That exclusion is code, not a policy field. See [Accounting](accounting.md#the-fee-formula).
- **One deposit gate.** Deposits close at the exercise timestamp, while assignment proceeds are unredeemed, while a claim is stranded, while the NVDA balance is below the reserve, below the share-price floor, and after a fill in the same transaction. `maxDeposit` quotes 0 on exactly the same conditions. See [Accounting](accounting.md#the-deposit-gate).
- **The close never depends on the claim redeeming.** A redeem that a token issuer makes revert strands the claim; the vault still reaches `Idle`, and anyone can retry. A gas-starved close cannot fake a strand.
- **A settled redeemer's NVDA leg is paid whatever USDG is doing.** The USDG leg is best-effort and stays booked if it cannot move. An unbacked reserve is shared pro rata.
- **A queue made while flat can always be settled.** `settleQueue()` is permissionless in `Idle`, moves no tokens, and pays the instant-redeem price.
- **Each queue entry is paid the USDG its own escrowed shares earned,** not a pro-rata slice of what other entries earned.
- **The fee payment cannot freeze the close.** `_tryPayFee` uses a raw call, clamped to balance, and changes state only on success. `sweepFee()` always pays the stored `feeRecipient`.
- **Payouts are clamped to what is backed.** Holder claims and the queue's USDG are limited to the balance minus the queue reserve and pending fee. USDG accounting is anchored on the measured `usdgAccounted`.
- **Share maths rounds in the vault's favour,** and the queue's asset leg uses the same +1/+1 offset as instant redemption.
- **No role can transfer vault tokens.** The vault moves tokens only in these cases:
  - to a receiver named by a share owner or approved spender (`redeem`, `withdraw`, `completeRedeem`, `claimUsdg`)
  - into Valorem, inside a fill, for exactly that fill's collateral (plus the engine fee, if accepted)
  - to a Seaport buyer, the calls written for that buyer's fill
  - to the stored `feeRecipient`, for the protocol fee
- **The price feed is not on any settlement path.** It is read only at the arm, at the listing, at every fill, and in the `spotUsdg()` view.
- **The thirteen invariants** in `test/invariant/VaultInvariant.t.sol` are asserted by the stateful suite. See [Accounting](accounting.md#the-invariants).

## What each key compromise buys

Full detail on Stonkhouse's own roles is on [Roles and admin powers](roles.md). The rows below follow `SECURITY.md` §3, restated for the key holders and policy live on 2026-09-15.

| Key | Powers | Worst case |
|---|---|---|
| Keeper (hot EOA `0x06c1…C1d2`) | Choose and arm the option type inside the arm gate; propose every listing's price and size up to capacity; cancel; call the rolls | **Value leakage, not only a wasted week.** It can arm the lowest in-band strike and list the whole capacity at exactly the premium floor to a buyer it controls, and the buyer's fill (which is what writes) can follow immediately. At the live policy (strikes at least 3% above spot, premium floor 0.10% of spot notional) that moves about **1.45% of the sold notional per week** to that buyer at 50% implied volatility (about 3.0% at 80%), repeated every week until someone halts. It cannot move a token, sell above the strike, list past `cycleExerciseTs`, or write outside the band and the caps. |
| Admin (hot EOA `0xEb82…9d9b` holding `DEFAULT_ADMIN_ROLE`; no timelock) | Policy inside the caps, the fee recipient (today itself), Valorem fee acceptance, the deposit cap, `maxPriceAge`, halt and unhalt, role grants, all from one key | Everything the keeper row has, and worse: `setPolicy` to the compiled floors, grant itself `KEEPER_ROLE`, then arm, list and sell to itself within a block or two, about **2.2% of the sold notional per week** at 50% implied volatility (about 3.9% at 80%), plus a protocol fee of up to 20% on whatever premium is left, routed where it likes. It can accept the Valorem engine fee on the vault, but it does not hold the clearinghouse's switch (next row but one). No vault function transfers a token to it. |
| Guardian (EOA `0x2974…6F39`) | `haltWrites` (arms, listings and every fill), `cancelListing`, `invalidateAllListings` | Sales stopped and listings killed until the admin acts. Exits and settlement keep working. It cannot unhalt. |
| Anyone | `lockBook`, `rollClose` after expiry + 1 hour, `settleQueue`, `retryStrandedClaim`, `sweepFee`, buying through Seaport, writing the same option id on Valorem and exercising | Settling a flat queue at the instant-redeem price; a fill at the listed price inside the fill gate; being assigned alongside the vault pro rata on what the vault sold. None moves value from depositors beyond the priced covered call. |
| Valorem clearinghouse `feeTo`: a 1-of-1 Safe `0xff14…CF61` whose single owner is the EOA `0x7A3a…2C32` | The 15 bps engine fee switch, fee sweeps to the Safe, nominating a new `feeTo` (no event), the token URI generator. The clearinghouse has no owner, no pause, no blocklist and no proxy. | Alone: the fee switched on, so the vault refuses to arm or fill until the admin accepts it or the switch goes off, and every exerciser pays 15 bps of the strike in USDG on top. Together with the admin's acceptance: every fill pulls **15 bps of its notional in NVDA** from the vault to the Safe, compensated to depositors only through a higher fill floor paid by the buyer, about 0.14% of NAV a week with 95% of NAV sold. Nothing else on collateral. Upstream Valorem is dormant (last commit 2023-11), so there is no patch path, bounty or incident response behind the clearinghouse. |
| Seaport 1.6 | No admin, not upgradeable, no pause, no fee switch; the conduit key is zero, so no conduit owner has power | None beyond the verified Seaport 1.6 hook order the design rests on. `Verify.s.sol` pins the runtime hash. No public audit of the 1.6 hook code was found. |
| USDG issuer (Paxos). **One EOA holds every operational power with no timelock** | Instant `pause()`; instant freeze and wipe of any address, enforced on sender, recipient and spender (27 freezes on chain 4663 and none lifted, per `SECURITY.md` §3); can grant itself the power to burn USDG from any non-frozen address in two transactions; proposer and executor of the 24-hour timelock that gates upgrades | Premium and strike proceeds in the vault, in the clearinghouse and owed to the queue can be frozen, wiped or burnt at any moment. The Stock Token is never touched. The contracts make sure it never traps anyone: the close strands rather than blocks, the NVDA leg of a queued exit is paid whatever USDG does, and the fee payment is best-effort. A wipe re-anchors the USDG accounting to the lower balance (accepted). |
| NVDA Stock Token issuer (13 registry roles, each held by one EOA, none behind a multisig or timelock) | `adminBurn` from any address, working even on a paused token or a blocklisted holder; registry-wide and per-token pause; a per-address blocklist; `pauseOracle()`; multiplier updates that can decrease and apply immediately; a beacon upgrade of all Stock Tokens in one transaction; under the prospectus, termination of the Series on 30 calendar days' notice | Vault NVDA destroyed (honest NAV, deposits closed, pro-rata reserve haircut); every NVDA-moving leg stopped (fills, the redeem's NVDA leg, `completeRedeem`'s NVDA leg, instant redemption); the band priced on a stale per-token basis for the hours a multiplier step leads the feed; or a terminated Series the vault holds with no redemption path. Disclosed, not coded around: that is the asset. |
| Robinhood Chain (a single sequencer) | Transaction ordering; compliance filtering that can drop any transaction touching a restricted address; force inclusion through Ethereum only after 4 days, and whether force-included transactions are also filtered is unknown for chain 4663; the L1 Security Council can change chain rules without delay | If the vault, a depositor, the keeper or Seaport is restricted, nothing the vault does helps. A censoring sequencer can delay `rollClose` and every exit for as long as it censors. There is no sequencer uptime feed on chain 4663, and a 4-day `maxPriceAge` does not notice an outage shorter than that. |
| Chainlink feed owner (a 4-of-9 Safe) | Rotate the aggregator behind the RHNVDA/USD proxy, or put a read allowlist in front of it (`ops/recon/R5-price-feed.md` in the app repository) | Arms, listings and fills stop (a reverting or stale price fails closed). Settlement never reads the feed. Separately, a wrong but fresh answer is not caught: the vault rejects only a zero or negative answer, so a moderately wrong price mis-sets the band and premium floors. One far too high stops sales, because the strike falls under the band floor. One far too low does not fail closed: it lowers both floors, so live listings still fill at their price and a new listing could be authorised at almost any price. |

**How the leakage figures are computed.** Black-Scholes value of a 7-day call at zero rates, strike at the band floor, as a share of spot, minus the policy premium floor (`SECURITY.md` §3). A 3%-out-of-the-money call is worth about 1.55% of spot at 50% implied volatility and 3.14% at 80%; a 1% one, about 2.30% and 3.96%. The keeper row subtracts the live floor of 0.10%, and the admin row the compiled floor, also 0.10%. The buyer's expected profit is the vault's expected loss, paid out through assignment and a share price that falls on assigned weeks. Nothing on chain notices a sale at the floor, so the figure repeats every undetected week, and no alert is sent when it happens (see [Status](#status)).

**Mitigations considered and not implemented** (`SECURITY.md` §3): an admin timelock; higher compiled floors for the strike band and premium; a listing start delay that would give the guardian time to react; and holding the deposit cap at zero until the Safe handover (the cap is 20 NVDA while the admin is still a hot key). The keeper now prices each week from Cboe's delayed NVDA option quotes by default, which puts its own asks above the floor, but that is operating behaviour of the keeper, not a bound the contracts enforce, and a compromised keeper key is not bound by it.

Depositor-level disclosure of these risks is on [Risks](../product/risks.md).

## Test evidence

Everything here was run locally by the team. The GitHub Actions account currently fails before any step runs, so CI has confirmed nothing independently (`README.md`, "CI"). None of it is an audit.

- **Unit, regression and invariant tests: 405 tests in 24 suites, all passing, offline** (`forge test --no-match-path 'test/fork/*'`, measured 2026-09-14 at commit `bec4dbd`; `README.md`, `docs/AUDIT-SCOPE.md` §6). They include the five 2026-09-13 audit proofs of concept and the 2026-09-14 L-01 proof of concept re-asserted as fixed behaviour, several of them on the real Valorem clearinghouse bytecode; the real Seaport 1.6 runtime from chain 4663 driven through `fulfillOrder`, `fulfillAdvancedOrder`, `fulfillAvailableAdvancedOrders` (the same listing twice, and a refused hook), `matchAdvancedOrders`, `fulfillBasicOrder` and a hostile contract buyer (`fulfillAvailableOrders` and `matchOrders` are not tested); and a stateful campaign of 64 runs at depth 600 with a third-party writer and exerciser in the vault's option series, an issuer burn, USDG pause and freeze, and an NVDA blocklist, asserting thirteen invariants after every call.
- **Fork tests against live chain 4663: 20 tests** (`test/fork/ForkLive.t.sol`; `docs/AUDIT-SCOPE.md` §6). They deploy their own vault on the fork, wired to the live Seaport 1.6, NVDA, USDG and price feed and to Overcall's Valorem clearinghouse `0x9a7b…C0C0`, whose runtime equals Stonkhouse's own apart from metadata; they do not touch the live vault or Stonkhouse's clearinghouse `0x53d7…C6`. They cover code presence, versions and decimals at the addresses they use, the Seaport runtime hash, that clearinghouse's fee switch, feed liveness and normalisation, a first fill and a top-up fill through the live Seaport and that clearinghouse, the arm gate refusing an out-of-band strike and a claim id, an assigned week exercised by the buyer and closed by a stranger with assignment equal to what was sold and the strike credited fee-free, an unfilled week closing flat, and a stranded close under the real USDG freeze role with `retryStrandedClaim` recovering it after the unfreeze.

  **Not covered on the fork:** distribution and claims beyond the close's harvest, an NVDA-side strand (the blocklist role is not impersonated), and several writers in one Valorem bucket on the live clearinghouse (that runs on the real bytecode in the regression suite instead).
- **Keeper fork rehearsal, 2026-09-15 UTC.** The keeper, as it was before vol pricing (a strike 5% above spot and an ask 1% over a 0.40% floor), drove three weeks and a fourth arm on an anvil fork of chain 4663, against the real Valorem clearinghouse, Seaport 1.6, NVDA and USDG, with the price feed mocked at the live answer (`keeper/DRYRUN.md` in the app repository, whose heading gives the US date, 2026-09-14):
  - Week 1: listed 23 contracts, nobody bought; closed flat; instant redemption and `settleQueue` while flat.
  - Week 2: two fills of 2 and 3 contracts (462,677 and 289,157 gas), the vault holding no option tokens after either; a deposit while `Listed`; 2 contracts exercised; the close credited 446 USDG of strike proceeds fee-free.
  - Week 3: a fill, 1 contract exercised, then USDG's freeze role froze the vault; the close stranded the claim, a retry reverted while frozen, and the retry after the unfreeze redeemed it and paid the queuer's share.
  - A separate extended run covered partial fills, a guardian cancel, a 1.5% rally that made a fill revert `PremiumBelowFloorAtFill` until the keeper repriced, a halt, the three-listing budget, several exercisers, a role-less `rollClose` refused until exactly expiry + 1 hour, and Valorem's fee switch turned on and accepted.

  Not proven by these runs: an NVDA-side strand, several writers in one Valorem bucket, a rally past the band floor, and the real Chainlink feed after a time warp.
- **Deploy rehearsal.** The full flow (deploy Stonkhouse's own clearinghouse, deploy, verify, configure, verify, admin handover to a Safe) passed on an anvil fork with the chain's 98,304-byte code limit and real Safes on 2026-09-13, with `Verify.s.sol` checks that fail on purpose (`docs/DEPLOY.md`, "Rehearsal record"). It does not prove the Safe{Wallet} UI, hardware signing, or source verification on the live chain.

**What none of this proves** (`docs/AUDIT-SCOPE.md` §6). No external review has been done. Every real-clearinghouse and real-Seaport result is against bytecode taken from chain 4663 at one point in time, and the fork suite ran against the live chain at one block.

## Open questions

1. **The keeper's margin over the floor can be thin.** In production the keeper asks the larger of the premium floor raised by 0.5% of itself (`KEEPER_PREMIUM_MARGIN_BPS` = 50) and Cboe's delayed fair value plus 10%. When the fair value is the smaller, a rally of more than about 0.5% between the listing and a fill puts the ask under the fill-time floor, so the fill reverts until the keeper reprices, and each reprice spends one of three listings a week. Week 1 has already used two of its three.
2. **Gas cost of the deposit-time harvest checkpoint.** Not yet measured live: no fill has happened, so no deposit has checkpointed any premium.
3. **The open mitigations in the trust table**: an admin timelock, higher compiled floors, a listing start delay, and no deposits before the Safe handover.

## Reporting a vulnerability

Do not open a public issue.

Send reports to **security@stonkhouse.fun**. The same address is published at `https://stonkhouse.fun/.well-known/security.txt` (RFC 9116). Do not rely on addresses found elsewhere.

There is no bug bounty, and the contracts have had no external audit.

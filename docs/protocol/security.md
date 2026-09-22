# Security

Read the v2 review status and the risks the contracts cannot remove before depositing or buying a contract.

{% hint style="warning" %}
Stonkhouse v2 is unaudited. Interface v8 is deployed on Robinhood Chain 4663 from block 69,512,673 (22 September 2026); the launch markets are NVDA and SPCX. Registered markets can change; check the current app and on-chain status before trading. Operational services and market liquidity may be unavailable. Stock Tokens carry market and issuer risks. Buyers can lose their full cost; writers can lose collateral. Stonkhouse is not available to US persons. Read [Risks](../resources/risks.md) before using the product.
{% endhint %}

{% hint style="danger" %}
Privileged calls run through an `AccessManager`. Every delayed role sits with one 2-of-3 Admin Safe; a 2-of-3 Treasury Safe receives the protocol's money and holds no role at all. All three signing keys of each Safe are the owner's. The guardian, pricer, quoter and buyback roles are hot keys with no delay at all, and the Admin Safe also holds the guardian and quoter roles, and the operations role that rotates those keys, with no delay. A scheduled fee, configuration, treasury or listing change can be cancelled by the guardian during its waiting period; a scheduled role or mapping change cannot. Verify current role holders before funding a position.
{% endhint %}

Where the prose and the code disagree, the code is the specification. The current contracts are a fresh interface-8 deployment on Robinhood Chain 4663, broadcast from block 69,512,673 on 22 September 2026, with every privileged call gated by an `AccessManager`. The interface-7 set from the 18 September 2026 dev launch is the legacy deployment: it is still on chain, still accepts new series and has not been frozen. Neither set has been audited.

## Review status

| Check | V2 status |
|---|---|
| External audit | None. The v2 contracts are unaudited. No report is available. An audit is planned once total value locked reaches 1,000,000 USDG, and no firm has been commissioned; do not read the plan as a pending engagement. |
| Internal tests | The contracts repository carries Foundry unit, regression, fuzz, invariant, integration and chain-4663 fork suites, an access-matrix test that pins every restricted function to the role the deployment manifest names, and a test that pins the constants the contracts' own design documents cite. Those tests cover the contracts and the contracts' own documents. Nothing checks these pages automatically, so read a value on chain before you act on it. |
| Integration | `LifecycleTest` exercises calls and puts from series creation through payout; stateful invariants exercise balances under pauses, issuer faults and oracle failures. |
| Deployment | The current set is a fresh interface-8 deployment, broadcast from block 69,512,673 on 22 September 2026, at [these addresses](addresses.md); the house vaults and the earn vault followed at blocks 69,517,900 and 69,518,125. Its source is the public `callhouse-contracts` release `70dd0c7`, whose `src/` tree is byte-identical to the private revision the broadcast ran from. The deployer's verifier passed 216 on-chain checks at the launch gate and 208 again on a read-back, leaving three undeployed external dependencies unchecked. NVDA and SPCX are registered and enabled for series creation, but the house vaults are not yet armed and the protocol's own accounts hold no USDG, so whether you can get a quote or a fill is a live question: read the Clearinghouse and the app before relying on it. That verifier is the deploying team's own script, not a third-party audit, and no explorer source verification is established here. The 13-contract interface-7 dev-launch set is the legacy deployment; its 121-check verifier result and its `1b08755` source pin describe that set, not this one. |
| Bug bounty | None announced. Reports go to the security contact below. |

Tests demonstrate the cases they cover; they do not establish that the contracts or external dependencies are free of vulnerabilities. The earlier v1 vault's internal reviews do not audit v2.

The contracts include a collateral-rent dial registered at zero, stale auto-roll cancellation, a vault outflow cap, a role manager with per-role delays and a fee splitter that buys back the token. Their presence does not establish audited security or complete consumer and keeper coverage. The current contracts are a fresh deployment, not a re-designation of the dev-origin set: every privileged call runs through one `AccessManager` with per-role waiting periods, and the deployer holds no role once it has handed over (see [Roles](roles.md)). The legacy dev-origin contracts keep their original per-contract roles and settings through their run-off. Confirm each current market and service separately before relying on it.

## Risks that remain

- **Privileged roles.** Scheduling a change is delayed, not prevented: the configuration role can set what future series pin, move current spot and change payout routes after 24 hours, the fee role can announce book fees after 48 hours, and market fees and the rent dial wait 72 hours. A stuck price can be resolved from 48 hours after expiry. A live series keeps its pinned settlement sources and rules. A listed source's pin failure blocks the first series of an expiry or adoption of a pin after Clearinghouse migration; later series on that pinned expiry reuse it. Two agreeing sources pinned before creation can still finalise without a guardian delay. If no pinned source ever answers, `adminResolve` can set any positive price after 48 hours. After seven days, a Held expiry with exactly one recorded usable price can be resolved within 0.8× to 1.25× that price, and the operations role can grant the guardian key that places that hold with no delay. This creates a wider price-setting risk for single-source expiries.
- **Stock Token issuer.** Pauses, blocklists, burns, multiplier changes and upgrades can stop or reduce withdrawals and payouts. A ledger credit records a claim but cannot force the issuer to honour it.
- **USDG issuer.** A pause, freeze, wipe or burn can stop or shrink put collateral, bid escrow, owed balances, bounty budgets and USDG payouts.
- **Sequencer.** Robinhood Chain 4663 has one sequencer and no uptime feed. Censorship or an outage can delay fills or miss the pool's 10-minute snapshot grace.
- **Oracle precision.** A valid push-feed print can lag the market near a strike; the final 30-minute average may differ from an official close. A single source or disagreement waits through the candidate delay but can still produce an unfavourable final price.
- **Liquidity and conversion.** Pool liquidity can leave. An in-the-money call may pay Stock Tokens when conversion fails; a successful swap can be below settlement value within the protocol's base bound plus that route's pool fee, subject to a 300 bps total ceiling. The payout route can change before redemption.
- **Keeper liveness.** Lifecycle calls are permissionless, but someone must send them and pay gas. A missing keeper delays settlement, redemption and fee distribution; it does not change token ownership. Bounties are paid out of the keeper-rewards balance, which holds no USDG today, so a lifecycle call earns nothing until the treasury funds it.
- **Buyback and burn.** The buyback key can only spend the splitter's accumulated USDG on the token, under a per-call cap and a five-minute cooldown, and cannot change the cap, the burn share or the venue. A thin venue can still make a buy expensive, and the mechanism moves protocol revenue rather than adding any.
- **Fees and book execution.** A book-fee change is announced 48 hours before it takes effect, after the 48 hours its own role waits before it can be sent. A pending change can be replaced or cancelled; makers can cancel or replace orders during the notice. Resting orders use fees effective at their fill, and a taker's price limit does not cap its fee: `TakeParams.maxTotalFee` is what caps it, and the field fails closed. It is checked once the final fee is known and before any USDG moves, so a take that leaves it at 0 reverts `FeeAboveMax` the moment any fee is due. Only `type(uint128).max` means no limit and pays whatever is effective when the take is mined. When you sell into bids the cap covers your own seller fees as well as the taker fee; `quoteTake` returns both so you can size it, but the quote does not enforce it. The sequencer's order decides which competing take reaches an order first.
- **Rent and writer liquidity.** Both launch markets are registered with a collateral-rent rate of 0, so no mint on the current contracts charges rent today. The rate is a live dial: raising it waits 72 hours and then reaches only series created afterwards, while already created series keep the rate pinned at their creation. At a non-zero rate, rent would be charged whenever a fill mints, in Stock Tokens for calls or USDG for puts, could make a write-on-fill ask unfillable when free collateral lacks headroom, and would leave a treasury balance in each affected token. The legacy contracts are a separate case: their NVDA market still charges 80 parts per million of collateral per seven days. Read the rate on the ticket rather than assuming it is still zero.
- **Stale-ask cancellation.** Anyone can cancel a tracked auto-roll ask after a fresh oracle spot reaches its strike, and the pricer cannot reprice that ask while it is in the money. A fill may occur before the cancellation transaction, or after an off-chain price move that the oracle has not yet printed. An oracle pause, stale feed or missing keeper can delay cancellation. A cancelled ask is not replaced within the same expiry period, so the writer may miss premium.
- **Vault outflow cap.** The cap limits net USDG paid through quoter calls with a 24-hour refill; a full budget plus refill can allow about twice the cap over 24 hours. It does not limit option value sold or settlement losses. Legitimate bids can be throttled. No caller is exempt, the Safes included; the maker vault's treasury withdrawals are not counted against the cap because they can only pay the Treasury Safe.

See [Roles](roles.md) for the exact functions and compiled bounds, [Oracle and settlement](oracle-and-settlement.md) for the fallback paths, and [Risks](../resources/risks.md) for buyer and writer outcomes.

## Reporting a vulnerability

Email **security@stonkhouse.fun**. Do not open a public issue or send exploit details to a public channel. There is no bug bounty.

## Related

* [Risks](../resources/risks.md)
* [Roles](roles.md)
* [Oracle and settlement](oracle-and-settlement.md)
* [Addresses](addresses.md)

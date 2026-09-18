# Security

Read the v2 review status and the risks the contracts cannot remove before depositing or buying a contract.

{% hint style="warning" %}
Stonkhouse v2 is unaudited. The chain-4663 contracts first deployed for the dev launch are the live public contract set. Only NVDA is registered; other markets remain planned. Operational services and market liquidity may be unavailable. Stock Tokens carry market and issuer risks. Buyers can lose their full cost; writers can lose collateral. Stonkhouse is not available to US persons. Read [Risks](../resources/risks.md) before using the product.
{% endhint %}

{% hint style="danger" %}
The live v2 deployment retains the original dev-launch hot admin key without a timelock. It can change future series terms and rent rates, set a stuck settlement price under contract rules, and act outside the maker-vault outflow cap. Verify current role holders before funding a position.
{% endhint %}

Where the prose and the code disagree, the code is the specification. The owner has designated the existing chain-4663 deployment as the live public contract set; this is a change in release status, not a new deployment or an external audit.

## Review status

| Check | V2 status |
|---|---|
| External audit | None. The v2 contracts are unaudited. No report is available. |
| Internal test gate | Foundry build, formatting, unit, regression, fuzz, invariant and chain-4663 fork tests. `V2DocsNumbersTest` asserts the numbers used in these docs. |
| Integration | `LifecycleTest` exercises calls and puts from series creation through payout; stateful invariants exercise balances under pauses, issuer faults and oracle failures. |
| Deployment | The 13-contract chain-4663 set first deployed for the dev launch is the live public set, at [these addresses](addresses.md). The recorded post-deploy verifier passed 121 on-chain checks; a fresh read found code at all 13 and NVDA enabled and unpaused. The live bytecode matches frozen dev source `1b08755` outside immutables, but public contracts `main` differs for `UniV3TwapSource`. No explorer source verification is established here. |
| Bug bounty | None announced. Reports go to the security contact below. |

Tests demonstrate the cases they cover; they do not establish that the contracts or external dependencies are free of vulnerabilities. The earlier v1 vault's internal reviews do not audit v2.

The deployed interface v7 includes collateral rent, stale auto-roll cancellation and a vault outflow cap. Their presence does not establish audited security or complete consumer and keeper coverage. The first public contract set was not a fresh production redeployment: it is the existing dev-origin set, with its original roles and configuration. Confirm each current market and service separately before relying on it.

## Risks that remain

- **Admin key.** One hot admin key without a timelock can set the configuration pinned by future series, move current spot, change payout routes, announce book fees and resolve stuck prices after 48 hours. A live series keeps its pinned settlement sources and rules. A listed source's pin failure blocks the first series of an expiry or adoption of a pin after Clearinghouse migration; later series on that pinned expiry reuse it. Two agreeing sources pinned before creation can still finalise without a guardian delay. If no pinned source ever answers, `adminResolve` can set any positive price after 48 hours. After seven days, a Held expiry with exactly one recorded usable price can be resolved within 0.8× to 1.25× that price; the admin can grant itself the guardian role to place that hold. This creates a wider price-setting risk for single-source expiries.
- **Stock Token issuer.** Pauses, blocklists, burns, multiplier changes and upgrades can stop or reduce withdrawals and payouts. A ledger credit records a claim but cannot force the issuer to honour it.
- **USDG issuer.** A pause, freeze, wipe or burn can stop or shrink put collateral, bid escrow, owed balances, bounty budgets and USDG payouts.
- **Sequencer.** Robinhood Chain 4663 has one sequencer and no uptime feed. Censorship or an outage can delay fills or miss the pool's 10-minute snapshot grace.
- **Oracle precision.** A valid push-feed print can lag the market near a strike; the final 30-minute average may differ from an official close. A single source or disagreement waits through the candidate delay but can still produce an unfavourable final price.
- **Liquidity and conversion.** Pool liquidity can leave. An in-the-money call may pay Stock Tokens when conversion fails; a successful swap can be below settlement value within the protocol's base bound plus that route's pool fee, subject to a 300 bps total ceiling. The payout route can change before redemption.
- **Keeper liveness.** Lifecycle calls are permissionless, but someone must send them and pay gas. A missing keeper delays settlement and redemption; it does not change token ownership.
- **Fees and book execution.** A book-fee change is announced 24 hours before it takes effect. A pending change can be replaced or cancelled; makers can cancel or replace orders during the notice. Resting orders use fees effective at their fill, and a taker's price limit does not cap its fee. A take submitted before activation but mined after it can pay the new fee. The sequencer's order decides which competing take reaches an order first.
- **Rent and writer liquidity.** The admin may change a market's collateral-rent rate for new series without a delay; already created series keep their rate. Rent is charged on every mint, in Stock Tokens for calls or USDG for puts, and can make a write-on-fill ask unfillable when free collateral lacks headroom. The rent can exceed the premium from a cheap ask; a direct pre-mint pays it even if the long never sells. A pre-expiry close returns unused rent to the closer, who may differ from the original writer; at or after expiry there is no refund. Stock Token rent also creates a treasury balance in each affected token.
- **Stale-ask cancellation.** Anyone can cancel a tracked auto-roll ask after a fresh oracle spot reaches its strike, and the pricer cannot reprice that ask while it is in the money. A fill may occur before the cancellation transaction, or after an off-chain price move that the oracle has not yet printed. An oracle pause, stale feed or missing keeper can delay cancellation. A cancelled ask is not replaced within the same expiry period, so the writer may miss premium.
- **Vault outflow cap.** The cap limits net USDG paid through quoter calls with a 24-hour refill; a full budget plus refill can allow about twice the cap over 24 hours. It does not limit option value sold or settlement losses. Legitimate bids can be throttled. Treasury admin actions are exempt; the quoting key must not also hold the admin role.

See [Roles](roles.md) for the exact functions and compiled bounds, [Oracle and settlement](oracle-and-settlement.md) for the fallback paths, and [Risks](../resources/risks.md) for buyer and writer outcomes.

## Reporting a vulnerability

Email **security@stonkhouse.fun**. Do not open a public issue or send exploit details to a public channel. There is no bug bounty.

## Related

* [Risks](../resources/risks.md)
* [Roles](roles.md)
* [Oracle and settlement](oracle-and-settlement.md)
* [Addresses](addresses.md)

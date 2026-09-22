# Market makers

Understand maker quotes, rebates, scorekeeping, and the protocol-owned maker vault.

{% hint style="warning" %}
Stonkhouse v2 is unaudited. Interface v8 is deployed on Robinhood Chain 4663 from block 69,512,673 (22 September 2026); the launch markets are NVDA and SPCX. Registered markets can change; check the current app and on-chain status before trading. Operational services and market liquidity may be unavailable. Stock Tokens carry market and issuer risks. Buyers can lose their full cost; writers can lose collateral. Stonkhouse is not available to US persons. Read [Risks](../resources/risks.md) before using the product.
{% endhint %}

## Rebates and public scores

A resting maker order can receive a share of the taker fee when it fills. The default rebate share is 50% of the fee attributable to that maker's fill. The fee-manager role can assign a different tier through `MakerRegistry` under the book's hard limits, and that change waits 48 hours before it can be sent. A tier does not make an order fill, and a rebate is never more than the taker fee paid for that execution. [Fees](../product/fees.md) shows the buyer and seller charges separately.

The `/makers` page shows the latest weekly epoch's public score and underlying measurements: two-sided quote uptime, spread, depth near the reference price, fills, volume, rebates, and tier. Epochs start Monday 00:00 UTC. The score combines two-sided uptime, depth inside the epoch's scoring band and tighter spreads, each with a weight set by the epoch's scoring policy. That policy can change between epochs, and the band a figure was measured under is published with the epoch; the weights are policy rather than an API field, and under the current policy filled volume is shown but carries no weight. The depth column is a fixed 100 basis point statistic and is not the depth the score ranks. The reference price for a series comes from other participants' recent fills on that series, never from the maker's own orders, and a sample where you are quoting but no such reference exists counts as neither uptime nor downtime. These measurements describe observed quoting; they are not an expected return.

The operator may fund a separate USDG reward for an epoch. After it publishes an allocation file, the treasury role posts that file's Merkle root to `RewardsDistributor`; that call waits 24 hours before it can be sent. A maker can then check its proof against the on-chain root and claim. A score alone does not entitle a maker to a reward; an unfunded or unpublished epoch pays none. The posted root and claim status are checkable on chain.

## Protocol-owned quoting

Anyone can deposit USDG or Stock Tokens into `MakerVault`, and the protocol treasury is meant to fund it that way; a deposit is a one-way donation that gives the depositor no claim on the vault. Only the treasury role can withdraw from it or set its limits, and a withdrawal can only go to the protocol treasury. A limited `QUOTER` role places its orders, and a vault with no balance places none. The vault caps units per series and total notional, and bounds quotes against spot. The quoting key may move funds between the vault and its Clearinghouse ledger, place or replace orders, take within limits, and close pairs; it cannot withdraw treasury funds to itself.

The vault adds a **net USDG outflow cap**, set by the treasury role, to quoter-initiated bids, replacements and takes. Spending uses a budget that refills over 24 hours; cancelling a bid can restore budget. This is not a simple midnight reset or a cap on all possible trading losses. A full budget can be spent at once and refill during the next day, so net quoter outflow over 24 hours can reach about twice the stated cap. The cap does not bound the option value the vault sells, settlement losses, or issuer failures. No caller is exempt from the cap: the Admin Safe holds the quoting role as well as the treasury role, and its quoting calls are capped exactly like the quoting key's. The treasury lane (`withdraw`, `withdrawPosition`, `setLimits`, `setTreasury`) is not counted against the cap because it is not quoting and the only address it can pay is the treasury, so an exhausted budget never traps protocol funds. The vault may still lose money through trading, stale quotes, or issuer and oracle failures. Its presence does not promise a buyer liquidity at every strike or time.

When the vault writes an option it needs enough free Stock Tokens or USDG in that collateral asset for the locked collateral; at the registered 0 ppm rent rate there is nothing to fund beyond it. An exhausted outflow budget can reduce bids even while asks remain available.

## Related

* [Order book](order-book.md)
* [Fees](../product/fees.md)
* [Roles](../protocol/roles.md)
* [Risks](../resources/risks.md)

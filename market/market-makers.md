# Market makers

Understand maker quotes, rebates, scorekeeping, and the protocol-owned maker vault.

{% hint style="warning" %}
Stonkhouse v2 is unaudited. The chain-4663 contracts first deployed for the dev launch are the live public contract set. Only NVDA is registered; other markets remain planned. Operational services and market liquidity may be unavailable. Stock Tokens carry market and issuer risks. Buyers can lose their full cost; writers can lose collateral. Stonkhouse is not available to US persons. Read [Risks](../resources/risks.md) before using the product.
{% endhint %}

## Rebates and public scores

A resting maker order can receive a share of the taker fee when it fills. The default rebate share is 50% of the fee attributable to that maker's fill. The admin can assign a different tier through `MakerRegistry` under the book's hard limits. A tier does not make an order fill, and a rebate is never more than the taker fee paid for that execution. [Fees](../product/fees.md) shows the buyer and seller charges separately.

The `/makers` page shows the latest weekly epoch's public score and underlying measurements: two-sided quote uptime, spread, depth close to fair value, fills, volume, rebates, and tier. Epochs start Monday 00:00 UTC. The score weights eligible two-sided uptime **40%**, depth within 100 basis points of fair value **30%**, tighter spreads **20%**, and filled volume **10%**. Stale pricing samples are skipped rather than counted as maker downtime. These measurements describe observed quoting; they are not an expected return.

The operator may fund a separate USDG reward for an epoch. After it publishes an allocation file and posts that file's Merkle root to `RewardsDistributor`, a maker can check its proof against the on-chain root and claim. A score alone does not entitle a maker to a reward; an unfunded or unpublished epoch pays none. The posted root and claim status are checkable on chain.

## Protocol-owned quoting

The treasury can fund `MakerVault` to place orders through a limited `QUOTER` role. The vault caps units per series and total notional, and bounds quotes against spot. The quoting key may move funds between the vault and its Clearinghouse ledger, place or replace orders, take within limits, and close pairs; it cannot withdraw treasury funds to itself.

The deployed v7 vault adds an admin-set **net USDG outflow cap** to quoter-initiated bids, replacements and takes. Spending uses a budget that refills over 24 hours; cancelling a bid can restore budget. This is not a simple midnight reset or a cap on all possible trading losses. A full budget can be spent at once and refill during the next day, so net quoter outflow over 24 hours can reach about twice the stated cap. The cap does not bound the option value the vault sells, settlement losses, or issuer failures. Treasury admin actions are exempt, making separation of the admin and quoting keys important. The vault may still lose money through trading, stale quotes, or issuer and oracle failures. Its presence does not promise a buyer liquidity at every strike or time.

When the vault writes an option, it also needs enough free Stock Tokens or USDG for the mint rent **in that collateral asset**. Rent is not part of the vault's USDG outflow measure when held in the Clearinghouse ledger; an exhausted budget can reduce bids even while asks remain available.

## Related

* [Order book](order-book.md)
* [Fees](../product/fees.md)
* [Roles](../protocol/roles.md)
* [Risks](../resources/risks.md)

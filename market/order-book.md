# Order book

Read bids, resale asks, and write-on-fill asks, including why available size can change before a trade.

{% hint style="warning" %}
Stonkhouse v2 is unaudited. The chain-4663 contracts first deployed for the dev launch are the live public contract set. Only NVDA is registered; other markets remain planned. Operational services and market liquidity may be unavailable. Stock Tokens carry market and issuer risks. Buyers can lose their full cost; writers can lose collateral. Stonkhouse is not available to US persons. Read [Risks](../resources/risks.md) before using the product.
{% endhint %}

## Orders and execution

One on-chain OrderBook holds orders for every series. The app gathers each series' orders by price and shows how much can be bought or sold at each level. A **bid** escrows USDG and offers to buy a long. A **resale ask** escrows an existing long. A **write-on-fill ask** offers to mint a new long from the writer's free collateral only when a buyer takes it.

| Order | What is committed at placement | What happens on a fill |
|---|---|---|
| Bid | USDG for the quoted premium | The maker receives long tokens; the selling taker receives premium net of its fees. |
| Resale ask | Existing long tokens | The buyer receives those tokens; the seller receives premium net of any resale fee. |
| Write-on-fill ask | No collateral is escrowed and no rent is charged yet | The maker's free balance pays locked collateral **plus time-based rent** in the same asset; a new long/short pair is minted and the buyer receives the long. |

**Why a quote can vanish.** A maker can cancel, an order can fill, expire, or pass the writing cutoff. A write-on-fill maker can use its free collateral elsewhere, leaving too little for an earlier ask's collateral **and rent**. The indexer should hide such asks when it sees the shortfall, but the chain rechecks at execution. An auto-roll ask may also be cancelled after a fresh oracle spot reaches its strike; that requires a transaction and can arrive after a fill. The app re-reads chosen order ids and simulates the transaction before sending. A reverted transaction can still cost gas.

There is **no on-chain price-time priority**. The taker names the order ids it wants to hit, and the app normally picks the best prices first. Every execution calls `take` and pays the taker fee once per call. There is no fee-free on-chain crossing function. If bids and asks cross, arbitrageurs can take them in ordinary transactions; a resting crossing order does not automatically execute. The app can take an available better price first and rest only any remainder.

An admin book-fee change is announced 24 hours before it takes effect. A replacement schedule restarts that delay; scheduling the current fees cancels a pending change. An order that remains open uses the fees effective when it fills, including a change announced after placement. Makers can cancel or replace during the notice. A taker's price limit does not limit its fee, so recheck the ticket and pending fee schedule before signing; a take included after activation uses the new fee.

All book trading ends at the series expiry. New writing ends 30 minutes earlier. A holder can still transfer its ERC-1155 long token outside the book, subject to token and contract rules. An order's displayed depth is a quote, not a promise of a fill.

## Related

* [Selling before expiry](../buying/selling-before-expiry.md)
* [Setting your ask](../writing/setting-your-ask.md)
* [Fees](../product/fees.md)
* [Risks](../resources/risks.md)

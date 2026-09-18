# Selling before expiry

See how to accept a live bid or place a resale ask before a contract expires.

{% hint style="warning" %}
Stonkhouse v2 is unaudited and has no public production release. A separate chain-4663 dev deployment is for testing, not public trading. Stock Tokens carry market and issuer risks. Buyers can lose their full cost; writers can lose collateral. Stonkhouse is not available to US persons. Read [Risks](../resources/risks.md) before using the product.
{% endhint %}

## Two ways to sell a long

**Hit a bid.** Select a live bid on your series page or in Portfolio. You are the taker. You deliver your long tokens and receive the bid premium less the taker fee and any resale fee. Review the net amount and minimum fill before signing.

**List a resale ask.** Set your price, size, and expiry. You grant the OrderBook approval for all your Clearinghouse option tokens; when you list, it escrows only the selected longs. You can revoke approval later. The book holds those longs until someone buys or you cancel. You are the maker when a buyer takes the ask; the buyer pays the taker fee. A maker rebate may be paid from that fee. At the default v2 settings the resale fee is zero. The admin can announce a change under its hard cap that takes effect 24 hours later, including for an ask still open then; you can cancel it during that notice.

Resale is possible only before the series expiry, even after the 30-minute cutoff for **new writing**. A bid or ask may disappear or become stale before your transaction lands. There is no promise that an order will fill, and an unfilled ask locks your long tokens away from another sale until you cancel or the order is pruned. After expiry, a resale ask must return its escrowed longs so the holder can be redeemed.

There is no manual strike-payment exercise step in v2. If you keep a long to settlement, the final price determines its payout amount, but settlement and redemption still require transactions. Most options expire worthless; selling early can recover value, but only at a price someone will pay.

## Related

* [Order book](../market/order-book.md)
* [Settlement and payout](settlement-and-payout.md)
* [Fees](../product/fees.md)
* [Risks](../resources/risks.md)

# Selling calls on your stock

Learn how to deposit a Stock Token, choose a covered call, set an ask, and understand what happens if it finishes in the money.

{% hint style="warning" %}
Stonkhouse v2 is unaudited. The chain-4663 contracts first deployed for the dev launch are the live public contract set. Only NVDA is registered; other markets remain planned. Operational services and market liquidity may be unavailable. Stock Tokens carry market and issuer risks. Buyers can lose their full cost; writers can lose collateral. Stonkhouse is not available to US persons. Read [Risks](../resources/risks.md) before using the product.
{% endhint %}

## Start with collateral

Connect an eligible wallet on Robinhood Chain 4663. In Earn, select the Stock Token you hold. Approve an exact amount and deposit it into your Clearinghouse ledger. The ledger shows free and locked amounts. One call unit represents 0.01 share, so writing one whole-share call needs 100 units and one Stock Token of collateral.

Choose a strike, expiry, size, and your own ask price. The app can show a fair-value estimate, but it is a guideline, never a floor or a promise of a fill. Review the effective primary-sale fee, planned at 0% for v7 launch, and the outcome above the strike. A new mint also charges time-based rent in Stock Tokens from your free balance, so leave room beyond the units you want to lock. Approve the OrderBook as an operator before your first write-on-fill ask. That approval lets the book mint longs from your free collateral when a buyer takes your ask. [Setting your ask](../writing/setting-your-ask.md) explains the limits.

An ask uses no collateral until it fills. The same free balance can back several asks, but a later ask can become unfillable if another fill uses that collateral first. A fill locks only the collateral for the filled units. If no one buys, you earn no premium and no option is written.

At settlement you receive the short side's remaining collateral, which can be less than you deposited for an in-the-money call. Above the strike, your payoff keeps Stock Token value equivalent to the strike per share, plus any premium received. You give up upside above the strike on filled units. Idle Stock Tokens remain free. [Assignment and outcomes](../writing/assignment-and-outcomes.md) gives examples.

## Related

* [Deposits and collateral](../writing/deposits-and-collateral.md)
* [Setting your ask](../writing/setting-your-ask.md)
* [Assignment and outcomes](../writing/assignment-and-outcomes.md)
* [Risks](../resources/risks.md)

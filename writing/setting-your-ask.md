# Setting your ask

Choose an ask for a covered call or, where the market enables puts, a cash-secured put. Use fair value as a guide while keeping control over your price.

{% hint style="warning" %}
Stonkhouse v2 is unaudited and has no public production release. A separate chain-4663 dev deployment is for testing, not public trading. Stock Tokens carry market and issuer risks. Buyers can lose their full cost; writers can lose collateral. Stonkhouse is not available to US persons. Read [Risks](../resources/risks.md) before using the product.
{% endhint %}

## Choose the terms

On `/earn/[ticker]`, choose a valid expiry and strike, your size in 0.01-share steps, and the premium you ask per whole share. The expiry grid includes daily and weekly series. A new series is created only with a valid market strike tick and at least one hour before expiry; writing ends **30 minutes before expiry**. A write-on-fill ask expires no later than that cutoff.

The app shows a fair-value estimate beside your ask. It is a **guideline, never a floor**: you can ask above or below it, and the estimate can be missing or stale. In the proposed v7 design, the ticket should show gross premium, any maker rebate, the effective primary premium fee and the rent charged **in the collateral asset** if the ask mints. The planned launch primary premium fee is 0%, but final live rates must be checked before a trade. The premium arrives only on a fill; an unfilled write-on-fill ask pays no rent. Rent can cost more than the premium from a cheap ask; compare their value before accepting a quote. If you mint directly before listing the long, you pay rent at mint even if no buyer ever fills your later ask. A higher ask can wait or never fill.

On first use, approve the OrderBook as a Clearinghouse operator with `setOperator(OrderBook, true)`. This permits the book to mint a long for a buyer from your free collateral when your `AskWrite` fills, including the mint's rent. Operator approval is a real power: the book can mint using your free collateral but cannot withdraw your balance to its own address. Review the contract address before approving.

You can cancel or replace your ask. Replace creates a new order id. A book-fee change is announced 24 hours before activation, giving you time to change a resting ask; it uses the fee effective when filled, even if you placed it earlier. Each series keeps the rent rate pinned at its creation, even after a market-rate change. A partially filled ask leaves the remaining size live if it still has enough **collateral plus rent** and is before cutoff. The order book can skip an ask that became unfillable, so a displayed quote is not a promise of execution. After a fill, your short side is collateralised until you close it with an equal long or receive the remainder at settlement.

**Outcome at an illustrative 200 USDG strike.** If the final price is below 200, you receive the call collateral back and keep the premium, after accounting for any rent paid. If it is 220, the long receives value for the 20 difference. Your short receives Stock Tokens worth 200 per original share at that settlement price, plus the premium you earned. You give up the upside above the strike on the filled portion. This is net-share settlement, not a cash purchase of your whole Stock Token at 200.

## Related

* [Deposits and collateral](deposits-and-collateral.md)
* [Cash-secured puts](cash-secured-puts.md)
* [Assignment and outcomes](assignment-and-outcomes.md)
* [Order book](../market/order-book.md)
* [Risks](../resources/risks.md)

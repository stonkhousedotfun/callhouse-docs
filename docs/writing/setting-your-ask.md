# Setting your ask

Choose an ask for a covered call or, on a market that lists puts, a cash-secured put; neither launch market lists puts. Use fair value as a guide while keeping control over your price.

{% hint style="warning" %}
Stonkhouse v2 is unaudited. Interface v8 is deployed on Robinhood Chain 4663 from block 69,512,673 (22 September 2026); the launch markets are NVDA and SPCX. Registered markets can change; check the current app and on-chain status before trading. Operational services and market liquidity may be unavailable. Stock Tokens carry market and issuer risks. Buyers can lose their full cost; writers can lose collateral. Stonkhouse is not available to US persons. Read [Risks](../resources/risks.md) before using the product.
{% endhint %}

## Choose the terms

On `/earn/[ticker]`, choose a valid expiry and strike, your size in 0.01-share steps, and the premium you ask per whole share. The expiry grid includes daily and weekly series. A new series is created only with a valid market strike tick and at least one hour before expiry; writing ends **30 minutes before expiry**. A write-on-fill ask expires no later than that cutoff.

## Read the fair-value estimate

A fair value is an off-chain estimate in USDG per whole share of option coverage for this Stock Token. It is a **guideline, never a floor or an executable quote**. It does not replace the bids and asks on Stonkhouse, and it is not the oracle price used at settlement. Even an estimate derived from an exact listed external contract is mapped to the Stock Token spot and can differ from a price available to trade.

Where the app supplies provenance, read the **provider** separately from the **method**. The provider identifies the data service. The method says whether the estimate uses an exact listed contract, interpolation between listed inputs, extrapolation outside them, a local model, or an external indicative value. A local Stonkhouse expiry can exist without a matching listed expiry elsewhere. Its estimate may need interpolation or extrapolation, and should remain unavailable when that method is not qualified.

Check the observation time, declared delay, and series readiness. Receiving or recomputing old data does not make the source observation fresh. Short-dated estimates can also be uncertain around earnings, first listed expiries, overnight periods, weekends, or holidays. A source fallback can change the provider, delay, or method; it does not promise the same quality. Missing or refused fair value is unavailable, not a zero-cost option. You can still choose a manual ask.

The ticket should show gross premium, any maker rebate and the effective primary premium fee. That fee is 5% of the premium on a first sale, but final live rates must be checked before a trade. The premium arrives only on a fill, and so does the mint: there is no route by which you pay anything for an ask that never fills. A higher ask can wait or never fill.

On first use, approve the OrderBook as a Clearinghouse operator with `setOperator(OrderBook, true)`. This permits the book to mint a long for a buyer from your free collateral when your `AskWrite` fills. Only the book is allowed to mint, so without that approval your write-on-fill ask can never fill. Operator approval is a real power: the book can mint using your free collateral but cannot withdraw your balance to its own address. Review the contract address before approving.

You can cancel or replace your ask. Replace creates a new order id. A manual ask does not follow fair value after you post it. Changes in spot, volatility, time to expiry, or source quality can make it expensive or cheap before you act. A book-fee change is announced 48 hours before activation, giving you time to change a resting ask; it uses the fee effective when filled, even if you placed it earlier. Each series keeps its exercise fee and rent rate pinned at its creation, and a change to either waits 72 hours and then reaches only later series. A partially filled ask leaves the remaining size live if it still has enough collateral and is before cutoff. The order book can skip an ask that became unfillable, so a displayed quote is not a promise of execution. After a fill, your short side is collateralised until you close it with an equal long or receive the remainder at settlement.

**Outcome at an illustrative 200 USDG strike.** If the final price is below 200, you receive the call collateral back and keep the premium, less the 5% primary premium fee. If it is 220, the long receives value for the 20 difference. Your short receives Stock Tokens worth 200 per original share at that settlement price, plus the premium you earned. You give up the upside above the strike on the filled portion. This is net-share settlement, not a cash purchase of your whole Stock Token at 200.

## Related

* [Deposits and collateral](deposits-and-collateral.md)
* [Cash-secured puts](cash-secured-puts.md)
* [Assignment and outcomes](assignment-and-outcomes.md)
* [Order book](../market/order-book.md)
* [Risks](../resources/risks.md)

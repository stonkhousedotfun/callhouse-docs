# Presets and auto-roll

Learn how writer presets and an optional rolling strategy can place future asks under your chosen limits.

{% hint style="warning" %}
Stonkhouse v2 is unaudited. Interface v8 is deployed on Robinhood Chain 4663 from block 69,512,673 (22 September 2026); the launch markets are NVDA and SPCX. Registered markets can change; check the current app and on-chain status before trading. Operational services and market liquidity may be unavailable. Stock Tokens carry market and issuer risks. Buyers can lose their full cost; writers can lose collateral. Stonkhouse is not available to US persons. Read [Risks](../resources/risks.md) before using the product.
{% endhint %}

## Presets fill the form for you

The writing presets prepare terms that you can inspect and change before posting. They include a weekly call about 5% above spot, a weekly call near 0.15 delta when fair-value data is available, a daily call about 2% above spot, and a conservative weekly call about 10% above spot. A preset does not guarantee a fill, premium, or outcome. The final strike still has to meet the market's tick and calendar rules.

Presets leave smart pricing off. With an available estimate, the app can also fill a proposed band for your review. It refreshes the complete call list and uses an open series of the same daily or weekly tenor, at the longest available expiry and nearest the strategy's target strike. The proposal starts at its maximum ask. It expires after one minute or whenever the market or form changes, so an old proposal cannot be silently reused. This one-minute limit protects only the form and proposal from reuse. It does not establish source-observation freshness or per-series readiness. If the refresh or estimate fails, manual asks remain available.

## Smart pricing stays inside your band

Smart pricing is optional. You choose a starting ask, minimum, and maximum in USDG per share before signing. The app converts them to the integer basis points of Stock Token spot that the AutoRoller stores; their USDG equivalents therefore move with spot. Contract limits allow 0.5% to 10% of spot, and book prices use a 0.0001 USDG tick. Review any rounding and edit all three values. A proposed band is a form suggestion, not a recommendation or protection against loss.

During a configured market session, the pricer targets its fair-value estimate plus its configured edge, rounds to the book tick, and clamps the result inside your band. It may leave the ask unchanged. The contract also refuses any single reprice that would lower your ask by more than 25% of its current price; raising it is not capped. The pricer does not split a larger cut into steps, so such a reprice fails and the ask stays at its last on-chain price. The pricer cannot move that ask while smart pricing is off.

{% hint style="info" %}
Source-aware activation requires both the pricer and the exact series to be ready. A healthy process alone is not enough. The pricer refuses a fair value whose source time is unknown or older than its configured age limit, and refuses one priced at a spot that differs from the oracle spot by more than its configured tolerance. It honours provenance readiness and identity when the pricing service supplies them, but the pricing service does not yet emit provenance or per-series readiness, so an unsupported local expiry, source delay, provider fallback, identity mismatch, or model and earnings uncertainty only makes a series unavailable once it does. If you do not accept that, leave smart pricing off and use a manual ask.
{% endhint %}

There is no promise of a first reprice, continuous repricing, a fair sale, or a fill. If the source or pricer stops after an ask is live, the contract does not reset it to your maximum or cancel it. The ask stays live at its last on-chain price and can become cheap as the market moves. Monitor it and cancel, replace, or pause the strategy when you no longer accept that price.

## Auto-roll approval checklist

Auto-roll may create a new **call** ask each period after the previous one settles. It does not buy back stock or promise continuous sales. Enabling it can require four separate transactions:

1. `setPayoutToLedger(true)` keeps your short collateral remainder in the Clearinghouse ledger for the next period.
2. `setOperator(AutoRoller, true)` is your consent to be rolled. The roller never mints: it places a write-on-fill ask for you, and the book mints from your free collateral if a buyer fills it.
3. `OrderBook.setDelegate(AutoRoller, true)` lets it place, replace, or cancel **write-on-fill asks only** for you. It cannot place bids or resale asks through this delegate right.
4. `AutoRoller.setStrategy(...)` stores your settings: daily or weekly, strike distance, ask guidance, maximum size, and optional smart pricing bounds.

The app should show each completed approval. If you stop partway through, the already confirmed approvals remain on chain; review and revoke any you do not want. The roller can only roll during a regular New York trading session with a fresh spot price, enough time until the next expiry, at least one unit of free collateral net of any rent, and no live order for that period. If settlement is delayed, it waits. A roll during the first 30 minutes of a session needs an oracle spot printed during that session. After that opening grace, it may roll using a still-fresh pre-open spot accepted by the oracle; the price does not have to come from the opening session. Depositing exactly one Stock Token leaves room for 100 option units while a market's rent rate is 0; a non-zero rate would need headroom beyond the collateral.

Under the stale-ask rule, anyone may call `cancelStale` when a fresh oracle spot reaches or crosses the strike of the tracked auto-roll ask. That cancels its unfilled remainder; it does not undo units already filled. The strategy keeps the current series and waits until after that expiry for another roll. It does **not** post a replacement ask in the same period. Cancellation needs a transaction and a fresh oracle print, so a buyer can still fill before it happens. Do not treat auto-roll as strike protection.

**Pause** calls `AutoRoller.stop`, cancelling its live auto-roll ask if present and preventing future rolls. Separate manual asks remain open; cancel those in Portfolio if desired. Operator and delegate approvals remain until you revoke them. The pricer role cannot reprice an ask that is already at or in the money.

## Related

* [Setting your ask](setting-your-ask.md)
* [Deposits and collateral](deposits-and-collateral.md)
* [Keepers](../protocol/keepers.md)
* [Risks](../resources/risks.md)

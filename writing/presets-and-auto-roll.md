# Presets and auto-roll

Learn how writer presets and an optional rolling strategy can place future asks under your chosen limits.

{% hint style="warning" %}
Stonkhouse v2 is unaudited and has no public production release. A separate chain-4663 dev deployment is for testing, not public trading. Stock Tokens carry market and issuer risks. Buyers can lose their full cost; writers can lose collateral. Stonkhouse is not available to US persons. Read [Risks](../resources/risks.md) before using the product.
{% endhint %}

## Presets fill the form for you

The writing presets prepare terms that you can inspect and change before posting. They include a weekly call about 5% above spot, a weekly call near 0.15 delta when fair-value data is available, a daily call about 2% above spot, and a conservative weekly call about 10% above spot. A preset does not guarantee a fill, premium, or outcome. The final strike still has to meet the market's tick and calendar rules.

## Auto-roll approval checklist

Auto-roll may create a new **call** ask each period after the previous one settles. It does not buy back stock or promise continuous sales. Enabling it can require four separate transactions:

1. `setPayoutToLedger(true)` keeps your short collateral remainder in the Clearinghouse ledger for the next period.
2. `setOperator(AutoRoller, true)` lets the roller mint from your free collateral.
3. `OrderBook.setDelegate(AutoRoller, true)` lets it place, replace, or cancel **write-on-fill asks only** for you. It cannot place bids or resale asks through this delegate right.
4. `AutoRoller.setStrategy(...)` stores your settings: daily or weekly, strike distance, ask guidance, maximum size, and optional smart pricing bounds.

The app should show each completed approval. If you stop partway through, the already confirmed approvals remain on chain; review and revoke any you do not want. The roller can only roll during a regular New York trading session with a fresh spot price, enough time until the next expiry, free collateral **plus proposed v7 rent headroom**, and no live order for that period. If settlement is delayed, it waits. Under the v7 design, a roll during the first 30 minutes of a session needs an oracle spot printed during that session. After that opening grace, it may roll using a still-fresh pre-open spot accepted by the oracle; the price does not have to come from the opening session. Depositing exactly one Stock Token may leave room for fewer than 100 option units because a later fill also needs rent.

Under the proposed v7 stale-ask rule, anyone may call `cancelStale` when a fresh oracle spot reaches or crosses the strike of the tracked auto-roll ask. That cancels its unfilled remainder; it does not undo units already filled or return rent on those units. The strategy keeps the current series and waits until after that expiry for another roll. It does **not** post a replacement ask in the same period. Cancellation needs a transaction and a fresh oracle print, so a buyer can still fill before it happens. Do not treat auto-roll as strike protection.

**Pause** calls `AutoRoller.stop`, cancelling its live auto-roll ask if present and preventing future rolls. Separate manual asks remain open; cancel those in Portfolio if desired. Operator and delegate approvals remain until you revoke them. Smart pricing, if enabled, allows a dedicated pricer role to reprice inside the minimum and maximum ask bounds you set; without it that role cannot reprice your ask. In the proposed v7 design, it also refuses to reprice an ask already at or in the money.

## Related

* [Setting your ask](setting-your-ask.md)
* [Deposits and collateral](deposits-and-collateral.md)
* [Keepers](../protocol/keepers.md)
* [Risks](../resources/risks.md)

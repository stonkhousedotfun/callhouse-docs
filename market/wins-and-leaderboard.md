# Wins and leaderboard

Learn how realised wins are calculated and which trades qualify for public rankings.

{% hint style="warning" %}
Stonkhouse v2 is unaudited and has no public production release. A separate chain-4663 dev deployment is for testing, not public trading. Stock Tokens carry market and issuer risks. Buyers can lose their full cost; writers can lose collateral. Stonkhouse is not available to US persons. Read [Risks](../resources/risks.md) before using the product.
{% endhint %}

## What the feed shows

The wins feed lists **closed positions with a recorded cost and USDG-equivalent value received**, with day, week, and all-time filters. A position can close through resale before expiry, redemption after settlement, or both. That value combines actual USDG resale proceeds with redemption value where applicable. An in-kind Stock Token redemption is valued at the series' settlement price; the number does not mean that much USDG was transferred to the holder. The share page links to its closing on-chain transaction; for a resale-only win, that transaction is a sale, not a redemption. The leaderboard can rank by biggest return multiple, biggest absolute win, or a win streak over a selected time window. Addresses are shortened in public display.

The feed shows wins, not every trade. **Most options expire worthless.** A large multiple on a small ticket does not show how many losing tickets the holder bought, nor a typical outcome. The leaderboard includes recorded wins and losses for its ranking, but it is not an account statement. Check your own Portfolio history for your positions.

## How a result is counted

The indexer builds long-position cost from fills in first-in, first-out order and includes taker fees. In-kind settlement is valued at the settlement price. A public win excludes self-fills, positions with total cost below **0.10 USDG**, and fills priced below **25% of the fair value** at fill time. A position whose ownership or price history cannot be reconciled is flagged or omitted rather than presented as a verified win. These filters reduce obvious gaming; they cannot prove that two wallets are unrelated or remove every unusual trade.

P&L cards show actual resale proceeds and USDG-equivalent redemption value where applicable, against the cost that produced them. An in-kind redemption remains Stock Tokens in the wallet or ledger even when the card displays its USDG value. These cards do not forecast another contract's payout. Each option's maximum loss remains its full purchase cost, including fees.

## Related

* [Payoff cards](../buying/payoff-cards.md)
* [Settlement and payout](../buying/settlement-and-payout.md)
* [Accounting](../protocol/accounting.md)
* [Risks](../resources/risks.md)

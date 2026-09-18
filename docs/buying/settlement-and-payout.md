# Settlement and payout

Understand permissionless settlement, the exercise fee, USDG conversion, in-kind fallback, and payout preferences.

{% hint style="warning" %}
Stonkhouse v2 is unaudited and has no public production release. A separate chain-4663 dev deployment is for testing, not public trading. Stock Tokens carry market and issuer risks. Buyers can lose their full cost; writers can lose collateral. Stonkhouse is not available to US persons. Read [Risks](../resources/risks.md) before using the product.
{% endhint %}

## From expiry to payment

At expiry, the oracle measures the final 30 minutes before 16:00 New York. It may finalise promptly when independent sources agree, or post a delayed candidate when only one usable source remains or sources disagree. A guardian can veto that candidate. Until a price is final, your position stays unsettled; it is not an error in your wallet. See [Oracle and settlement](../protocol/oracle-and-settlement.md).

Once a price is final, anyone can settle the series. After settlement, you or another caller can submit redemption; no strike payment is required. Do not assume automatic redemption, because no v2 cranker service was running at the recorded dev launch. A holder can disable third-party redemption and redeem personally. A call long has a gross payout only above its strike; a put long only below. The exercise fee is taken from an in-the-money payout. An out-of-the-money long burns for zero. Most options expire worthless, so your full purchase cost can be lost.

| Position | Asset paid after settlement |
|---|---|
| Winning call long | Stock Tokens representing net intrinsic value. By default the Clearinghouse tries to convert them to USDG above a protocol-controlled floor that includes the route's pool fee; on failure it pays Stock Tokens instead. |
| Winning put long | USDG, net of the exercise fee. |
| Short | The collateral remainder in kind: Stock Tokens for a call; USDG for a put. |

Choose **receive Stock Tokens** in Portfolio if you do not want an automatic call conversion. The on-chain preference is `setPayoutInKind(true)`. You can also direct payouts to your Clearinghouse ledger with `setPayoutToLedger(true)` and withdraw later. A failed outgoing transfer is credited to that ledger automatically. The issuer can still prevent a withdrawal while your address is frozen or blocklisted.

The card's USDG payout is a valuation at the scenario price. An actual conversion may receive less or fall back to Stock Tokens. The protocol sets a base shortfall bound, planned at 30 bps for launch, and adds the route's pool fee (5, 30 or 100 bps for the observed pool tiers), up to a 300 bps total bound. You cannot set that floor in Portfolio. A failed or unavailable route pays in kind. The settlement price can differ from a last-trade or official closing price.

## Related

* [Payoff cards](payoff-cards.md)
* [Getting paid](../getting-started/getting-paid.md)
* [Oracle and settlement](../protocol/oracle-and-settlement.md)
* [Risks](../resources/risks.md)

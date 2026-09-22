# Settlement and payout

Understand permissionless settlement, the exercise fee, USDG conversion, in-kind fallback, and payout preferences.

{% hint style="warning" %}
Stonkhouse v2 is unaudited. Interface v8 is deployed on Robinhood Chain 4663 from block 69,512,673 (22 September 2026); the launch markets are NVDA and SPCX. Registered markets can change; check the current app and on-chain status before trading. Operational services and market liquidity may be unavailable. Stock Tokens carry market and issuer risks. Buyers can lose their full cost; writers can lose collateral. Stonkhouse is not available to US persons. Read [Risks](../resources/risks.md) before using the product.
{% endhint %}

## From expiry to payment

At expiry, the oracle measures the final 30 minutes before 16:00 New York. It may finalise promptly when independent sources agree, or post a delayed candidate when only one usable source remains or sources disagree. A guardian can veto that candidate. Until a price is final, your position stays unsettled; it is not an error in your wallet. See [Oracle and settlement](../protocol/oracle-and-settlement.md).

Once a price is final, anyone can settle the series. After settlement, you or another caller can submit redemption; no strike payment is required. An operator-run cranker is meant to create series and submit the snapshot, settlement and redemption calls, but no service is promised. Check the on-chain state of your expiry and be ready to use the permissionless calls yourself if nothing has advanced it. A holder can disable third-party redemption and redeem personally. A call long has a gross payout only above its strike; a put long only below. The exercise fee is taken from an in-the-money payout. An out-of-the-money long burns for zero. Most options expire worthless, so your full purchase cost can be lost.

| Position | Asset paid after settlement |
|---|---|
| Winning call long | Stock Tokens representing net intrinsic value. By default the Clearinghouse tries to convert them to USDG above a protocol-controlled floor that includes the route's pool fee; on failure it pays Stock Tokens instead. |
| Winning put long | USDG, net of the exercise fee. |
| Short | The collateral remainder in kind: Stock Tokens for a call; USDG for a put. |

Choose **receive Stock Tokens** in Portfolio if you do not want an automatic call conversion. The on-chain preference is `setPayoutInKind(true)`. You can also direct payouts to your Clearinghouse ledger with `setPayoutToLedger(true)` and withdraw later. A failed outgoing transfer is credited to that ledger automatically. The issuer can still prevent a withdrawal while your address is frozen or blocklisted.

The card's USDG payout is a valuation at the scenario price. An actual conversion may receive less or fall back to Stock Tokens. The protocol sets a base shortfall bound, currently 30 bps, and adds the fee recorded for that market's payout route, rounded up to whole basis points and capped at 100 bps; the routes set for the launch markets add 5 bps for NVDA and 100 bps for SPCX. The total bound cannot exceed 300 bps. You cannot set that floor in Portfolio. A failed or unavailable route pays in kind. The settlement price can differ from a last-trade or official closing price.

## Related

* [Payoff cards](payoff-cards.md)
* [Getting paid](../getting-started/getting-paid.md)
* [Oracle and settlement](../protocol/oracle-and-settlement.md)
* [Risks](../resources/risks.md)

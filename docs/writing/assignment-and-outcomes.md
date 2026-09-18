# Assignment and outcomes

Compare the writer’s collateral and premium outcomes when a contract expires above or below its strike.

{% hint style="warning" %}
Stonkhouse v2 is unaudited. The chain-4663 contracts first deployed for the dev launch are the live public contract set. Only NVDA is registered; other markets remain planned. Operational services and market liquidity may be unavailable. Stock Tokens carry market and issuer risks. Buyers can lose their full cost; writers can lose collateral. Stonkhouse is not available to US persons. Read [Risks](../resources/risks.md) before using the product.
{% endhint %}

## What your short receives

V2 has **no early assignment** and no manual exercise. All units of one series use the same final price. A call writer posts Stock Token collateral; a put writer posts USDG. The Clearinghouse divides that collateral between the long payout, the exercise fee if in the money, and the short remainder. A holder may transfer a short token, so the short holder at redemption receives that remainder. The table assumes the original writer still holds the short; after a transfer, the writer keeps the premium while the new holder receives the collateral remainder.

| Final price | Covered call writer | Cash-secured put writer |
|---|---|---|
| Call below its strike / put above its strike | Keeps the Stock Token collateral and premium from any fill; separately paid rent in Stock Tokens when minted. | Keeps the USDG collateral and premium from any fill; separately paid rent in USDG when minted. |
| Call above its strike / put below its strike | Keeps Stock Tokens worth the strike per original share at the final price, plus premium; gives up upside above the strike on filled units and separately paid Stock Token rent. | Receives the USDG collateral remainder after the long's intrinsic payout, plus premium; bears the downside below the strike and separately paid USDG rent. |

**Illustrative covered call.** You write one share at a 200 USDG strike and receive a 2 USDG premium before any book fee. At a 220 USDG final price, the long's gross intrinsic value is about 20 USDG, paid from the locked Stock Token. The short receives the remaining Stock Token value, about 200 USDG, rather than the original whole share. In deployed v7, the writer paid rent in Stock Tokens when those units were minted; the planned primary premium fee is 0%. Price, rounding, rent and other fees can change this illustrative result.

**Exit before settlement.** Buy an equal amount of the matching long and call `close`. The Clearinghouse burns the paired long and short and frees their collateral to the closer's ledger while the series is unsettled. If close happens before expiry, it also returns unused rent in the collateral asset to the closer. At or after expiry there is no rent refund, even if settlement has not run. Your cost to buy the long may exceed the premium you received. You can cancel an unfilled ask at any time, but cancelling cannot reverse a filled short.

Most options expire worthless for buyers. A writer can still lose substantial collateral value if the Stock Token or USDG changes value or an issuer blocks transfers. [Risks](../resources/risks.md) explains the limits of a covered or cash-secured position.

## Related

* [Setting your ask](setting-your-ask.md)
* [Cash-secured puts](cash-secured-puts.md)
* [Accounting](../protocol/accounting.md)
* [Risks](../resources/risks.md)

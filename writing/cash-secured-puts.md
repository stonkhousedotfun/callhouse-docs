# Cash-secured puts

Learn how a writer backs a put with USDG and what settlement can pay to its buyer.

{% hint style="warning" %}
Stonkhouse v2 is unaudited. Interface v8 is deployed on Robinhood Chain 4663 from block 69,512,673 (22 September 2026); the launch markets are NVDA and SPCX. Registered markets can change; check the current app and on-chain status before trading. Operational services and market liquidity may be unavailable. Stock Tokens carry market and issuer risks. Buyers can lose their full cost; writers can lose collateral. Stonkhouse is not available to US persons. Read [Risks](../resources/risks.md) before using the product.
{% endhint %}

## How a put is secured

A put gives its long holder a payout when the final price falls below the strike. To write one, you deposit **USDG equal to the strike × covered share amount** in the Clearinghouse ledger. For a 200 USDG strike, one 0.01-share unit locks 2 USDG; a one-share position locks 200 USDG. The put is fully collateralised and does not borrow against your Stock Tokens.

Neither launch market lists puts: the **Puts** column on [Markets](../product/markets.md) reads `no` for NVDA and for SPCX, and the app offers put writing only on a market listed with puts. That listing is an app and keeper setting rather than a contract rule. The contracts accept a put series on any enabled market, so a put series someone else creates can exist on chain without appearing in the app. On a market that does list puts, choose it, then an expiry, strike, size, and ask. If a buyer fills, you receive premium less the effective primary-sale fee and hold a short token. You need the strike collateral in USDG; at the registered 0 ppm rent rate the mint charges nothing on top of it. The primary-sale fee is 5% of the premium. If no buyer fills, no option is written and no premium is paid.

At settlement, a put long receives its intrinsic value in USDG, less the exercise fee. You receive the remaining USDG collateral. A put that expires above its strike leaves the full collateral for the short holder. A large fall can consume most of the USDG collateral. V2 does not promise to deliver Stock Tokens to a put writer at the strike; it settles the price difference from USDG collateral.

You can close early by obtaining an equal amount of the matching long and burning the pair. The cost of that long can be more than the premium you earned.

## Related

* [Deposits and collateral](deposits-and-collateral.md)
* [Assignment and outcomes](assignment-and-outcomes.md)
* [Settlement and payout](../buying/settlement-and-payout.md)
* [Risks](../resources/risks.md)

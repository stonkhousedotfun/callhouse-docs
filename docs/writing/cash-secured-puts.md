# Cash-secured puts

Learn how a writer backs a put with USDG and what settlement can pay to its buyer.

{% hint style="warning" %}
Stonkhouse v2 is unaudited. The chain-4663 contracts first deployed for the dev launch are the live public contract set. Only NVDA is registered; other markets remain planned. Operational services and market liquidity may be unavailable. Stock Tokens carry market and issuer risks. Buyers can lose their full cost; writers can lose collateral. Stonkhouse is not available to US persons. Read [Risks](../resources/risks.md) before using the product.
{% endhint %}

## How a put is secured

A put gives its long holder a payout when the final price falls below the strike. To write one, you deposit **USDG equal to the strike × covered share amount** in the Clearinghouse ledger. For a 200 USDG strike, one 0.01-share unit locks 2 USDG; a one-share position locks 200 USDG. The put is fully collateralised and does not borrow against your Stock Tokens.

Choose a market that has puts enabled, then an expiry, strike, size, and ask. Put markets and series are enabled by deployment configuration; a listed ticker alone does not mean puts are live. If a buyer fills, you receive premium less the effective primary-sale fee and hold a short token. Deployed v7 charges rent in USDG from your free balance when the put is minted; you need the strike collateral **plus rent**. The planned launch primary-sale fee is 0%. If no buyer fills, no option is written, no rent is charged and no premium is paid.

At settlement, a put long receives its intrinsic value in USDG, less the exercise fee. You receive the remaining USDG collateral. A put that expires above its strike leaves the full collateral for the short holder. A large fall can consume most of the USDG collateral. V2 does not promise to deliver Stock Tokens to a put writer at the strike; it settles the price difference from USDG collateral.

You can close early by obtaining an equal amount of the matching long and burning the pair. The cost of that long can be more than the premium you earned.

## Related

* [Deposits and collateral](deposits-and-collateral.md)
* [Assignment and outcomes](assignment-and-outcomes.md)
* [Settlement and payout](../buying/settlement-and-payout.md)
* [Risks](../resources/risks.md)

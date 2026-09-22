# v1 reference

Find the condensed mechanics and addresses for the existing v1 accounts and positions during run-off.

{% hint style="warning" %}
Stonkhouse v2 is unaudited. Interface v8 is deployed on Robinhood Chain 4663 from block 69,512,673 (22 September 2026); the launch markets are NVDA and SPCX. Registered markets can change; check the current app and on-chain status before trading. Operational services and market liquidity may be unavailable. Stock Tokens carry market and issuer risks. Buyers can lose their full cost; writers can lose collateral. Stonkhouse is not available to US persons. Read [Risks](../resources/risks.md) before using the product.
{% endhint %}

{% hint style="info" %}
This page describes **v1 only**, for old positions during run-off. It does not describe the v2 order book, fees, settlement, or writing flow. The live v1 NVDA factory address recorded on 16 September 2026 was `0xc4A5Cd0DE91CaB7F5Ebe2114bc63Fbb43E642BBb` on Robinhood Chain 4663. Verify any address against the app and chain before acting.
{% endhint %}

## How an old lot works

V1 has one factory per market and one option type per writer account. A keeper posts the weekly strike and ask; a writer selects whole one-Stock-Token lots. Unfilled lots are Seaport orders and write a Valorem call **only when bought**. A primary fill pays the writer premium after the v1 5% fee. V1 has no shared-series order book, resale route, fractional size, daily expiry, cash-secured put, maker programme, or auto-roll.

At the old option's exercise timestamp, a holder may pay the strike in USDG to exercise and receive the Stock Token. Each account's expiry includes a small index offset, so check the actual token rather than a generic Friday date. After that expiry, anyone can call the writer account's `settle()`. Unsold collateral unlocks; exercised lots leave strike USDG in the account for collection. V1 does **not** price and redeem every long automatically.

The old page addresses for [The weekly cycle](../product/weekly-cycle.md), [Buying calls](../product/buying-calls.md), and [Assignment](../product/assignment.md) now point to this archive. [Moving from v1](moving-from-v1.md) gives the steps for old positions.

V1 contracts are unaudited. A long can expire without being exercised. A writer gives up the Stock Token lot if a holder exercises, receiving strike USDG rather than that token. Stock Token and USDG issuer controls can block transfers or delay collection. The v1 admin and keeper had powers over factory policy and weekly terms; an old order must be checked against its original factory and account rather than v2's limits.

## What changes in v2

| v1 | v2 |
|---|---|
| Per-account Valorem option types and Seaport lots | Shared Clearinghouse series and an on-chain order book |
| Whole Stock Token call lots | 0.01-share units; calls and, when enabled, puts |
| Weekly factory terms | Daily and weekly series; writers set their own ask |
| Manual, physical exercise | Final oracle-price settlement and permissionless redemption |
| Single 5% sale fee | 5% primary premium fee on a first sale, 0% on a resale, plus taker, maker rebate and exercise fee settings; the collateral-rent dial is registered at 0 |

## Related

* [Moving from v1](moving-from-v1.md)
* [Buying your first contract](../getting-started/buying-your-first-contract.md)
* [Fees](../product/fees.md)
* [Risks](../resources/risks.md)

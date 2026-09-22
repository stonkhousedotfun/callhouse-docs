# Sizes and expiries

Choose a contract size in 0.01-share steps and compare daily with weekly expiries.

{% hint style="warning" %}
Stonkhouse v2 is unaudited. Interface v8 is deployed on Robinhood Chain 4663 from block 69,512,673 (22 September 2026); the launch markets are NVDA and SPCX. Registered markets can change; check the current app and on-chain status before trading. Operational services and market liquidity may be unavailable. Stock Tokens carry market and issuer risks. Buyers can lose their full cost; writers can lose collateral. Stonkhouse is not available to US persons. Read [Risks](../resources/risks.md) before using the product.
{% endhint %}

## Pick a size

One unit of an option covers **0.01 share** of its Stock Token. Ten units cover 0.1 share; 100 cover 1 share. You can choose intermediate sizes in 0.01-share steps when the book has enough quantity. A premium quoted per whole share scales with the filled units, while the taker fee is charged once per `take` call. The ticket recalculates cost, potential payout, and maximum loss for your exact size.

## Pick an expiry

**Daily** contracts expire on each NYSE session day. **Weekly** contracts expire on the last session day of the week, normally Friday. The calendar can also admit a labelled special expiry. Every v2 expiry is **16:00 America/New_York**, which is 20:00 UTC during daylight saving time and 21:00 UTC during standard time. A full-day holiday is skipped; an early-close day still uses 16:00 and may rely on older prints in the averaging window.

| Full-day Friday holiday | Weekly expiry moves to |
|---|---|
| 25 December 2026 | Thursday 24 December 2026, 16:00 New York |
| 1 January 2027 | Thursday 31 December 2026, 16:00 New York |
| 26 March 2027 | Thursday 25 March 2027, 16:00 New York |
| 18 June 2027 | Thursday 17 June 2027, 16:00 New York |
| 24 December 2027 | Thursday 23 December 2027, 16:00 New York |
| 14 April 2028 | Thursday 13 April 2028, 16:00 New York |

The table lists every Friday full-day closure on the live calendar, which is seeded with NYSE closures through 2028. The holiday set is maintained by the listing role, whose changes wait one hour; a year the listing role has not seeded has no valid expiries, so no series can be created in it until it does. Check the series page for its actual expiry before trading. New series can be created at most 45 days ahead. **Writing stops 30 minutes before expiry**, when the settlement averaging window begins. Existing long tokens can be resold in the book until expiry.

## Related

* [Payoff cards](payoff-cards.md)
* [Selling before expiry](selling-before-expiry.md)
* [Oracle and settlement](../protocol/oracle-and-settlement.md)
* [Risks](../resources/risks.md)

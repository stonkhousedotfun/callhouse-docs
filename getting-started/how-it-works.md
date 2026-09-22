# How Stonkhouse works

Follow a contract from a writer’s collateral and ask through a buyer’s purchase, expiry, settlement, and payout.

{% hint style="warning" %}
Stonkhouse v2 is unaudited. Interface v8 is deployed on Robinhood Chain 4663 from block 69,512,673 (22 September 2026); the launch markets are NVDA and SPCX. Registered markets can change; check the current app and on-chain status before trading. Operational services and market liquidity may be unavailable. Stock Tokens carry market and issuer risks. Buyers can lose their full cost; writers can lose collateral. Stonkhouse is not available to US persons. Read [Risks](../resources/risks.md) before using the product.
{% endhint %}

## One series, many participants

A series fixes the Stock Token, call or put, strike, and expiry. Every buyer of that series holds the same fungible long token. Writers hold the matching short token. One unit covers 0.01 share. The v2 Clearinghouse keeps the collateral and accounts for both sides.

```text
Writer deposits collateral → writer posts an ask → buyer fills the ask
         → long and short tokens exist → price is fixed at expiry
         → settlement allocates the collateral → holders are paid
```

**Before a fill.** An ask to write a new call does not mint an option. The writer sets its price and size. A fill locks collateral for the amount bought from the writer's free Stock Token balance. Nothing is minted until that fill: there is no separate mint step, so an unfilled ask earns no premium, costs nothing and creates no short position.

**After a fill.** The buyer can hold the long, sell it before expiry, or buy more. The writer can keep the short or close it by acquiring an equal long. The public order book also contains bids and resale asks for existing longs.

**At expiry.** The settlement oracle prices the final 30 minutes before 16:00 New York on the expiry date. It uses the market's configured sources; a single-source result waits through a candidate delay. Once the price is final, anyone can settle the series and then redeem a holder's position unless that holder has disabled third-party redemption. These calls require transactions. An operator-run cranker is meant to create series and submit the settlement calls, but no service is promised. Check the on-chain state of the expiry you care about rather than assuming it was reached. A call can expire with no buyer payout; the buyer's maximum loss on the option is the premium and taker fee paid, with network gas extra.

V2 uses one Clearinghouse across markets. It does not use the v1 factory, Seaport lots, or manual exercise. See [Moving from v1](../legacy/moving-from-v1.md) if you hold a v1 position. A position or a deposit on the contracts first deployed on 18 September 2026 stays on those contracts, which are still running; nothing moves it to the current set.

## Related

* [Buying your first contract](buying-your-first-contract.md)
* [Selling calls on your stock](selling-calls-on-your-stock.md)
* [Settlement and payout](../buying/settlement-and-payout.md)
* [Risks](../resources/risks.md)

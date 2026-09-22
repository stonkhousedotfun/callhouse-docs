# Buying your first contract

Learn how to choose a market, read the full cost and maximum loss, pick a size, and submit a buy.

{% hint style="warning" %}
Stonkhouse v2 is unaudited. Interface v8 is deployed on Robinhood Chain 4663 from block 69,512,673 (22 September 2026); the launch markets are NVDA and SPCX. Registered markets can change; check the current app and on-chain status before trading. Operational services and market liquidity may be unavailable. Stock Tokens carry market and issuer risks. Buyers can lose their full cost; writers can lose collateral. Stonkhouse is not available to US persons. Read [Risks](../resources/risks.md) before using the product.
{% endhint %}

## Choose the outcome

1. Open the [app](https://app.stonkhouse.fun/) and choose a live market. The app marks each market Live, Coming soon, Paused or Deferred, and only a market marked Live opens a ticket. NVDA and SPCX are the launch markets; every other market in the registry shows as Deferred.
2. Compare cards by strike, expiry, size, total cost, target payout, and maximum loss. A card's target is an example price at expiry, not a forecast. [Read the card line by line](../buying/payoff-cards.md).
3. Open a series and choose a size from 0.01 share upwards in 0.01-share steps. Review the current asks. The ticket shows the premium across the selected orders plus the taker fee. This total is your maximum loss on the option; network gas is extra.
4. Connect an eligible wallet on Robinhood Chain 4663. You need USDG for the cost and ETH on that chain for gas. Approve the exact USDG amount if prompted, then review and confirm the trade in your wallet.
5. Check your long position in Portfolio. If the live book changes before confirmation, the order can fill for less than requested or stop under the ticket's minimum-fill and price limits. The app simulates the chain call before sending it.

Most options expire worthless. A call pays only when the final settlement price exceeds its strike; a put pays only below its strike. You can [sell a long before expiry](../buying/selling-before-expiry.md). Holding it to settlement does not require you to pay the strike or press an Exercise button.

## Related

* [Payoff cards](../buying/payoff-cards.md)
* [Sizes and expiries](../buying/sizes-and-expiries.md)
* [Fees](../product/fees.md)
* [Risks](../resources/risks.md)

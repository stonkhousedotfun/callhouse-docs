# Payoff cards

Read each card’s cost, target scenario, possible payout, and maximum loss before buying.

{% hint style="warning" %}
Stonkhouse v2 is unaudited and has no public production release. A separate chain-4663 dev deployment is for testing, not public trading. Stock Tokens carry market and issuer risks. Buyers can lose their full cost; writers can lose collateral. Stonkhouse is not available to US persons. Read [Risks](../resources/risks.md) before using the product.
{% endhint %}

## Read the numbers

| Card line | What it means |
|---|---|
| Stock Token, call or put | The underlying debt security and the direction of the contract. A call benefits from a higher final price; a put from a lower one. |
| Strike and expiry | The threshold and the 16:00 New York time when the settlement window ends. |
| Ask and size | The current order-book premium per whole share, then the amount you select in 0.01-share steps. |
| Pay · max loss | Premium for the selected size **plus the taker fee**. This full cost is what you can lose. |
| If the Stock Token reaches the target | A scenario at expiry. The target comes from the market's configured distance from the strike; it is not a forecast. |
| Payout and multiple | Payout at that target **after the exercise fee**, divided by total cost. Payouts are rounded down in the display. |

The card starts with a 0.01-share illustration. When 1 share of ask depth exists, it can also show a one-share ticket. The option's payout per unit scales with size, so its **fee-free** multiple is size-independent at the same price. A one-share order pays one taker fee across the orders it fills, while a small ticket pays its own fee; deeper ask levels can also cost more. The **all-in** multiple can therefore change with size. Always check the ticket for the chosen size.

The slider changes **only the example expiry price**. It does not change your strike, guarantee that price, or predict an option's resale value. A call payout shown in USDG is a settlement-price valuation of Stock Tokens; actual conversion may receive less within the protocol's route-aware floor or pay in kind. The live quote can change before you buy. Most options expire worthless.

## Related

* [Buying your first contract](../getting-started/buying-your-first-contract.md)
* [Sizes and expiries](sizes-and-expiries.md)
* [Fees](../product/fees.md)
* [Risks](../resources/risks.md)

# Glossary

Look up the terms used in the order book, payoff cards, series, collateral ledger, and settlement flow.

{% hint style="warning" %}
Stonkhouse v2 is unaudited. Interface v8 is deployed on Robinhood Chain 4663 from block 69,512,673 (22 September 2026); the launch markets are NVDA and SPCX. Registered markets can change; check the current app and on-chain status before trading. Operational services and market liquidity may be unavailable. Stock Tokens carry market and issuer risks. Buyers can lose their full cost; writers can lose collateral. Stonkhouse is not available to US persons. Read [Risks](risks.md) before using the product.
{% endhint %}

| Term | Meaning |
|---|---|
| Ask | A price at which a maker offers to sell an existing long or write a new one on fill. |
| Bid | A price at which a maker offers to buy a long; its quoted premium is escrowed in USDG. |
| Call | A long that receives value if the final price is above its strike. |
| Close | Burn equal long and short units before settlement to free their collateral. Any unused rent is returned to the closer only when the close is before expiry. |
| Collateral ledger | Your free and locked Stock Token or USDG balances in the v2 Clearinghouse. |
| Cutoff | The point 30 minutes before expiry after which no new units can be written. |
| Epoch | A maker-scoring week starting Monday 00:00 UTC. |
| Exercise fee | A deduction from an in-the-money long's settlement payout; there is no manual v2 exercise action. |
| Fair value | An off-chain USDG estimate per whole share of option coverage on a Stock Token. It is not a Stonkhouse order, an executable external quote, a floor, or the settlement price. The required source-aware contract adds provider, method, source time, delay, and readiness; the pricer enforces the observation time today, and the pricing service does not publish the rest on the wire yet. |
| Long | The transferable ERC-1155 token that can receive the option payout. |
| Maker | The account whose bid or ask rests on the book before another trader takes it. |
| Mint rent | A per-market rate, registered at 0 on both launch markets and so charging nothing today, that would take a fee in the collateral asset whenever a fill mints new units, based on locked collateral and time to expiry. Raising it waits 72 hours and reaches only later series. |
| Maximum loss | For a buyer, all USDG paid for the long, including the taker fee; gas is additional. |
| Multiple | Scenario or realised payout divided by full purchase cost. It changes with price, fill levels, and fees. |
| Premium | USDG paid for option units when an order fills, before participant-specific fees. |
| Pricing band | The writer's minimum, starting, and maximum smart-pricing asks. The app shows USDG per share, while AutoRoller stores integer basis points of Stock Token spot. The pricer cannot move the ask outside the signed minimum and maximum. |
| Pricing method | How a fair value was produced, such as an exact listed input, interpolation, extrapolation, a model, or an external indicative value. It is separate from the data provider. |
| Put | A long that receives USDG value if the final price is below its strike. |
| Series | The shared Stock Token, call/put type, strike, and expiry represented by one long id and one short id. |
| Stale auto-roll ask | A tracked auto-roll ask whose strike has been reached by a fresh oracle spot. Anyone can cancel its unfilled remainder, but a buyer can fill first. |
| Settlement price | Oracle average over the last 30 minutes before expiry, after the source rules finalise it. |
| Short | The transferable ERC-1155 token representing the collateral remainder after settlement. |
| Smart pricing | An opt-in service that may reprice an eligible auto-roll ask during configured sessions, adding an edge and staying inside the writer's band. The pricer refuses a reprice when the fair value's observation time is unknown or stale, or when its spot disagrees with the oracle spot, and it stays off until the operator turns it on. If it stops, the last ask remains live until another on-chain action changes it. |
| Stock Token | A debt security issued by Robinhood Assets (Jersey) Limited, not a company share. |
| Taker | The account that executes against chosen resting orders and pays the taker fee. |
| Unit | One-hundredth of a share of option coverage; 100 units cover one share. |
| Vault outflow cap | A refillable limit on net USDG the treasury maker vault pays through quoter calls. It binds every caller, and it does not limit all trading or settlement losses. |
| Write-on-fill ask | A sell order that mints a long and short pair only when a buyer takes it. |

## Related

* [Documentation home](../README.md)
* [Order book](../market/order-book.md)
* [Fees](../product/fees.md)
* [Risks](risks.md)

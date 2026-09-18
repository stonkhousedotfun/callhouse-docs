# Glossary

Look up the terms used in the order book, payoff cards, series, collateral ledger, and settlement flow.

{% hint style="warning" %}
Stonkhouse v2 is unaudited and has no public production release. A separate chain-4663 dev deployment is for testing, not public trading. Stock Tokens carry market and issuer risks. Buyers can lose their full cost; writers can lose collateral. Stonkhouse is not available to US persons. Read [Risks](risks.md) before using the product.
{% endhint %}

| Term | Meaning |
|---|---|
| Ask | A price at which a maker offers to sell an existing long or write a new one on fill. |
| Bid | A price at which a maker offers to buy a long; its quoted premium is escrowed in USDG. |
| Call | A long that receives value if the final price is above its strike. |
| Close | Burn equal long and short units before settlement to free their collateral. Proposed v7 returns unused rent to the closer only when the close is before expiry. |
| Collateral ledger | Your free and locked Stock Token or USDG balances in the v2 Clearinghouse. |
| Cutoff | The point 30 minutes before expiry after which no new units can be written. |
| Epoch | A maker-scoring week starting Monday 00:00 UTC. |
| Exercise fee | A deduction from an in-the-money long's settlement payout; there is no manual v2 exercise action. |
| Fair value | An off-chain price estimate for an option; it guides comparison but does not set a floor. |
| Long | The transferable ERC-1155 token that can receive the option payout. |
| Maker | The account whose bid or ask rests on the book before another trader takes it. |
| Mint rent | Proposed v7 fee charged in the collateral asset whenever new option units are minted, based on locked collateral and time to expiry. Unused rent can be refunded on a pre-expiry close. |
| Maximum loss | For a buyer, all USDG paid for the long, including the taker fee; gas is additional. |
| Multiple | Scenario or realised payout divided by full purchase cost. It changes with price, fill levels, and fees. |
| Premium | USDG paid for option units when an order fills, before participant-specific fees. |
| Put | A long that receives USDG value if the final price is below its strike. |
| Series | The shared Stock Token, call/put type, strike, and expiry represented by one long id and one short id. |
| Stale auto-roll ask | A tracked auto-roll ask whose strike has been reached by a fresh oracle spot. Proposed v7 lets anyone cancel its unfilled remainder, but a buyer can fill first. |
| Settlement price | Oracle average over the last 30 minutes before expiry, after the source rules finalise it. |
| Short | The transferable ERC-1155 token representing the collateral remainder after settlement. |
| Stock Token | A debt security issued by Robinhood Assets (Jersey) Limited, not a company share. |
| Taker | The account that executes against chosen resting orders and pays the taker fee. |
| Unit | One-hundredth of a share of option coverage; 100 units cover one share. |
| Vault outflow cap | Proposed v7 refillable limit on net USDG the treasury maker vault pays through quoter calls. It does not limit all trading or settlement losses. |
| Write-on-fill ask | A sell order that mints a long and short pair only when a buyer takes it. |

## Related

* [Documentation home](../README.md)
* [Order book](../market/order-book.md)
* [Fees](../product/fees.md)
* [Risks](risks.md)

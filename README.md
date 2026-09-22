# Stonkhouse Docs

Stonkhouse is building a market for Stock Token options on Robinhood Chain (chain id `4663`). In v2, you can compare the full cost and possible payout of a call or put, buy from an order book in 0.01-share steps, sell a long before expiry, or deposit collateral and set your own ask. A shared Clearinghouse prices each series at expiry and pays holders through permissionless redemption.

{% hint style="warning" %}
**Read the risks before trading.** Most options expire worthless. A buyer can lose the full purchase cost, including the taker fee. A writer can lose collateral value and gives up upside above a covered call's strike on filled units. Stock Tokens are debt securities issued by Robinhood Assets (Jersey) Limited, not company shares. Stonkhouse v2 is unaudited. Interface v8 is deployed on Robinhood Chain 4663 from block 69,512,673 (22 September 2026); the launch markets are NVDA and SPCX. Registered markets can change; check the current app and on-chain status before trading. Operational services and market liquidity may be unavailable. Stonkhouse is not available to US persons. See [Risks](resources/risks.md).
{% endhint %}

## Release status

| Product | Current status | Rules |
|---|---|---|
| V2 shared market (interface v8) | The current public contract set, deployed on Robinhood Chain 4663 from block 69,512,673 on 22 September 2026. The launch set is two markets, NVDA and SPCX; the registry holds 35 rows in all. Both launch markets were registered and enabled for trading that day. Enabled means the contracts accept the trade, not that a quote or a fill is waiting for you, and availability can change. | These guides describe the interface v8 contracts. The launch does not include every keeper or market-making service: the protocol's maker vault is unfunded, the house vaults are not armed and notifications are not running, so a series can be quiet or one-sided. The generated [Markets](product/markets.md) page lists both launch markets as live; where any page and the chain disagree, the chain is the authority. Check the current app, on-chain status and [Addresses](protocol/addresses.md) before trading. |
| V2 shared market (interface v7) | The set deployed on 18 September 2026 is legacy. Nothing new is registered on it, and a position on it does not move to interface v8. It is not frozen: the contracts are still on chain and still accept creation, so read `createPaused()` and `market()` before assuming they do not. | Exits keep working — resell on the book, cancel, close, settle, redeem and withdraw. Do not open new positions there. See [Interface v7 reference](legacy/v7-reference.md) and the legacy table on [Addresses](protocol/addresses.md). |
| V1 NVDA solo accounts | Separate legacy product on Robinhood Chain; no automatic migration to v2 | [Moving from v1](legacy/moving-from-v1.md) and [v1 reference](legacy/v1-reference.md) |
| Earlier pooled vault | Closed | Legacy collection only; no new deposits or writing |

V1 positions do not move into v2 automatically. Do not use a v1 factory address for a v2 trade. Check the current app and [Addresses](protocol/addresses.md) before signing. Where these pages and the code disagree, **the code is the specification**.

The v2 guides describe the behaviour of the interface v8 contracts, not a live quote. Where a page names the interface v7 contracts, that is the legacy market and is labelled as such. Deploying a contract set does not by itself run keepers, fund bounties, arm a vault, add a market or make a legacy order tradable on the current contracts. A position written on interface v7 stays on interface v7. The historical v1 fee and lifecycle rules remain in the Legacy section.

## Start here

- **Buying:** [How Stonkhouse works](getting-started/how-it-works.md) → [Buying your first contract](getting-started/buying-your-first-contract.md) → [Payoff cards](buying/payoff-cards.md). The card's **Pay · max loss** includes the taker fee; scenario payouts are net of the exercise fee.
- **Writing:** [Selling calls on your stock](getting-started/selling-calls-on-your-stock.md) → [Deposits and collateral](writing/deposits-and-collateral.md) → [Setting your ask](writing/setting-your-ask.md). Premium is paid only when a buyer fills.
- **Trading and settlement:** [Order book](market/order-book.md), [Selling before expiry](buying/selling-before-expiry.md), [Settlement and payout](buying/settlement-and-payout.md), and [Fees](product/fees.md).
- **Checking the system:** [Markets](product/markets.md), [Oracle and settlement](protocol/oracle-and-settlement.md), [Roles](protocol/roles.md), [Security](protocol/security.md), and [Risks](resources/risks.md).

## Network and domains

| Where | Purpose |
|---|---|
| [app.stonkhouse.fun](https://app.stonkhouse.fun/) | Connect a wallet, check current v2 market availability, and access `/legacy` for v1 positions. |
| [stonkhouse.fun](https://stonkhouse.fun/) | Product information, terms, privacy notice, and reporting links. |
| [docs.stonkhouse.fun](https://docs.stonkhouse.fun/) | These guides and the protocol reference. |
| Robinhood Chain 4663 | Contracts and transactions. You need ETH on this chain for gas. |

USDG pays option premiums and secures puts. Covered calls require the relevant Stock Token. Neither Stonkhouse nor these docs supply a bridge, a wallet, or an issuer account. Market availability and addresses belong on the generated [Markets](product/markets.md) page and [Addresses](protocol/addresses.md). That page is generated from the app's market registry. Where any page and the chain disagree, the chain is the authority.

## No affiliation

Stonkhouse is independent. It is not affiliated with, endorsed by, or operated by Robinhood Markets, Inc., Robinhood Assets (Jersey) Limited, Valorem, or the issuers of USDG. Nothing here is investment, legal, or tax advice, or an offer of securities. Send security reports to **security@stonkhouse.fun**; see [Security](protocol/security.md).

## Related

- [FAQ](resources/faq.md)
- [Glossary](resources/glossary.md)
- [Risks](resources/risks.md)

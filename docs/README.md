# Stonkhouse Docs

Stonkhouse is building a market for Stock Token options on Robinhood Chain (chain id `4663`). In v2, you can compare the full cost and possible payout of a call or put, buy from an order book in 0.01-share steps, sell a long before expiry, or deposit collateral and set your own ask. A shared Clearinghouse prices each series at expiry and pays holders through permissionless redemption.

{% hint style="warning" %}
**Read the risks before trading.** Most options expire worthless. A buyer can lose the full purchase cost, including the taker fee. A writer can lose collateral value and gives up upside above a covered call's strike on filled units. Stock Tokens are debt securities issued by Robinhood Assets (Jersey) Limited, not company shares. Stonkhouse v2 is unaudited and has no public production release. A separate chain-4663 dev deployment is for testing, not public trading. Stonkhouse is not available to US persons. See [Risks](resources/risks.md).
{% endhint %}

## Release status

| Product | Status in this documentation draft | Rules |
|---|---|---|
| V2 shared market | A separate chain-4663 dev deployment and preview were recorded on 18 September 2026; public production addresses are not published here | This guide's Getting started, Buying, Writing, Market, and Protocol sections describe the proposed production release |
| V1 NVDA solo accounts | Existing product on Robinhood Chain as verified on 16 September 2026; winding down when v2 launches | [Moving from v1](legacy/moving-from-v1.md) and [v1 reference](legacy/v1-reference.md) |
| Earlier pooled vault | Closed | Legacy collection only; no new deposits or writing |

V1 positions do not move into v2 automatically. Do not use a v1 factory address for a v2 trade. Check the current app and [Addresses](protocol/addresses.md) before signing. Where these pages and the code disagree, **the code is the specification**.

The v2 guides describe interface v7 behaviour, not a production trading offer or a live quote. Contract source, generated ABIs, app and indexer consumers, approved per-market rates, replay and end-to-end acceptance must agree on the final reviewed revision before publication. The dev deployment does not fill the production [address table](protocol/addresses.md). The historical v1 fee and lifecycle rules remain in the Legacy section.

## Start here

- **Buying:** [How Stonkhouse works](getting-started/how-it-works.md) → [Buying your first contract](getting-started/buying-your-first-contract.md) → [Payoff cards](buying/payoff-cards.md). The card's **Pay · max loss** includes the taker fee; scenario payouts are net of the exercise fee.
- **Writing:** [Selling calls on your stock](getting-started/selling-calls-on-your-stock.md) → [Deposits and collateral](writing/deposits-and-collateral.md) → [Setting your ask](writing/setting-your-ask.md). Premium is paid only when a buyer fills.
- **Trading and settlement:** [Order book](market/order-book.md), [Selling before expiry](buying/selling-before-expiry.md), [Settlement and payout](buying/settlement-and-payout.md), and [Fees](product/fees.md).
- **Checking the system:** [Markets](product/markets.md), [Oracle and settlement](protocol/oracle-and-settlement.md), [Roles](protocol/roles.md), [Security](protocol/security.md), and [Risks](resources/risks.md).

## Network and domains

| Where | Purpose |
|---|---|
| [app.stonkhouse.fun](https://app.stonkhouse.fun/) | Connect a wallet, view the v2 market when launched, and access `/legacy` for v1 positions. |
| [stonkhouse.fun](https://stonkhouse.fun/) | Product information, terms, privacy notice, and reporting links. |
| [docs.stonkhouse.fun](https://docs.stonkhouse.fun/) | These guides and the protocol reference. |
| Robinhood Chain 4663 | Contracts and transactions. You need ETH on this chain for gas. |

USDG pays option premiums and secures puts. Covered calls require the relevant Stock Token. Neither Stonkhouse nor these docs supply a bridge, a wallet, or an issuer account. Market availability and addresses belong on the generated [Markets](product/markets.md) page and the final [Addresses](protocol/addresses.md) page; a planned market is not yet tradable.

## No affiliation

Stonkhouse is independent. It is not affiliated with, endorsed by, or operated by Robinhood Markets, Inc., Robinhood Assets (Jersey) Limited, Valorem, or the issuers of USDG. Nothing here is investment, legal, or tax advice, or an offer of securities. Send security reports to **security@stonkhouse.fun**; see [Security](protocol/security.md).

## Related

- [FAQ](resources/faq.md)
- [Glossary](resources/glossary.md)
- [Risks](resources/risks.md)

# Introduction

Renamed from Callhouse (callhouse.finance) to Stonkhouse (stonkhouse.fun) on 2026-09-15. Repository, GitBook space and on-chain names still say callhouse.

Stonkhouse is a pooled covered-call vault on Robinhood Chain (chain id 4663). You deposit a Stock Token and receive vault shares. Each week a keeper writes covered calls against the vault's idle tokens inside Overcall's weekly cycle and lists them for USDG. If a buyer fills the listing, the premium is credited to depositors as a separate USDG balance that you claim.

The first market is the **NVDA Stock Token**, and its share token is **cNVDA**. The options venue is [Overcall](https://overcall.finance), which writes options on Valorem Clear and lists them through Seaport 1.6. Stonkhouse is not an options exchange and runs no order book of its own. It is the account, the policy and the interface around one weekly trade.

There is no protocol token, no points programme and no airdrop. What depositors receive is the USDG a buyer actually paid, less fees, plus the strike USDG of any assignment. The vault is not upgradeable: a fix means a new vault and a migration, announced in advance.

{% hint style="warning" %}
**Read these before anything else.**

* **Premium is paid only if a buyer fills.** A week with no buyer pays zero premium, and the vault's collateral can still be assigned that week, because Valorem assigns exercises across every writer of the same option series, not only to writers whose calls were sold.
* **Assignment can take the collateral at the strike.** The upside above the strike is given up for that week, and v1 does not buy the stock back.
* **Stock Tokens are debt securities.** They are issued by Robinhood Assets (Jersey) Limited. They are not Nvidia shares, they carry no vote, and the issuer can freeze transfers.
* **Stonkhouse is not available to US persons.** The same perimeter applies as to the Stock Tokens themselves.
* You can lose the collateral you deposit.
{% endhint %}

## Status

{% hint style="danger" %}
**The Stonkhouse contracts are not deployed and have not been audited.** An internal adversarial review has been run and the contract defects recorded from it have been fixed, but that is a review by the people who wrote the code, not an external audit. The vault address will be published on [Contracts and addresses](protocol/addresses.md) after deployment. Until it appears there, no address is the Stonkhouse vault.
{% endhint %}

These docs describe the contracts as written. They contain no performance figures, because there are none yet. Once the vault runs, every closed week, including the weeks that paid nothing, is published in the app.

## Official domains

| Where | What it is |
|---|---|
| `stonkhouse.fun` | The public site. It explains the product and never asks for a wallet. It is live, and carries the Terms of Use (`/terms`), the privacy notice (`/privacy`), the perimeter disclosure and vulnerability reporting (`/legal`), and `/.well-known/security.txt`. |
| `app.stonkhouse.fun` | The app. Depositing, withdrawing, claiming USDG and each week's listing will live here. It is not deployed yet. |
| `docs.stonkhouse.fun` | These docs: depositor documentation and the protocol reference. |

Security reports go to **security@stonkhouse.fun**. See [Security and audits](protocol/security.md#reporting-a-vulnerability). `callhouse.xyz` is not a Stonkhouse domain.

## Where to go next

* [How Stonkhouse works](getting-started/how-it-works.md): the weekly loop in six steps.
* [Depositing](getting-started/depositing.md), [Withdrawing and the redeem queue](getting-started/withdrawing.md) and [Claiming USDG](getting-started/claiming-usdg.md): what each action does and what can block it.
* [Fees](product/fees.md) and [Assignment](product/assignment.md): the two things that decide what a week leaves you with.
* [Risks](product/risks.md): the full list. Read it before depositing.
* [Launch policy and hard caps](product/policy.md): the limits compiled into the contracts.
* [Architecture](protocol/architecture.md) and [Accounting](protocol/accounting.md): the technical reference.

## No affiliation

Stonkhouse is an independent project. It is not affiliated with, endorsed by, or operated by Robinhood Markets, Inc., Robinhood Assets (Jersey) Limited, Overcall, Valorem, or the issuers of USDG or Seaport. Nothing in these docs is investment, legal or tax advice, and nothing here is an offer of securities.

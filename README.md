# Introduction

Callhouse is a pooled covered-call vault on Robinhood Chain (chain id 4663). You deposit a Stock Token and receive vault shares. Each week the keeper creates one out-of-the-money call option on the Valorem clearinghouse, and the vault offers calls on it for USDG through a Seaport 1.6 order. Nothing is written in advance: the vault writes calls only inside a buyer's fill, exactly as many as the buyer takes. The premium a buyer pays is credited to depositors as a separate USDG balance that you claim.

The first market is the **NVDA Stock Token**, and its share token is **cNVDA**. The calls are sold on the app's own fill page, or through any Seaport 1.6 client that fills the vault's order (see [Buying calls](product/buying-calls.md)). Callhouse is not an options exchange and runs no order book of its own. It is the account, the policy and the interface around one weekly trade.

There is no protocol token, no points programme and no airdrop. What depositors receive is the USDG a buyer actually paid, less the protocol fee, plus the strike USDG of any assignment. The vault is not upgradeable: a fix means a new vault and a migration, announced in advance.

{% hint style="warning" %}
**Read these before anything else.**

* **Premium is paid only if a buyer fills.** A week with no buyer pays zero premium. Because calls are written only when they are bought, a week with no buyer also writes nothing.
* **Assignment can take the collateral at the strike.** Any call the vault sold can be assigned, because Valorem spreads each exercise pro rata across everyone who wrote that option, whoever exercises. The upside above the strike is given up for that week, and v1 does not buy the stock back.
* **A deposit made while a week is listed buys into that week's open calls.** It is priced as if the calls cost nothing, and a later fill can write calls against it. See [Depositing](getting-started/depositing.md).
* **Stock Tokens are debt securities.** They are issued by Robinhood Assets (Jersey) Limited. They are not Nvidia shares, they carry no vote, and the issuer can freeze transfers.
* **Callhouse is not available to US persons.** The same perimeter applies as to the Stock Tokens themselves.
* You can lose the collateral you deposit.
{% endhint %}

## Status

{% hint style="danger" %}
**The Callhouse contracts are not deployed and are unaudited.** No external audit has been done. The gate before launch is the test suite and an internal review of the redesigned contracts, which reported no Critical, High or Medium finding and one Low finding, since fixed. That is a review by the people who wrote the code, not an external audit. The vault address will be published on [Contracts and addresses](protocol/addresses.md) after deployment. Until it appears there, no address is the Callhouse vault.
{% endhint %}

These docs describe the contracts as written. They contain no performance figures, because there are none yet. Worked examples marked as coming from a fork rehearsal were produced on a copy of the chain, not by a live week. Once the vault runs, every closed week, including the weeks that paid nothing, is published in the app.

## Official domains

| Where | What it is |
|---|---|
| `callhouse.finance` | The public site. It explains the product and never asks for a wallet. It is live, and carries the Terms of Use (`/terms`), the privacy notice (`/privacy`), the perimeter disclosure and vulnerability reporting (`/legal`), and `/.well-known/security.txt`. |
| `app.callhouse.finance` | The app. Depositing, withdrawing, claiming USDG and the weekly fill page, where the vault's calls are bought, live here. No vault is configured there until the vault is deployed. |
| `docs.callhouse.finance` | These docs: depositor and buyer documentation and the protocol reference. |

Security reports go to **security@callhouse.finance**. See [Security and audits](protocol/security.md#reporting-a-vulnerability). `callhouse.xyz` is not a Callhouse domain.

## Where to go next

* [How Callhouse works](getting-started/how-it-works.md): the week end to end, in six steps.
* [Depositing](getting-started/depositing.md), [Withdrawing and the redeem queue](getting-started/withdrawing.md) and [Claiming USDG](getting-started/claiming-usdg.md): what each action does and what can block it.
* [Buying calls](product/buying-calls.md): how a buyer fills the vault's order, and how to exercise.
* [Fees](product/fees.md) and [Assignment](product/assignment.md): the two things that decide what a week leaves you with.
* [Risks](product/risks.md): the full list. Read it before depositing.
* [Launch policy and hard caps](product/policy.md): the limits compiled into the contracts.
* [Architecture](protocol/architecture.md) and [Accounting](protocol/accounting.md): the technical reference.

## No affiliation

Callhouse is an independent project. It is not affiliated with, endorsed by, or operated by Robinhood Markets, Inc., Robinhood Assets (Jersey) Limited, Valorem, or the issuers of USDG or Seaport. Nothing in these docs is investment, legal or tax advice, and nothing here is an offer of securities.

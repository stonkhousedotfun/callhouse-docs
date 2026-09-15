# Introduction

Renamed from Callhouse (callhouse.finance) to Stonkhouse (stonkhouse.fun) on 2026-09-15. The repository, the GitBook space and the on-chain token name ("Callhouse NVDA", symbol cNVDA) still say callhouse.

Stonkhouse is a pooled covered-call vault on Robinhood Chain (chain id 4663). You deposit a Stock Token and receive vault shares. Each week the keeper creates one out-of-the-money call option on Stonkhouse's own deployment of the Valorem clearinghouse, and the vault offers calls on it for USDG through a Seaport 1.6 order. Nothing is written in advance: the vault writes calls only inside a buyer's fill, exactly as many as the buyer takes. The premium a buyer pays, less the protocol fee, is credited to depositors as a separate USDG balance that you claim.

The first market is the **NVDA Stock Token**, and its share token is **cNVDA**. The vault's order is published on one page, the app's cycle page (`app.stonkhouse.fun/vault/nvda/cycle`), where calls are bought; the page also gives the raw order for any Seaport 1.6 client (see [Buying calls](product/buying-calls.md)). Stonkhouse is not an options exchange and runs no order book of its own. It is the account, the policy and the interface around one weekly trade.

There is no protocol token, no points programme and no airdrop. What depositors receive is the USDG a buyer actually paid, less the protocol fee, plus the strike USDG of any assignment. The vault is not upgradeable and has no function that migrates deposits, so a fix would need a new vault.

{% hint style="warning" %}
**Read these before anything else.**

* **Premium is paid only if a buyer fills.** A week with no buyer pays zero premium. Because calls are written only when they are bought, a week with no buyer also writes nothing.
* **Assignment can take the collateral at the strike.** Any call the vault sold can be assigned, whoever exercises, because Valorem assigns each exercise among the writers of that option by amount written, not to the writer of the exercised call. The upside above the strike is given up for that week, and v1 does not buy the stock back.
* **A deposit made while a week is listed buys into that week's open calls.** It is priced as if the calls cost nothing, and a later fill can write calls against it. See [Depositing](getting-started/depositing.md).
* **Stock Tokens are debt securities.** They are issued by Robinhood Assets (Jersey) Limited. They are not Nvidia shares and carry no vote, and the issuer can pause transfers, blocklist addresses (the vault's included) and burn tokens from any address.
* **Stonkhouse is not available to US persons.** This is a restriction in the Terms of Use, not a technical control.
* You can lose the collateral you deposit.
{% endhint %}

## Status

{% hint style="danger" %}
**The vault is live and has had no external audit.** It was deployed on 2026-09-15 at `0x88a98931E3682137E7e4D3426f623247f4A4ecbb`; every address is on [Contracts and addresses](protocol/addresses.md). An internal review of the contracts on 2026-09-14 reported no Critical, High or Medium finding and one Low finding, since fixed. That is an internal review, not an external audit. There is no bug bounty.

**The vault's admin is a single hot wallet with no timelock.** The admin role is held by one externally owned account, `0xEb82c3D0F89d47453F94f0C2b2a2752e27a19d9b`, which is also the protocol fee recipient. It can change the policy, the fee recipient and the deposit cap, with immediate effect. Moving the role to a Safe is planned and has not happened. See [Roles and admin powers](protocol/roles.md).
{% endhint %}

* Deposits are capped at 20 NVDA in total (`depositCap`). The admin can change the cap at any time.
* The vault and its two libraries are verified on Sourcify as partial matches. Stonkhouse's clearinghouse, `0x53d7A6d0489Daf3d67b9A314e0eAB2B78Acab9C6`, is not yet source-verified; its runtime bytecode equals Valorem's upstream code apart from the metadata hash.
* The keeper's alerts are logged but not yet delivered to any channel.

These docs contain no performance figures. Worked examples marked as coming from a fork rehearsal were produced on a copy of the chain, not by a live week. The app's Activity page lists the vault's weeks, including weeks that sold nothing.

## Official domains

| Where | What it is |
|---|---|
| `stonkhouse.fun` | The public site. It explains the product and never asks for a wallet. It carries the Terms of Use (`/terms`), the privacy notice (`/privacy`), the perimeter disclosure and vulnerability reporting (`/legal`), and `/.well-known/security.txt`. |
| `app.stonkhouse.fun` | The app, configured for the NVDA vault. Depositing, withdrawing and claiming USDG are on `/vault/nvda`. The cycle page, `/vault/nvda/cycle`, is where the vault's calls are bought and exercised. |
| `docs.stonkhouse.fun` | These docs: depositor and buyer documentation and the protocol reference. |

Security reports go to **security@stonkhouse.fun**. See [Security and audits](protocol/security.md#reporting-a-vulnerability). `callhouse.xyz` is not a Stonkhouse domain.

## What you need

Everything happens on Robinhood Chain: chain id `4663`, RPC `https://rpc.mainnet.chain.robinhood.com`, explorer `https://robinhoodchain.blockscout.com`.

| | To deposit | To buy calls | To exercise |
|---|---|---|---|
| ETH on chain 4663 | Gas | Gas | Gas |
| NVDA Stock Token, `0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC` (18 decimals) | The amount you deposit | | |
| USDG, `0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168` (6 decimals) | | The premium | The strike for each contract |

You also need a browser-extension wallet. The app connects only to injected wallets it discovers in the browser (MetaMask, Rabby, Brave, the Coinbase extension and similar); there is no WalletConnect or mobile QR connection.

The route in the team's own launch runbook: bridge a little ETH to chain 4663, swap ETH for USDG, then swap USDG for NVDA. A Uniswap V3 USDG/NVDA pool is at `0xd4EB21209C4D6093f80B5b84f5C45cc093EA14a3` (0.05% fee tier; source verified on Sourcify). Stonkhouse runs no bridge or pool and does not vouch for either. The Stock Tokens are offered outside the United States under their issuer's own terms, and you must be eligible to hold them under those terms.

## Where to go next

* [How Stonkhouse works](getting-started/how-it-works.md): the week end to end, in six steps.
* [Depositing](getting-started/depositing.md), [Withdrawing and the redeem queue](getting-started/withdrawing.md) and [Claiming USDG](getting-started/claiming-usdg.md): what each action does and what can block it.
* [Buying calls](product/buying-calls.md): how a buyer fills the vault's order, and how to exercise.
* [Fees](product/fees.md) and [Assignment](product/assignment.md): the two things that decide what a week leaves you with.
* [Risks](product/risks.md): the full list. Read it before depositing.
* [Launch policy and hard caps](product/policy.md): the limits compiled into the contracts.
* [Architecture](protocol/architecture.md) and [Accounting](protocol/accounting.md): the technical reference.

## No affiliation

Stonkhouse is an independent project. It is not affiliated with, endorsed by, or operated by Robinhood Markets, Inc., Robinhood Assets (Jersey) Limited, Valorem, or the issuers of USDG or Seaport. Nothing in these docs is investment, legal or tax advice, and nothing here is an offer of securities.

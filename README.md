# Introduction

Stonkhouse lets you put NVDA Stock Tokens to work on Robinhood Chain (chain id 4663). You deposit into **your own account** and choose how much is for sale each week. If someone buys, you get paid in USDG. If they don't, you keep the stock. Only the amount you offered can be sold.

The first market is the **NVDA Stock Token**. Deposit at `app.stonkhouse.fun/account`. Buy at `app.stonkhouse.fun/book`. Factory: `0x7850Ae4ac03b651263cE78EC5FcED11b0d0e05A7`.

There is no protocol token, no points programme and no airdrop. What depositors receive is the USDG a buyer actually paid, less the protocol fee, plus the strike USDG of any assignment. The vault is not upgradeable and has no function that migrates deposits, so a fix would need a new vault.

{% hint style="warning" %}
**Read these before anything else.**

* **Premium is paid only if a buyer fills.** A week with no buyer pays zero premium. Because calls are written only when they are bought, a week with no buyer also writes nothing.
* **Assignment can take the collateral at the strike.** Only lots you chose to write, and that actually sold, can be assigned. The upside above the strike is given up on those lots, and v1 does not buy the stock back.
* **Idle NVDA is not written.** Lots you did not request cannot be assigned.
* **Stock Tokens are debt securities.** They are issued by Robinhood Assets (Jersey) Limited. They are not Nvidia shares and carry no vote, and the issuer can pause transfers, blocklist addresses (the vault's included) and burn tokens from any address.
* **Stonkhouse is not available to US persons.** This is a restriction in the Terms of Use, not a technical control.
* You can lose the collateral you deposit.
{% endhint %}

## Status

{% hint style="danger" %}
**1-lot accounts are live and have had no external audit.** The factory is `0x7850Ae4ac03b651263cE78EC5FcED11b0d0e05A7` on chain 4663. Every address is on [Contracts and addresses](protocol/addresses.md). There is no bug bounty.

**Admin is a hot wallet with no timelock.** See [Roles and admin powers](protocol/roles.md).
{% endhint %}

* Deposits are capped at 20 NVDA **per account**. The admin can change the cap at any time.
* The vault and its two libraries are verified on Sourcify as partial matches. Stonkhouse's clearinghouse, `0x53d7A6d0489Daf3d67b9A314e0eAB2B78Acab9C6`, is not yet source-verified; its runtime bytecode equals Valorem's upstream code apart from the metadata hash.
* The keeper's alerts are logged but not yet delivered to any channel.

These docs contain no performance figures. Worked examples marked as coming from a fork rehearsal were produced on a copy of the chain, not by a live week. The app's Activity page lists the vault's weeks, including weeks that sold nothing.

## Official domains

| Where | What it is |
|---|---|
| `stonkhouse.fun` | The public site. It explains the product and never asks for a wallet. It carries the Terms of Use (`/terms`), the privacy notice (`/privacy`), the perimeter disclosure and vulnerability reporting (`/legal`), and `/.well-known/security.txt`. |
| `app.stonkhouse.fun` | The app. `/` is the product home and does not ask for a wallet. Deposit and write on `/account`. Buy lots on `/book`. |
| `docs.stonkhouse.fun` | These docs: depositor and buyer documentation and the protocol reference. |
| [x.com/stonkhousefun](https://x.com/stonkhousefun) | X. |
| [github.com/stonkhousedotfun](https://github.com/stonkhousedotfun) | Source. |

Security reports go to **security@stonkhouse.fun**. See [Security and audits](protocol/security.md#reporting-a-vulnerability). `callhouse.xyz` is not a Stonkhouse domain.

## What you need

Everything happens on Robinhood Chain: chain id `4663`, RPC `https://rpc.mainnet.chain.robinhood.com`, explorer `https://robinhoodchain.blockscout.com`.

| | To deposit | To buy calls | To exercise |
|---|---|---|---|
| ETH on chain 4663 | Gas | Gas | Gas |
| NVDA Stock Token, `0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC` (18 decimals) | The amount you deposit | | |
| USDG, `0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168` (6 decimals) | | The premium | The strike for each contract |

You also need MetaMask or Phantom in the browser. The app's Connect button lists only those two; there is no WalletConnect or mobile QR connection, and other injected wallets are not offered.

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

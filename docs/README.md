# StonkHouse Docs

Stonkhouse lets you put NVDA Stock Tokens to work on Robinhood Chain (chain id 4663). You deposit into **your own account** and choose how much is for sale each week. If someone buys, you get paid in USDG. If they don't, you keep the stock. Only the amount you offered can be sold.

The first market is the **NVDA Stock Token**. Deposit at `app.stonkhouse.fun/account`. Buy at `app.stonkhouse.fun/book`. Factory: `0xc4A5Cd0DE91CaB7F5Ebe2114bc63Fbb43E642BBb`.

There is no protocol token, no points programme and no airdrop. Premium is paid to your wallet on the fill, less 5%. Strike USDG from assignment sits in the account until you collect it. The account implementation is locked; a fix would need a new factory and new accounts.

{% hint style="warning" %}
**Read these before anything else.**

* **Premium is paid only if a buyer fills.** A week with no buyer pays zero premium. Because calls are written only when they are bought, a week with no buyer also writes nothing.
* **Assignment can take the collateral at the strike.** Only lots you chose to write, and that actually sold, can be assigned. The upside above the strike is given up on those lots, and v1 does not buy the stock back.
* **Idle NVDA is not written.** Lots you did not request cannot be assigned.
* **Stock Tokens are debt securities.** They are issued by Robinhood Assets (Jersey) Limited. They are not Nvidia shares and carry no vote, and the issuer can pause transfers, blocklist addresses (your account included) and burn tokens from any address.
* **Stonkhouse is not available to US persons.** This is a restriction in the Terms of Use, not a technical control.
* You can lose the collateral you deposit.
{% endhint %}

## Status

{% hint style="danger" %}
The factory is `0xc4A5Cd0DE91CaB7F5Ebe2114bc63Fbb43E642BBb` on chain 4663. Every address is on [Contracts and addresses](protocol/addresses.md).

**Admin is a hot wallet with no timelock.** See [Roles and admin powers](protocol/roles.md).
{% endhint %}

* Stonkhouse's clearinghouse, `0x53d7A6d0489Daf3d67b9A314e0eAB2B78Acab9C6`, is not yet source-verified; its runtime bytecode equals Valorem's upstream code apart from the metadata hash.
* The keeper's alerts are logged but not yet delivered to any channel.
* The earlier pooled vault (`cNVDA`, `0x88a98931E3682137E7e4D3426f623247f4A4ecbb`) is closed. Collect leftover redemptions at `app.stonkhouse.fun/collect`.

These docs contain no performance figures. Live week 1 (set 2026-09-15): strike 223 USDG, ask 1.000000 USDG, exercise Friday 18 September 2026, 4:00pm ET.

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
* [Depositing](getting-started/depositing.md), [Withdrawing](getting-started/withdrawing.md) and [Claiming USDG](getting-started/claiming-usdg.md): what each action does and what can block it.
* [Buying calls](product/buying-calls.md): how a buyer fills a listed lot, and how to exercise.
* [Fees](product/fees.md) and [Assignment](product/assignment.md): the two things that decide what a week leaves you with.
* [Risks](product/risks.md): the full list. Read it before depositing.
* [Launch policy and hard caps](product/policy.md): the limits compiled into the contracts.
* [Architecture](protocol/architecture.md) and [Accounting](protocol/accounting.md): the technical reference.

## No affiliation

Stonkhouse is an independent project. It is not affiliated with, endorsed by, or operated by Robinhood Markets, Inc., Robinhood Assets (Jersey) Limited, Valorem, or the issuers of USDG or Seaport. Nothing in these docs is investment, legal or tax advice, and nothing here is an offer of securities.

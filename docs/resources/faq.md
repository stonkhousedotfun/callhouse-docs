# FAQ

### Is Stonkhouse live? Where is the factory?

Yes. Factory `0xc4A5Cd0DE91CaB7F5Ebe2114bc63Fbb43E642BBb` on Robinhood Chain. Deposit at `app.stonkhouse.fun/account`. Buy at `app.stonkhouse.fun/book`. Check every address on [Contracts and addresses](../protocol/addresses.md).

### Is it a pooled vault? What is cNVDA?

No. The live product is one isolated account per user. There is no share token. `cNVDA` was the share of the **closed** pooled vault at `0x88a98931E3682137E7e4D3426f623247f4A4ecbb`. Collect leftover redemptions from that vault at `app.stonkhouse.fun/collect`.

### Is it audited?

No. No external audit firm has reviewed the contracts yet. An external audit is pending, with no report yet. Internal reviews of the earlier vault led to write-on-fill; they are not an audit of the live factory. See [Security and audits](../protocol/security.md).

### What does a week pay?

Whatever a buyer paid for **your** listed NVDA, less 5%, and nothing if nobody bought. Premium lands in your wallet on the fill. Stonkhouse does not publish an APY or an APR.

### What happens in a week nobody buys?

You keep the stock. Nothing is written. No fee. Settle after expiry to unlock listed lots.

### Why was my fill refused?

The account re-checks at fill time. Usual reasons: spot rose through the 3% OTM floor or the 0.40% premium floor; the sale window closed at the exercise timestamp; writes are halted; the oracle is stale or paused; the lot already filled or the account settled; not enough USDG or no Seaport approval. See [Buying calls](../product/buying-calls.md).

### What fees do I pay?

5% of the ask, taken in the Seaport order. Never on deposits, idle NVDA, strike proceeds, or an unfilled week. Ceiling 20%. Valorem's 15 bps engine fee is off. See [Fees](../product/fees.md).

### Can I withdraw at any time?

Idle NVDA: yes. Listed lots: after `settle`, once that account's expiry has passed. There is no redeem queue.

### Does my USDG expire?

No. Premium is already in your wallet. Strike USDG sits in the account until you collect it.

### What if the keeper stops running?

It can skip a week (`setWeek` is keeper-only) and leave requested lots unlist. It cannot trap NVDA: idle withdraws still work, live lots still fill on chain, and anyone can `settle` after that account's expiry.

### What if the issuer freezes NVDA transfers?

Deposits, idle withdrawals and fills that move NVDA stop. Premium already paid to your wallet is yours. A claim that cannot be redeemed waits for a later `settle`. An issuer burn of tokens in your account is a loss of that NVDA.

### Can the team change the rules, or take my tokens?

Factory admin is a single hot key (`0xEb82…9d9b`) with no timelock, and it is also the fee recipient. It can change policy inside compiled caps, the cap, the fee recipient and roles. It has no function that transfers your tokens. The keeper cannot withdraw. The guardian can only halt writes. See [Roles and admin powers](../protocol/roles.md).

### Can I use Stonkhouse from the United States?

No. Stonkhouse is not available to US persons, including buying calls. The restriction is in the Terms of Use; there is no technical block.

### Who operates Stonkhouse, and which terms apply?

`stonkhouse.fun/terms` and `/privacy` cover the site and the app. No operating entity and no governing law have been designated yet.

### I bought a call. How do I exercise it?

On `app.stonkhouse.fun/book`, during that option's window. Week 1: from Friday 18 September 2026, 4:00pm ET, until that seller's expiry (base Saturday 19 September 2026, 4:00pm ET, plus the account index in seconds). You can also call `exercise` on the clearinghouse `0x53d7…C6` after approving strike × contracts in USDG.

### Earlier material mentions Overcall, a vault, or `/vault/nvda/cycle`.

Overcall is history. `/vault/nvda/cycle` redirects to `/book`. The pooled vault is closed; `/vault/nvda` and `/collect` are only for leftover `cNVDA` redemptions.

### How do I report a security issue?

Email **security@stonkhouse.fun**. Do not open a public issue. There is no bug bounty. See [Security and audits](../protocol/security.md#reporting-a-vulnerability).

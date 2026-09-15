# FAQ

### Is Stonkhouse live? Where is the vault address?

Not yet. The Stonkhouse contracts are not deployed and have not been audited. The public site at `stonkhouse.fun` is live but never asks for a wallet, and the app at `app.stonkhouse.fun` is not deployed yet. The vault address will be published on [Contracts and addresses](../protocol/addresses.md) after deployment. Until it appears there, no address is the Stonkhouse vault.

### What does a week pay?

Whatever a buyer actually paid for that week's calls, less fees, and nothing if nobody bought. Premium is paid only if a buyer fills. Stonkhouse does not publish an APY, an APR or any annualised figure, and these docs contain no projections. Once the vault runs, every closed week is published in the app with the premium the vault received in USDG and the net premium after the protocol fee, including the weeks that paid zero. On an assigned week the strike proceeds are shown separately and left out of every premium figure, because they are your collateral sold at the strike, not premium. The app also shows each week's net premium per cNVDA and net premium as a share of the collateral, valued at spot at harvest. Both cover that week only, are never annualised, and leave out strike proceeds.

### What happens in a week nobody buys?

The premium is zero and no fee is charged. The unsold options expire, and when the week closes the vault redeems its Valorem claim and gets back its NVDA, less any contracts Valorem assigned to that claim. That can be more than zero even though the vault sold nothing: if other writers' contracts on the same strike were bought and exercised, Valorem spreads the assignment across every writer of that option (see [Assignment](../product/assignment.md)). On a thin order book an unfilled week is the most likely outcome, and it is a normal week, not an error.

### A buyer filled, so why didn't the cNVDA share price go up?

Premium is never added to the share price. The share price counts only NVDA: the vault's idle NVDA, less NVDA set aside for settled redemptions, plus what is locked in this week's Valorem claim. Deposits and redemptions leave it unchanged, apart from rounding in the vault's favour, and writing calls only moves NVDA into the claim. It falls when NVDA leaves the vault's holdings without shares being burned, as in an assignment. Premium arrives as a separate USDG balance that you claim. See [Claiming USDG](../getting-started/claiming-usdg.md).

### Why did my share price fall?

Most likely because the week was assigned. The share price counts only NVDA, and assignment is what removes NVDA from the vault without removing shares. Assignment can take the collateral at the strike: NVDA left the vault and strike USDG was credited to your claimable balance instead, without a fee. v1 does not buy the NVDA back, so the share price in NVDA terms stays lower. See [Assignment](../product/assignment.md).

### What fees do I pay?

Overcall takes 5% of gross premium inside each fill. Stonkhouse takes 5% of the premium the vault receives. Stacked, that is 9.75% of what the buyer paid. Neither of those fees is charged on deposits, on idle NVDA, on strike proceeds, or on a week with no buyer. The protocol fee can never exceed 20% of premium. Valorem Clear also has an engine fee of 15 bps of written notional. It is switched off today, and the vault will not write while it is on unless the admin accepts it. If accepted, it would be paid in NVDA from the vault on every write, filled or not. See [Fees](../product/fees.md).

### Can I withdraw at any time?

You can start a withdrawal at any time, but it completes instantly only while the vault is Idle with no calls written. While a call is open, your withdrawal goes through the redeem queue and pays out after the week closes: your pro-rata share of the NVDA in the vault at settlement, plus the USDG your own escrowed shares earned between the moment you queued and settlement. USDG credited to you before you queued stays claimable separately. If the week was assigned, part of that comes as strike USDG rather than NVDA. A queued redemption is never a promise of a fixed number of tokens. See [Withdrawing and the redeem queue](../getting-started/withdrawing.md).

### Can I cancel a queued redemption?

No. There is no function to take escrowed shares back. For the same reason, do not queue while the vault is Idle: redeem instantly instead, because a queued redemption waits for the next week's close.

### Why was my deposit rejected?

Usually one of three things. The cycle's exercise timestamp has passed, so deposits are closed until the week closes (`DepositsClosedForCycle`, or `WrongPhase` once the book is locked). The deposit would take the vault past its cap (`DepositCapExceeded`), which is 20 NVDA at deployment. Or the Stock Token issuer has frozen transfers. See [Depositing](../getting-started/depositing.md).

### Does my USDG expire?

No. The contracts set no deadline for claiming USDG or for completing a settled redemption. USDG is not reinvested; it waits until you claim it.

### What if the keeper stops running?

A stopped keeper can cost a skipped week, but it cannot strand your NVDA past the week. From one hour after expiry, anyone can call `rollClose` to redeem the vault's claim, settle the redeem queue and return the vault to Idle. See [The weekly cycle](../product/weekly-cycle.md).

### What if the issuer freezes NVDA transfers?

Stock Tokens are debt securities issued by Robinhood Assets (Jersey) Limited, and the issuer can freeze transfers. During a freeze you can still queue a redemption and claim USDG already credited to you. Anything that moves NVDA stops until the freeze lifts: deposits, instant redemptions, completing a queued redemption, writing and closing the week. There is no technical workaround. See [Risks](../product/risks.md).

### Can the team change the rules, or take my tokens?

At launch the vault admin is a single deployer key; it moves to a 2-of-3 Safe (the Admin Safe) after a handover. The admin can grant and revoke roles, and there is no timelock. It can change policy settings, but only inside hard caps compiled into the contracts. For example, it cannot sell calls closer than 1% above spot or set the protocol fee above 20% of premium. The keeper can propose trades but cannot move funds; the vault checks every proposal. The Guardian can only halt new writes and cancel listings. No Stonkhouse role can block a withdrawal. The contracts are not upgradeable. See [Launch policy and hard caps](../product/policy.md) and [Roles and admin powers](../protocol/roles.md).

### Is cNVDA Nvidia stock? Can I transfer it?

No. cNVDA is a vault share: a pro-rata claim on the NVDA Stock Tokens the vault holds, plus separately accrued USDG. The Stock Token underneath is itself not Nvidia equity and carries no vote. cNVDA is a standard ERC-20 token and can be transferred; USDG earned before a transfer stays with the sender. Do not send cNVDA to the vault's own address: that is not a withdrawal request, and shares sent there are never burned or paid out, so they are lost. To exit, redeem or queue a redemption instead; see [Withdrawing and the redeem queue](../getting-started/withdrawing.md). It is not listed anywhere, so there is no market to sell it into. There is no protocol token, no points programme and no airdrop.

### Can I use Stonkhouse from the United States?

No. Stonkhouse is not available to US persons. The same perimeter applies as to the Stock Tokens themselves.

### Who operates Stonkhouse, and which terms apply?

The Terms of Use at `stonkhouse.fun/terms` and the privacy notice at `stonkhouse.fun/privacy` cover both domains, and using either domain is use under them. No operating entity and no governing law have been designated yet; the pages state that gap rather than naming a placeholder. See [Risks](../product/risks.md#regulatory-perimeter).

### Can I use cNVDA as collateral somewhere else?

Nothing stops a transfer, but be careful how it is priced. The vault's `convertToAssets` counts NVDA only. It leaves out claimable USDG, strike USDG still inside the Valorem claim after an assignment, and the open short call. It is not a mark of what a share is worth. See [Accounting](../protocol/accounting.md#why-premium-is-not-in-the-share-price).

### How do I report a security issue?

Email **security@stonkhouse.fun**, and do not open a public issue. The contracts are unaudited, and a bug bounty is planned to open in the second week after mainnet launch. See [Security and audits](../protocol/security.md#reporting-a-vulnerability).

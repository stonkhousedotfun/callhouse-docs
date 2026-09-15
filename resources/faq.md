# FAQ

### Is Callhouse live? Where is the vault address?

Not yet. The Callhouse contracts are not deployed and are unaudited. The public site at `callhouse.finance` is live but never asks for a wallet, and the app at `app.callhouse.finance` has no vault to show until one is deployed. The vault address will be published on [Contracts and addresses](../protocol/addresses.md) after deployment. Until it appears there, no address is the Callhouse vault.

### Is it audited?

No. The contracts are unaudited: no external audit firm has reviewed them, and none is planned before launch. The gate is the test suite (unit and invariant tests, plus fork tests against the live chain's state that fill through Seaport 1.6, exercise on the Valorem clearinghouse and freeze the vault on USDG) and an internal review. The internal review of the redesigned contracts reported no Critical, High or Medium finding. Its one Low finding, a contract buyer depositing in the middle of its own fill, has been fixed (see [Depositing](../getting-started/depositing.md#a-deposit-inside-a-fill-is-refused)). It also noted that on Callhouse's own clearinghouse the admin key holds Valorem's fee switch (see [What fees do I pay?](#what-fees-do-i-pay)). That review was done by the people who built Callhouse. It is not an external audit and should not be read as one. See [Security and audits](../protocol/security.md).

### What does a week pay?

Whatever buyers actually paid for that week's calls, less the protocol fee, and nothing if nobody bought. Premium is paid only if a buyer fills. Callhouse does not publish an APY, an APR or any annualised figure, and these docs contain no projections. Once the vault runs, every closed week is published in the app with the premium the vault received in USDG and the net premium after the protocol fee, including the weeks that paid zero. On an assigned week the strike proceeds are shown separately and left out of every premium figure, because they are your collateral sold at the strike, not premium. The app also shows each week's net premium per cNVDA and net premium as a share of the collateral, valued at spot at harvest. Both cover that week only, are never annualised, and leave out strike proceeds.

### What happens in a week nobody buys?

The premium is zero and no fee is charged. Nothing is written either: the vault writes calls only inside a buyer's fill, so an unsold week locks no NVDA in Valorem, opens no claim and cannot be assigned. The week closes flat and instant redemption opens again. An unfilled week is the most likely outcome on a thin market, and it is a normal week, not an error.

### Why was my fill refused?

The vault re-checks every fill at the moment it happens, against the price feed at that moment, and the app's fill page simulates your fill before it enables the button. The usual reasons:

* **Spot has risen since the order was listed.** If the price per contract is now under the premium floor at live spot, the fill reverts with `PremiumBelowFloorAtFill`, and the keeper cancels and relists at the new floor, within three listings a week. If the rise has taken the strike under the band's lower bound (3% above spot at launch), the fill reverts with `StrikeBelowBand`. No new price fixes that, because the strike belongs to the week's option: that week sells no more calls unless spot falls back.
* **The sale window has closed.** No fill is accepted from the exercise timestamp (`WriteWindowClosed`), and the order itself ends then.
* **The size no longer fits.** Capacity is measured again at every fill against the NVDA the vault holds at that moment. If it has shrunk, a large fill can be refused (`ContractsAboveUtilization` or `ContractsAboveCap`). Try fewer contracts.
* **Sales are stopped.** The guardian has halted writes (`WritesAreHalted`), the Stock Token's oracle is paused (`OraclePaused`), the price feed is older than the vault's limit of four days (`StalePrice`), or Valorem's engine fee has been switched on and not accepted (`ValoremFeeNotAccepted`).
* **The order is no longer the vault's live order.** It was cancelled, sold out, or replaced by a reprice. The fill page always shows the current one.
* **Something on your side.** Not enough USDG, no USDG approval to Seaport, USDG paused or your address frozen by USDG, or a receiving account that cannot accept ERC-1155 tokens.

A refused fill reverts as a whole: nothing is written and no USDG moves, though a transaction that is sent and reverts still costs gas. See [Buying calls](../product/buying-calls.md).

### A buyer filled, so why didn't the cNVDA share price go up?

Premium is never added to the share price. The share price counts only NVDA: the vault's idle NVDA, plus what is locked in this week's Valorem claim, less NVDA set aside for settled redemptions. Deposits and redemptions leave it unchanged, apart from rounding in the vault's favour, and a fill only moves NVDA into the claim. It falls when NVDA leaves the vault's holdings without shares being burned, as in an assignment. Premium arrives as a separate USDG balance that you claim. See [Claiming USDG](../getting-started/claiming-usdg.md).

### Why did my share price fall?

Most likely because the week was assigned. The share price counts only NVDA, and assignment is what removes NVDA from the vault without removing shares. Assignment can take the collateral at the strike: NVDA left the vault and strike USDG was credited to your claimable balance instead, without a fee. v1 does not buy the NVDA back, so the share price in NVDA terms stays lower. See [Assignment](../product/assignment.md). The other cause, far rarer, is the Stock Token issuer burning tokens held by the vault.

### What fees do I pay?

One Callhouse fee: 5% of the premium buyers pay. The whole premium reaches the vault, and no other party takes a cut of a fill. The protocol fee is never charged on deposits, on idle NVDA, on strike proceeds, or on a week with no buyer, and it can never exceed 20% of premium. See [Fees](../product/fees.md).

Valorem's clearinghouse also has an engine fee of 15 bps of written notional. It is switched off, and the vault refuses to arm a week or accept a fill while it is on unless the admin has explicitly accepted it. If it were ever on and accepted, every fill would pay 15 bps of the contracts' notional in NVDA from the vault to the clearinghouse, and the vault would raise that fill's floor so the buyer pays at least the fee's value at spot in USDG; exercising would also cost the exercising holder 15 bps of the strike. The launch plan is Callhouse's own instance of the clearinghouse, whose fee switch is held by the admin address named when it is deployed. On that instance one key would hold both the switch and the acceptance, with no delay.

### Can I withdraw at any time?

You can start a withdrawal at any time, but it completes instantly only while the vault is Idle with nothing written. Otherwise it goes through the redeem queue and pays out when the queue settles: at the week's `rollClose`, or, while the vault is Idle, when anyone calls `settleQueue`. You receive your pro-rata share of the idle NVDA at settlement, plus the USDG your own escrowed shares earned between the moment you queued and settlement. USDG credited to you before you queued stays claimable separately. If the week was assigned, part of that comes as strike USDG rather than NVDA, and if the week's claim is stranded, part of it waits until the claim is redeemed. A queued redemption is never a promise of a fixed number of tokens. See [Withdrawing and the redeem queue](../getting-started/withdrawing.md).

### Can I cancel a queued redemption?

No. There is no function to take escrowed shares back. While the vault is Idle with nothing written, redeem instantly instead: the queue needs a `settleQueue` and a `completeRedeem` after it, and if a new week is armed first your shares stay exposed to it.

### Why was my deposit rejected?

Usually `DepositsClosed`, the one error the vault uses for every closing reason: the week's exercise timestamp has passed, the vault is not Idle or Listed, assignment proceeds are still inside the Valorem claim, a claim is stranded, an issuer burn has left the vault short of what it owes settled redeemers, the share price is below the share-price floor, or a fill already happened earlier in the same transaction. Otherwise the deposit would take the vault past its cap (`DepositCapExceeded`), which is 20 NVDA at deployment, or the Stock Token issuer has stopped the transfer. See [Depositing](../getting-started/depositing.md).

### Does my USDG expire?

No. The contracts set no deadline for claiming USDG or for completing a settled redemption. USDG is not reinvested; it waits until you claim it.

### What is a stranded claim?

A week's claim that `rollClose` could not redeem. Valorem's `redeem` sends the claim's strike USDG and its unassigned NVDA to the vault in one call, and a token issuer can make that call revert: USDG paused, the vault or the clearinghouse frozen by USDG, or the vault blocklisted on the NVDA Stock Token in a week that was not fully assigned. Rather than let that stop the vault, `rollClose` returns it to Idle and keeps the claim. While the claim is stranded, deposits and instant redemption are closed and no new week can be armed. The redeem queue still works: an epoch settled then is paid its share of the idle NVDA straight away and its share of the claim once the claim is redeemed. Anyone can call `retryStrandedClaim()`; it reverts while the cause persists and redeems the claim the first time Valorem lets it through. See [How Callhouse works](../getting-started/how-it-works.md#when-the-claim-cannot-be-redeemed).

### Who can close the week?

Anyone, in the end. Only opening a week needs a Callhouse role.

| Action | Who | When |
|---|---|---|
| `rollOpen` (arm the week) and `approveListing` | The keeper only | While Idle, and while Listed for listings |
| `lockBook` | Anyone | From the exercise timestamp. Optional: deposits and fills close on the clock anyway. |
| `rollClose` | The keeper | From expiry |
| `rollClose` | Anyone | From one hour after expiry |
| `settleQueue` | Anyone | While the vault is Idle and shares are queued |
| `retryStrandedClaim` | Anyone | While a claim is stranded |
| `sweepFee` | Anyone | While a protocol fee is waiting. It always pays the stored fee recipient, never the caller. |

### What if the keeper stops running?

A stopped keeper can cost a skipped week, because only the keeper can arm a week and authorise a listing, but it cannot trap your NVDA. An order already authorised keeps working on the vault's own checks, although the app's fill page gets the order's details from the keeper and cannot offer a fill while it is down. From one hour after expiry anyone can call `rollClose` to redeem the vault's claim, settle the redeem queue and return the vault to Idle, and `lockBook`, `settleQueue` and `retryStrandedClaim` need no role at all. See [The weekly cycle](../product/weekly-cycle.md).

### What if the issuer freezes NVDA transfers?

Stock Tokens are debt securities issued by Robinhood Assets (Jersey) Limited, and the issuer can pause transfers, blocklist addresses and burn tokens from any address. During a pause, or a blocklist of the vault, you can still queue a redemption, settle the queue while the vault is Idle, and claim USDG already credited to you. Anything that moves NVDA stops until the restriction lifts: deposits, instant redemptions, the NVDA leg of a completed redemption, and fills, because a fill moves NVDA into Valorem. The week still closes; if the claim's NVDA cannot come back to the vault, the claim is stranded until it can. If the issuer burns the vault's tokens, the share price reads the loss, deposits close, and settled redemptions are paid pro rata. There is no technical workaround. See [Risks](../product/risks.md).

### Can the team change the rules, or take my tokens?

At launch the vault admin is a single deployer key; it moves to a 2-of-3 Safe (the Admin Safe) after a handover. There is no timelock on either. The admin can grant and revoke roles, set the deposit cap and the fee recipient, accept Valorem's engine fee, and change policy settings, but only inside hard caps compiled into the contracts: for example, it cannot sell calls closer than 1% above spot, set the premium floor under 0.10% of spot, or set the protocol fee above 20% of premium. The keeper creates each week's option and prices the listing, inside the vault's checks, and cannot move funds. The guardian can halt new weeks, listings and fills and cancel listings. No Callhouse role has a function that transfers depositors' tokens, and none can block a withdrawal. The contracts are not upgradeable.

That does not mean a key cannot cost you money. A compromised keeper could arm the lowest strike the band allows and sell the whole capacity at the premium floor to a buyer it controls. The contracts' own threat model estimates that at about 1.1% of the sold notional per week at 50% implied volatility. A compromised admin could first lower the policy to the compiled floors, for about 2.2% per week, and raise the fee to its ceiling. On Callhouse's own clearinghouse the admin key also holds Valorem's fee switch (see [What fees do I pay?](#what-fees-do-i-pay)). See [Launch policy and hard caps](../product/policy.md) and [Roles and admin powers](../protocol/roles.md).

### Is cNVDA Nvidia stock? Can I transfer it?

No. cNVDA is a vault share: a pro-rata claim on the NVDA Stock Tokens the vault holds, plus separately accrued USDG. The Stock Token underneath is itself not Nvidia equity and carries no vote. cNVDA is a standard ERC-20 token and can be transferred; USDG earned before a transfer stays with the sender. Do not send cNVDA to the vault's own address: that is not a withdrawal request, and shares sent there are never burned or paid out, so they are lost. To exit, redeem or queue a redemption instead; see [Withdrawing and the redeem queue](../getting-started/withdrawing.md). It is not listed anywhere, so there is no market to sell it into. There is no protocol token, no points programme and no airdrop.

### Can I use Callhouse from the United States?

No. Callhouse is not available to US persons. The same perimeter applies as to the Stock Tokens themselves, and it applies to buying the vault's calls as well as to depositing.

### Who operates Callhouse, and which terms apply?

The Terms of Use at `callhouse.finance/terms` and the privacy notice at `callhouse.finance/privacy` cover both domains, and using either domain is use under them. No operating entity and no governing law have been designated yet; the pages state that gap rather than naming a placeholder. See [Risks](../product/risks.md#regulatory-perimeter).

### Can I use cNVDA as collateral somewhere else?

Nothing stops a transfer, but be careful how it is priced. The vault's `convertToAssets` counts NVDA only. It leaves out claimable USDG, strike USDG still inside the Valorem claim after an assignment, and the open short calls. It is not a mark of what a share is worth. See [Accounting](../protocol/accounting.md#why-premium-is-not-in-the-share-price).

### Earlier material mentions Overcall and a registry. Does Callhouse still use them?

No. **History note:** earlier designs listed the vault's calls through Overcall's order book, paid Overcall a share of each fill and took each week's strikes from Overcall's on-chain registry. The current vault does none of that. The keeper creates each week's option itself, the vault checks it against the clearinghouse, and the calls are sold through the vault's own Seaport order, on the app's fill page or through any Seaport 1.6 client, with no third-party fee.

### How do I report a security issue?

Email **security@callhouse.finance**, and do not open a public issue. The contracts are unaudited, and a bug bounty is planned to open in the second week after mainnet launch. See [Security and audits](../protocol/security.md#reporting-a-vulnerability).

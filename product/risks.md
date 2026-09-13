# Risks

This is the full list. Most of these are not bugs and have no fix. They are the shape of writing covered calls against a tokenised security on a one-week clock, through contracts other people control.

{% hint style="danger" %}
**You can lose the collateral you deposit.** The Callhouse contracts are **not deployed and have not been audited**. The vault address will be published on [Contracts and addresses](../protocol/addresses.md) after deployment.
{% endhint %}

{% hint style="warning" %}
* Premium is paid only if a buyer fills.
* Assignment can take the collateral at the strike.
* Stock Tokens are debt securities.
* Callhouse is not available to US persons.
{% endhint %}

## The ordinary outcomes

### An empty book: weeks that pay zero

The vault writes and lists a call, and nobody buys it before the book closes. The option expires unsold and the week's premium is zero. On a thin book for weekly calls on a tokenised stock, this is the most likely outcome.

**Costs you:** the week's premium, which is zero, and the time. No fee is charged on a week that collected nothing. There is no dealer obliged to take the other side, and no protocol token or emission to top up an empty week. An unsold week is not automatically a safe week: if other writers' contracts on the same strike were bought and exercised, Valorem can assign part of the exercise to the vault's claim even though the vault sold nothing (see below).

**What the system does:** publishes the week alongside the filled ones with premium 0: status `unfilled`, or `assigned` if Valorem assigned part of the vault's claim anyway. If Overcall's listings API rejects or drops the order, the app's cycle page falls back to the keeper: it fetches the keeper's signed order, checks it against the chain (Seaport's counter and order hash must match the listing the vault authorised, every leg must pay the vault and Overcall's 5%, and the order must not be cancelled or sold out), and offers a fill from the page, labelled as the keeper's listing. Buyers who only browse Overcall will not see it there, so a rejected order still makes an unfilled week more likely.

### Assignment caps your upside

Anyone holding the option the vault wrote (the same strike and cycle) can exercise it during the exercise window, including holders of contracts that other writers sold. Valorem assigns those exercises across all writers of that option, so the vault can be assigned whether or not its own listing filled. For each assigned contract, Valorem takes NVDA at the strike and the vault receives strike USDG, credited to depositors without a fee.

**Costs you:** all upside above the strike for that week, and the NVDA itself. v1 does not buy it back, so the vault ends the week underweight NVDA and the share price in NVDA terms falls. If NVDA gaps up and keeps going, you sold the move for a week's premium. See [Assignment](assignment.md).

### Depositing into an open week

Deposits stay open while a call is live, until the exercise timestamp. The share price counts the NVDA locked behind the call at face value and does not subtract what the call could cost, and every share carries the week's result.

**Costs you:** if you deposit while NVDA is above the strike, you pay full price for shares whose collateral may be assigned at the strike, and your shares take their pro rata part of that loss. Deposits made while the vault is Idle are not exposed this way. Deposits close at the exercise timestamp, and as soon as any contract is assigned.

### Partial assignment

Valorem assigns by bucket, not perfectly pro rata, so part of the vault's position can be assigned and part not. Assignment is spread across everyone who wrote the same option, whether or not their own tokens were sold, so the vault's exposure is every contract it wrote, while its premium comes only from the contracts it sold.

**Costs you:** predictability, and possibly assignment on contracts that never earned a premium. A redemption from an open week can come back partly in USDG, and the split is not known until the week closes.

### Withdrawals queue

While a call is open, the NVDA behind it is locked in Valorem until expiry. A withdrawal started mid-week settles only when the week closes, and a queued redemption cannot be cancelled. cNVDA is not listed anywhere, so there is no secondary market to exit into. See [Withdrawing and the redeem queue](../getting-started/withdrawing.md).

## The asset and the stablecoin

### Stock Token issuer freeze or oracle pause

Stock Tokens are debt securities issued by Robinhood Assets (Jersey) Limited. They are not shares: no vote, no claim on Nvidia, and you carry the issuer's credit risk. If the issuer fails, the token does not survive independently of it. The issuer can freeze or restrict transfers, blocklist the vault, burn tokens from any holder including the vault (`adminBurn`), and upgrade the token contract, each from a single key with no timelock. The token can also pause its own price oracle.

**Costs you:** in the mild case, weeks of nothing. In the severe case, the instrument itself.

**What the system does:** there is no technical mitigation. That is the asset. What the contracts do ensure is that a freeze never traps you procedurally:

| During an issuer freeze | Works? |
|---|---|
| Queueing a redemption | Yes. It moves no NVDA; only your cNVDA moves into the vault's escrow. |
| Claiming USDG already credited to you | Yes. It moves only USDG. |
| Depositing, instant redemption, completing a queued redemption | No. Each moves NVDA. |
| Writing a new call, or closing the week with `rollClose` | No. Each moves NVDA into or out of Valorem. |

An oracle pause on the Stock Token stops the vault writing and listing, and nothing else. The vault refuses to write against a paused oracle rather than writing blind. Settlement never reads the oracle, and the pause does not block NVDA transfers, so `rollClose`, the redeem queue and USDG claims keep working through an oracle pause. A transfer freeze, not an oracle pause, is what can stop settlement.

### USDG

Premium and strike proceeds are paid in USDG, a third-party stablecoin, so you carry whatever risk USDG carries. USDG is an upgradeable contract whose admin, a timelock with a 24-hour delay, is outside Callhouse's control. A separate single key can pause USDG, freeze an address, and wipe the USDG balance of a frozen address, the vault's included. A paused USDG or a frozen address would stop USDG claims and USDG payouts until it is resolved. The vault is built so that a USDG-side problem with the protocol fee cannot block the close of a week.

That protection covers the fee only. `rollClose` is the only function that redeems the Valorem claim, and it has no alternative unwind, rescue function or upgrade path. If redeeming the claim reverts, for example because USDG has frozen the vault's address on a week with strike proceeds to receive, or because the Stock Token issuer has frozen transfers, the collateral stays in Valorem and the redeem queue stays unsettled until the obstruction is lifted.

## Code and keys

### Smart contract risk

**The Callhouse contracts have not been audited.** An internal adversarial review across 13 surfaces raised 72 findings, of which 51 survived refutation. The contract defects recorded as fixed from it carry regression tests, and two more contract defects (lot size and redeem-queue fairness) found during documentation review on 2026-09-13 were fixed the same way. The project's documents do not say that every surviving finding was fixed. That review was done by the people who wrote the code. It is not an audit and does not substitute for one. An external audit is planned and has not happened.

Valorem Clear was audited by Zellic in 2022–2023 under its former name, OptionSettlementEngine. That audit covers Valorem, not this vault. There is no proxy and no upgrade key, so a bug means a new vault and a migration, not a silent patch.

**Costs you:** in the worst case, everything deposited. The deposit cap, 20 NVDA at deployment, is the honest measure of how much confidence this deserves. Details: [Security and audits](../protocol/security.md).

### Keeper failure

The keeper is one hot key running a weekly state machine against a third-party cycle. It can crash, run out of gas, or miss the window.

**Costs you:** a skipped week if it stops before the write. If it stops after the write but before the calls are listed or sold, the collateral stays locked until expiry and the week earns nothing. If it stops after a fill, only delay.

**What the system does:** a stopped keeper cannot strand collateral past the week.

* `lockBook` is open to anyone from the exercise timestamp.
* Deposits close on the exercise timestamp without anyone calling anything.
* `rollClose` is open to anyone one hour after expiry. Anyone can redeem the claim, settle the queue and return the vault to Idle.
* A halt on writes never blocks redemptions, USDG claims or the close of a week.

### Keeper key compromise

No off-chain component can move money. The vault is the Valorem writer and the Seaport seller, and it checks every field the keeper proposes against the current policy (the out-of-the-money band, the premium floor, the utilisation ceiling and the contract cap, all set by the admin inside caps compiled into the contracts) and against the compiled 21-day cycle limit and one-token lot size.

**Costs you:** skipped weeks, or writes and listings on the least favourable terms the current policy allows (the lowest in-band strike, the largest size, a price at the premium floor), filled by a buyer the attacker controls. That moves option value to the buyer. A fully compromised keeper still cannot take a token out of the vault, route premium to itself or step outside the policy. See [Roles and admin powers](../protocol/roles.md).

### Admin judgment

The vault admin sets policy inside compiled caps: the out-of-the-money band, the premium floor, the utilisation ceiling, the protocol fee, the contract cap, the deposit cap, the price-age limit, the fee recipient, and whether to accept Valorem's engine fee. It can also halt and unhalt writes and appoint the keeper and guardian. At launch the admin is a single deployer key; it is handed to a 2-of-3 Safe later. There is no timelock in v1.

**Costs you:** the caps rule out the worst moves. Nobody can sell calls closer than 1% above spot, set the protocol fee above 20% of premium, or charge a fee on strike proceeds. They do not rule out bad settings inside the caps. A band set too tight means weeks where no strike qualifies. A band set too loose means assignment becomes routine. The deposit cap and the contract cap have no compiled ceiling. See [Launch policy and hard caps](policy.md) and [Roles and admin powers](../protocol/roles.md).

## Oracle

The vault reads a Chainlink NVDA/USD feed for two things only: to display a spot price, and to gate writes and listings, so it refuses to write a strike or authorise a listing against a stale price. A pause of the Stock Token's own oracle blocks writes and listings the same way. **The feed is never read when the week settles.** Whether a call is exercised is decided by whoever holds it, and what the vault gets back is decided by Valorem.

The NVDA feed is a US-equities 24/5 feed: it stops updating when the US equity market is closed and restarts on Sunday at 20:00 ET. The project's feed recon observed gaps of about 17 hours inside the week, about 52 hours over a normal weekend and about 78 hours over a three-day holiday weekend. Overcall's write window stays open across those gaps, so the vault accepts a price up to 4 days old at launch; a tighter limit would block writing every weekend. While the market is shut, Friday's close is the relevant price. The bound is compiled to between 1 hour and 7 days, and a gap longer than the setting (for example a longer market closure) blocks writing until the feed updates.

**Costs you:** a broken or stale feed means a skipped week, which is the safe direction. Robinhood Chain has no sequencer uptime feed, so a sequencer outage shows up as a stale price and blocks writes.

## Third parties in the path

Callhouse sits on contracts and services it does not control, and none of them can be overridden from the vault.

| Dependency | What it does | What can go wrong |
|---|---|---|
| **Overcall registry** | Publishes the weekly cycle, strikes and deadlines for the NVDA market | It is controlled by a single third-party key. The vault refuses a malformed cycle: over 21 days, a lot size other than one token, or options that do not match the cycle. Those failures cost a skipped week. The vault does not second-guess strikes that sit inside its policy band. |
| **Overcall listings API** | Shows the vault's listing to buyers on Overcall | It can reject or drop an order. An invisible listing is an unfilled week. The app's cycle page then offers the keeper's signed order instead, after checking it against the chain, but buyers browsing Overcall will not see it. |
| **Valorem Clear** | Holds the collateral, mints the options, settles assignment | Its engine fee (15 bps of notional, currently off) can be switched on by a third party. The vault then stops writing until the admin accepts the fee. |
| **Seaport 1.6** | The listing and fill contract | Third-party code outside Callhouse's control |
| **Robinhood Chain** | The chain the vault runs on | A centralised sequencer. An outage near the book close means no live listing when buyers are looking. |

## Regulatory perimeter

Callhouse is not available to US persons. The same perimeter applies as to the Stock Tokens, which are offered outside the United States under their issuer's own terms. Access is restricted by the Terms of Use, not by a technical control: there is no geoblock, no wallet screening and no accept step, and no know-your-customer process is run. You are responsible for your own eligibility and for any tax or reporting consequences. Nothing in these docs is investment, legal or tax advice, or an offer of securities.

The legal documents are published on the public site:

* **Terms of Use** at `callhouse.finance/terms`, covering both `callhouse.finance` and `app.callhouse.finance`. Using either domain is use under them. They also require you to be at least 18, able to enter a binding agreement, and not barred by sanctions or by the law of your jurisdiction. If you are in a jurisdiction where these instruments are not offered, do not use the interface.
* **Privacy notice** at `callhouse.finance/privacy`.
* **The perimeter disclosure** at `callhouse.finance/legal`.

The documents in force are version `v2-2026-09-13`. They were adopted by the project owner without review by counsel. **No operating entity and no governing law have been designated yet**, and the pages say so in words rather than naming a placeholder. The contracts themselves are on a public chain and are not governed by the Terms.

## Related

* [Security and audits](../protocol/security.md)
* [FAQ](../resources/faq.md)

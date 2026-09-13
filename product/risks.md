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

**Costs you:** the week's premium, which is zero, and the time. No fee is charged on a week that collected nothing. There is no dealer obliged to take the other side, and no protocol token or emission to top up an empty week.

**What the system does:** publishes the week as "unfilled, 0" alongside the filled ones. If Overcall's listings API rejects the order, the signed order is published on the app's cycle page so a buyer can fill it directly.

### Assignment caps your upside

A buyer can exercise during the exercise window. Valorem takes NVDA at the strike and the vault receives strike USDG, credited to depositors without a fee.

**Costs you:** all upside above the strike for that week, and the NVDA itself. v1 does not buy it back, so the vault ends the week underweight NVDA and the share price in NVDA terms falls. If NVDA gaps up and keeps going, you sold the move for a week's premium. See [Assignment](assignment.md).

### Partial assignment

Valorem assigns by bucket, not perfectly pro rata, so part of the vault's position can be assigned and part not.

**Costs you:** predictability. A redemption from an open week can come back partly in USDG, and the split is not known until the week closes.

### Withdrawals queue

While a call is open, the NVDA behind it is locked in Valorem until expiry. A withdrawal started mid-week settles only when the week closes, and a queued redemption cannot be cancelled. cNVDA is not listed anywhere, so there is no secondary market to exit into. See [Withdrawing and the redeem queue](../getting-started/withdrawing.md).

## The asset and the stablecoin

### Stock Token issuer freeze or oracle pause

Stock Tokens are debt securities issued by Robinhood Assets (Jersey) Limited. They are not shares: no vote, no claim on Nvidia, and you carry the issuer's credit risk. If the issuer fails, the token does not survive independently of it. The issuer can freeze or restrict transfers and can upgrade the token contract. The token can also pause its own price oracle.

**Costs you:** in the mild case, weeks of nothing. In the severe case, the instrument itself.

**What the system does:** there is no technical mitigation. That is the asset. What the contracts guarantee is that a freeze never traps you procedurally:

| During an issuer freeze | Works? |
|---|---|
| Queueing a redemption | Yes. It moves no tokens. |
| Claiming USDG already credited to you | Yes. It moves only USDG. |
| Depositing, instant redemption, completing a queued redemption | No. Each moves NVDA. |
| Writing a new call, or closing the week with `rollClose` | No. Each moves NVDA into or out of Valorem. |

An oracle pause on the Stock Token stops the vault writing and listing. The vault refuses to write against a paused oracle rather than writing blind.

### USDG

Premium and strike proceeds are paid in USDG, a third-party stablecoin, so you carry whatever risk USDG carries. USDG is an upgradeable contract whose admin keys are outside Callhouse's control. A paused USDG or a blocklisted address would stop USDG claims and USDG payouts until it is resolved. The vault is built so that a USDG-side problem with the protocol fee cannot block the close of a week.

## Code and keys

### Smart contract risk

**The Callhouse contracts have not been audited.** An internal adversarial review across 13 surfaces raised 72 findings, of which 51 survived refutation. All of those are fixed and carry regression tests. That review was done by the people who wrote the code. It is not an audit and does not substitute for one. An external audit is planned and has not happened.

Valorem Clear was audited by Zellic in 2022–2023 under its former name, OptionSettlementEngine. That audit covers Valorem, not this vault. There is no proxy and no upgrade key, so a bug means a new vault and a migration, not a silent patch.

**Costs you:** in the worst case, everything deposited. The deposit cap, 20 NVDA at deployment, is the honest measure of how much confidence this deserves. Details: [Security and audits](../protocol/security.md).

### Keeper failure

The keeper is one hot key running a weekly state machine against a third-party cycle. It can crash, run out of gas, or miss the window.

**Costs you:** a skipped week if it stops before the write. Delay, and nothing more, if it stops after.

**What the system does:** a stopped keeper cannot strand collateral past the week.

* `lockBook` is open to anyone from the exercise timestamp.
* Deposits close on the exercise timestamp without anyone calling anything.
* `rollClose` is open to anyone one hour after expiry. Anyone can redeem the claim, settle the queue and return the vault to Idle.
* A halt on writes never blocks redemptions, USDG claims or the close of a week.

### Keeper key compromise

No off-chain component can move money. The vault is the Valorem writer and the Seaport seller, and it checks every field the keeper proposes against caps compiled into the contracts: the out-of-the-money band, the premium floor, the utilisation ceiling, the contract cap and the 21-day cycle limit.

**Costs you:** a wasted week and some gas. A fully compromised keeper cannot take a token out of the vault.

### Admin judgment

The Admin Safe, a 2-of-3 multisig, sets policy inside compiled caps: the out-of-the-money band, the premium floor, the utilisation ceiling, the protocol fee, the contract cap, the deposit cap, the price-age limit, the fee recipient, and whether to accept Valorem's engine fee. There is no timelock in v1.

**Costs you:** the caps rule out the worst moves. Nobody can sell calls closer than 1% above spot, set the protocol fee above 20% of premium, or charge a fee on strike proceeds. They do not rule out bad settings inside the caps. A band set too tight means weeks where no strike qualifies. A band set too loose means assignment becomes routine. The deposit cap and the contract cap have no compiled ceiling. See [Launch policy and hard caps](policy.md) and [Roles and admin powers](../protocol/roles.md).

## Oracle

The vault reads a Chainlink NVDA/USD feed for two things only: to display a spot price, and to gate writing, so it refuses to sell a strike against a stale or paused price. **The feed is never read when the week settles.** Whether a call is exercised is decided by whoever holds it, and what the vault gets back is decided by Valorem.

The NVDA feed stops updating when the US equity market is closed, including over weekends. That is why the vault accepts a price up to 4 days old at launch; a tighter limit would block writing every weekend. The bound is compiled to between 1 hour and 7 days.

**Costs you:** a broken or stale feed means a skipped week, which is the safe direction. Robinhood Chain has no sequencer uptime feed, so a sequencer outage shows up as a stale price and blocks writes.

## Third parties in the path

Callhouse sits on contracts and services it does not control, and none of them can be overridden from the vault.

| Dependency | What it does | What can go wrong |
|---|---|---|
| **Overcall registry** | Publishes the weekly cycle, strikes and deadlines for the NVDA market | It is controlled by a single third-party key. The vault refuses a malformed cycle: over 21 days, a lot size other than one token, or options that do not match the cycle. Those failures cost a skipped week. The vault does not second-guess strikes that sit inside its policy band. |
| **Overcall listings API** | Shows the vault's listing to buyers on Overcall | It can reject or drop an order. An invisible listing is an unfilled week. The app publishes the signed order as a fallback. |
| **Valorem Clear** | Holds the collateral, mints the options, settles assignment | Its engine fee (15 bps of notional, currently off) can be switched on by a third party. The vault then stops writing until the Admin Safe accepts the fee. |
| **Seaport 1.6** | The listing and fill contract | Third-party code outside Callhouse's control |
| **Robinhood Chain** | The chain the vault runs on | A centralised sequencer. An outage near the book close means no live listing when buyers are looking. |

## Regulatory perimeter

Callhouse is not available to US persons. The same perimeter applies as to the Stock Tokens, which are offered outside the United States under their issuer's own terms. Access is restricted by the Terms of Use, not by a technical control, and no know-your-customer process is run. You are responsible for your own eligibility and for any tax or reporting consequences. Nothing in these docs is investment, legal or tax advice, or an offer of securities.

## Related

* [Security and audits](../protocol/security.md)
* [FAQ](../resources/faq.md)

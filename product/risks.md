# Risks

This is the full list. Most of these are not bugs and have no fix. They are the shape of writing covered calls against a tokenised security on a one-week clock, through contracts and tokens other people control.

{% hint style="danger" %}
**You can lose the collateral you deposit.** The Callhouse contracts are **not deployed and are unaudited**: no external firm has audited them, and none is planned. The vault address will be published on [Contracts and addresses](../protocol/addresses.md) after deployment.
{% endhint %}

{% hint style="warning" %}
* Premium is paid only if a buyer fills.
* Assignment can take the collateral at the strike.
* Stock Tokens are debt securities.
* Callhouse is not available to US persons.
{% endhint %}

## The ordinary outcomes

### An empty book: weeks that pay zero

The keeper arms a week and lists calls, and nobody buys them before the exercise timestamp. Nothing is written, the listing ends, and the week's premium is zero. On a thin market for weekly calls on a tokenised stock, this is the most likely outcome.

**Costs you:** the week's premium, which is zero, and the time. No fee is charged on a week that collected nothing. There is no dealer obliged to take the other side, and no protocol token or emission to top up an empty week. An unfilled week is not exposed to assignment: nothing was written, so nothing can be assigned.

**What the system does:** closes the week flat and publishes it alongside the filled ones, with premium 0. The listing is not posted to any marketplace or order-book service. The keeper serves it to the app's fill page, and it is validated on chain, where any Seaport 1.6 client can fill it, but buyers have to find it. If the keeper is down, the fill page has no order to show, and only someone who already has the order's details can fill it.

### A fill refused after a rally

The vault checks the strike band floor and the premium floor again at the spot of every fill, not the spot of the day the listing was made. If NVDA rises far enough, the listing's price falls under the premium floor, or the strike itself falls under the band floor, and the vault refuses every fill. That is the floor doing its job: it stops a buyer taking a call that has moved closer to the money at a price set for one further out.

**Costs you:** sales. While a listing is refused nobody can buy, and the week can end unfilled or only partly filled. A price problem needs a new listing, and the vault allows three a week, cancelled or not. Once they are spent, a refused listing stays unfillable until spot falls back. A strike under the band floor cannot be fixed by any price.

**What the system does:** by default the keeper prices 1% above the floor, so a small rise does not immediately stop sales. Each tick it repeats the vault's spot checks: it reprices when the price is the problem and a listing is left, and raises an alert when it cannot. With the listing from the keeper's fork rehearsal (strike 223 USDG, 0.856189 USDG per contract, spot 211.93 USDG when listed) and the launch policy, the premium floor would refuse fills above a spot of about 214.05 USDG and the band floor above about 216.50 USDG. Those thresholds are computed, not observed. In the keeper's extended fork rehearsal, a 1.5% rise refused a fill at that price; the keeper relisted at the new floor with the week's third listing, and the next fill went through. A fourth listing that week was refused.

### Assignment caps your upside

Anyone holding the calls of that week's option type can exercise them during the exercise window. Valorem assigns an exercise pro rata by amount written across the writers in a bucket, and every fill of the vault's week lands in the same bucket as anything other writers wrote before the window opened. So the vault can be assigned because of calls other people sold or wrote and exercised themselves. It can never be assigned on more contracts than it sold, because it writes only what buyers take. For each assigned contract, Valorem takes NVDA at the strike and the vault receives strike USDG, credited to depositors without a fee.

**Costs you:** all upside above the strike for that week on the calls sold, and the NVDA itself. v1 does not buy it back, so the vault ends the week underweight NVDA and the share price in NVDA terms falls. If NVDA gaps up and keeps going, you sold the move for a week's premium. See [Assignment](assignment.md).

### Partial assignment

Part of the vault's sold position can be assigned and part not, in fractions of a contract when other writers share its bucket. How much other people write into the same option type, and how much they exercise, is outside the vault's control.

**Costs you:** predictability. A redemption from an open week can come back partly in USDG, and the split is not known until the week closes.

### Depositing into an open week

Deposits stay open while a week is Listed, until the exercise timestamp. The share price counts the NVDA locked behind calls already sold at face value and does not subtract what those calls could cost, and every share carries the week's result. Capacity is also measured on the vault's total assets at each fill, so a fill that comes after your deposit can sell calls against the NVDA you just deposited.

**Costs you:** if you deposit while NVDA is near or above the strike, you pay full price for shares whose collateral may be assigned at the strike, and your shares take their pro-rata part of that loss. Later fills in the week can write calls against your deposit at that week's strike and price. You do not receive premium that was harvested before your deposit, and you cannot leave instantly until the week closes. Deposits made while the vault is Idle are not exposed this way. The app's deposit form warns while a week is Listed, and more strongly as spot approaches the strike.

### Withdrawals queue

Instant redemption is off from the moment a week is armed until it closes, because NVDA behind calls sold is locked in Valorem until expiry. A withdrawal started mid-week settles when the week closes. A redemption queued while the vault is Idle can be settled straight away by anyone with `settleQueue()`. A queued redemption cannot be cancelled. cNVDA is not listed anywhere, so there is no secondary market to exit into. See [Withdrawing and the redeem queue](../getting-started/withdrawing.md).

**Costs you:** time, and while a claim is stranded, more of it: instant redemption stays off, and a queued redemption pays its share of the idle NVDA straight away but its share of the claim only when the claim is redeemed.

## The stablecoin and the asset

### USDG: one key can pause, freeze, wipe and burn

Premium and strike proceeds are paid in USDG, a stablecoin issued by Paxos, so you carry whatever risk USDG carries. On Robinhood Chain a single address with no contract code, so no on-chain multisig, holds every operational power over USDG, and each of these works immediately:

| Power | What it does to a Callhouse week |
|---|---|
| **Pause** USDG | No USDG moves anywhere: no fill can pay, no holder can pay the strike to exercise, and no USDG claim, fee payment or USDG part of a redemption goes through. In a week with any assignment, `rollClose` cannot redeem the claim, and it is stranded. |
| **Freeze** the vault | The vault can neither receive nor send USDG: fills fail, USDG claims fail, the USDG part of settled redemptions is deferred, and the protocol fee waits. In a week with any assignment, the claim is stranded. |
| **Freeze** the clearinghouse | Exercises fail, and so does the USDG leg of the claim's redeem. In a week with any assignment, the claim is stranded. |
| **Wipe** a frozen address | Destroys the whole USDG balance of an address already frozen. Wiping the vault destroys unclaimed premium and the USDG owed to settled redemptions; the vault's accounting takes the lower balance as its new starting point, and the loss is not made good. |
| **Burn** from any address that is not frozen | By first granting itself a supply-control permission, the same key can burn USDG from any address that is not frozen, the vault or the clearinghouse included, in two transactions, with no delay and no freeze event as a warning. Burning the clearinghouse's USDG in an assigned week strands the claim. |
| **Upgrade** the token | Behind a 24-hour timelock that the same key schedules and executes. |

Paxos's terms let it freeze an address under a legal directive, on a partner's formal notification, or at its sole discretion, and say frozen funds may be destroyed. As of September 2026, all 27 freezes on Robinhood Chain were still in place: none has ever been lifted there.

**Costs you:** premium, strike proceeds and USDG owed to you can be frozen, destroyed or delayed at any moment. A stranded claim also holds the NVDA still inside it, which is your principal, for as long as the cause lasts. Nothing sets a limit on how long that is.

**What the system does:** the contracts make sure a USDG action never traps anyone procedurally, and never decides the NVDA part of an exit.

* A close whose claim cannot be redeemed completes anyway and **strands** the claim: the vault goes to Idle keeping it, deposits and new weeks are refused, the queue keeps settling on the idle NVDA, and anyone can call `retryStrandedClaim()` until the redeem goes through. See [The weekly cycle](weekly-cycle.md#when-the-close-cannot-redeem-the-claim-a-stranded-claim).
* The NVDA part of a settled redemption is paid whatever USDG is doing. The USDG part is deferred, stays owed, and can be collected later or to another address.
* The protocol fee is pushed best-effort, so a USDG problem with the fee cannot block the close.

In the keeper's fork rehearsal, the USDG issuer's freeze key, impersonated on the fork, froze the vault after a week with 1 of 2 sold calls exercised. The close stranded the claim, deposits and the next week were refused, and a redemption queued that week settled on the idle NVDA, with a 12.5% share of the claim to follow. After the freeze was lifted, the retry redeemed 1 NVDA and 239 USDG, set that share aside for the queued redeemer, and the next week armed normally.

### Stock Tokens: the issuer's powers

Stock Tokens are debt securities issued by Robinhood Assets (Jersey) Limited. They are not shares: no vote, no claim on Nvidia, and you carry the issuer's credit risk. If the issuer fails, the token does not survive independently of it. Each of the issuer's on-chain powers sits with a single address, with no on-chain multisig and no timelock:

| Power | What it does |
|---|---|
| **Pause** transfers, of every Stock Token or of NVDA alone | Stops every NVDA movement: deposits, instant redemption, the NVDA part of settled redemptions, and every fill, because each write moves NVDA into Valorem. A week that still has NVDA in its claim is stranded at the close. |
| **Blocklist** an address | Blocklisting the vault stops every NVDA movement into or out of it, as a pause does. Blocklisting the clearinghouse stops every fill and the NVDA leg of the claim's redeem, so a week with NVDA in its claim is stranded. |
| **Burn** from any holder (`adminBurn`) | Works even on a paused token and against a blocklisted holder. NVDA in the vault is simply destroyed. |
| **Pause the oracle** | The vault stops arming weeks, authorising listings and accepting fills, and nothing else. |
| **Change the multiplier** | It can go down as well as up and can apply immediately. The price feed follows only when the price has moved 0.5%, or at its daily heartbeat while the market is open; after NVDA's step on 10 September 2026 it lagged by about 11.8 hours. For those hours the strike band and the premium floor are priced on a stale basis. Neither the vault nor the keeper checks for this today. |
| **Upgrade** | One key can replace the code of all 204 Stock Tokens at once. |
| **End the Series** | The prospectus lets the issuer redeem a Series on 30 calendar days' notice, after which the tokens can be redeemed only with a know-your-customer process the vault cannot complete. |

**Costs you:** in the mild case, weeks of nothing. In the severe case, the instrument itself.

**After an issuer burn,** the vault does not pretend. The share price falls by the NVDA destroyed. Deposits are refused while the vault holds less NVDA than it has set aside for settled redemptions, so a newcomer's deposit is never paid out to earlier redeemers. Every settled redemption not yet collected is paid the same fraction of what it was booked, whatever order people collect in, and that cut is permanent even if the issuer later restores tokens (restored tokens count for the shares still held). If a burn leaves the book worth almost nothing with shares still outstanding, deposits stay closed until it recovers.

**During a pause, or a blocklist of the vault,** nothing traps you procedurally:

| Action | Works? |
|---|---|
| Queueing a redemption | Yes. It moves no NVDA; only your cNVDA moves into the vault's escrow. |
| Settling the queue with `settleQueue()` while Idle | Yes. It moves no tokens. |
| Claiming USDG already credited to you | Yes. It moves only USDG. |
| Closing the week with `rollClose` | Yes. A week with NVDA still in its claim is stranded until the pause or blocklist is lifted. |
| Arming a week | Yes, but no fill can go through. |
| Depositing, instant redemption, fills | No. Each moves NVDA. |
| Completing a settled redemption that includes NVDA | No. The whole call reverts until the NVDA can move. |
| `retryStrandedClaim()` | Not until the pause or blocklist is lifted. |

An oracle pause on the Stock Token, by contrast, blocks no transfer. Settlement never reads the oracle, so `rollClose`, the redeem queue and USDG claims all keep working through it.

### The price feed

The vault reads a Chainlink NVDA/USD feed for three things only: to show a spot price, to check the strike band and premium floor when a week is armed and a listing is authorised, and to check them again at every fill. **The feed is never read when the week settles.** Whether a call is exercised is decided by whoever holds it, and what the vault gets back is decided by Valorem.

* **Market hours.** The feed is a US-equities 24/5 feed. It publishes nothing, heartbeat included, while the US equity market is closed, and restarts on Sunday at 20:00 ET. The gaps observed on chain run up to about 21 hours inside the week, about 52 hours over a normal weekend, about 76 hours over the Friday holiday of 3 July 2026 and about 78 hours over Labor Day. So the vault accepts a price up to 4 days old at launch; a limit measured in hours would refuse every weekend. A closure longer than the limit, such as an unscheduled two-day closure next to a weekend, blocks arming and fills until the feed prints again.
* **The weekend price is not the close.** It is the last price that moved the feed before the market shut: on chain, 3 of 12 observed closures froze between 2.2 and 4.6 hours early, and one printed after the close. The keeper usually arms the next week over the weekend, so the strike is set against that price, and weekend fills are checked against it.
* **Oracle pause.** Chainlink documents that the feed holds its last value while the Stock Token's oracle pause is on. The vault refuses to arm, list or fill during it anyway.
* **A wrong price that looks fresh.** The vault rejects only a zero or negative answer. Chainlink warns that tokenised-equity feeds can surface atypical values, zero included, with fresh timestamps, particularly overnight. A wrong price with a fresh timestamp passes every check, because the keeper sets the strike from the same feed the vault checks it against. The feed's own administrators, a 4-of-9 Safe, can also replace its data source.
* **No sequencer check.** Robinhood Chain publishes no sequencer uptime feed, so the usual guard cannot be built, and a 4-day limit does not notice a sequencer or oracle outage shorter than that.

**Costs you:** a broken or stale feed means a skipped week or refused fills, which is the safe direction. A wrong price that looks fresh is not the safe direction: it can let the vault sell calls closer to the money than the policy intends, for too little.

### Robinhood Chain

The vault runs on Robinhood Chain, which has a single sequencer run by Robinhood. The sequencer screens transactions: any transaction touching a restricted address can be dropped. A transaction can be forced in through Ethereum after 4 days, but whether forced transactions are screened too is not known for this chain. The chain's Security Council, 7 of 8 signers, can change any chain rule with no delay; routine upgrades go through a 6-of-8 Safe and a 7-day timelock.

**Costs you:** if the vault, a depositor, the keeper or Seaport is restricted, no transaction reaches it, and nothing in the vault can help. A sequencer outage near the Friday close means no fills while buyers are looking. A censoring sequencer can delay `rollClose` and every exit for as long as it censors.

## Code and keys

### Smart contract risk

**The Callhouse contracts are unaudited.** No external firm has audited them, and none is planned. What stands behind them is internal:

* An adversarial review on 2026-09-12 across 13 surfaces raised 72 findings, of which 51 survived refutation. The contract defects fixed from it carry regression tests.
* An internal audit on 2026-09-13 found five issues, the first of them High: the vault wrote calls before selling them, so anyone could write the same option into its bucket and take value by exercising. The contracts were redesigned the same day: calls are now written only when bought, the stranded-claim path was added, the two legs of a redemption were separated, and the share price was made honest under an issuer burn.
* An internal audit of the redesigned contracts on 2026-09-14 found no Critical, High or Medium issue. It found one Low: a buyer that is a contract could deposit inside its own fill and take part of that fill's premium. Deposits are now refused in any transaction in which a fill has written. It also raised two Informational items: the admin's fee lever with Callhouse's own clearinghouse (see [Fees](fees.md#who-holds-the-valorem-fee-switch)), and documentation drift.
* The test suite: unit, regression and invariant tests, and tests on a fork of Robinhood Chain that fill through the live Seaport, exercise on real Valorem code, close an unfilled week, and strand and recover a claim under a real USDG freeze.

All of this was done by the project itself. None of it is an external audit, and none of it substitutes for one. There is no proxy and no upgrade key, so a bug means a new vault and a migration, not a silent patch.

**Costs you:** in the worst case, everything deposited. The deposit cap, 20 NVDA in the deploy script, is the honest measure of how much confidence this deserves. Details: [Security and audits](../protocol/security.md).

### Keeper failure

The keeper is one hot key running a weekly loop. It can crash, run out of gas, or miss the window.

**Costs you:** a skipped week if it stops before arming. If it stops while a week is Listed, the fill page has no order to show, so the week probably sells nothing more; nothing is written without a fill, so a stopped keeper locks up no extra collateral. If it stops after fills, only delay.

**What the system does:** a stopped keeper cannot keep collateral locked past the week.

* `lockBook` is open to anyone from the exercise timestamp.
* Deposits and fills stop at the exercise timestamp without anyone calling anything.
* `rollClose` is open to anyone one hour after expiry. Anyone can redeem the claim, settle the queue and return the vault to Idle.
* `settleQueue()` and `retryStrandedClaim()` are open to anyone.
* A halt on writes never blocks redemptions, USDG claims or the close of a week.

### Keeper key compromise

No off-chain component can move a token out of the vault, but the keeper chooses the price the vault sells calls at, and a price is value. The vault is the Valorem writer and the Seaport seller, and it checks everything the keeper proposes against the admin's policy and the compiled bounds.

**Costs you:** a compromised keeper can arm the lowest strike the band allows, list the vault's whole capacity at exactly the premium floor, and have a buyer it controls fill it at once. Nothing requires a delay between a listing and its first fill, so a guardian cannot react in time. At launch policy (strike floor 3%, premium floor 0.40%), the project's security model estimates the buyer's expected gain, which is depositors' expected loss, at about **1.1% of the notional sold per week** at 50% implied volatility and about 2.7% at 80%, with up to 95% of the vault sold. Nothing on chain notices a sale at the floor, so it repeats every week until someone halts. A compromised keeper still cannot take a token out of the vault, sell above the strike, list past the exercise timestamp, or write outside the band and the caps, and with calls written only when bought there is no unsold inventory to exploit.

**The honest keeper sells near the floor too.** By default it prices each listing at the premium floor plus 1%, with no model price behind it. On a thin market that can be well below what the call is worth, and depositors bear that gap without anyone being compromised.

Mitigations considered and **not** implemented: a timelock on admin actions, higher compiled floors, a delay before a new listing can be filled, model-based pricing in the keeper, and no deposits before the admin role moves to a Safe. None of these is in the code or the launch plan. See [Roles and admin powers](../protocol/roles.md).

### Admin judgment and admin key compromise

The vault admin sets policy inside the compiled caps: the strike band, the premium floor, the utilisation limit, the protocol fee, the contract cap, the deposit cap, the price-age limit, the fee recipient, and whether to accept Valorem's engine fee. It halts and unhalts, and grants and revokes every role, the keeper's included. At launch the admin is a single deployer key, until the role is handed to a 2-of-3 Safe. With Callhouse's own clearinghouse, the same key also holds the clearinghouse's fee switch. There is no timelock on any of it.

**Costs you:** the caps rule out the worst moves. Nobody can sell calls closer than 1% above spot, set the protocol fee above 20% of premium, charge a protocol fee on strike proceeds, or transfer a token out of the vault directly. They do not rule out bad settings inside the caps: a band set too tight means weeks with no sale, a band set too loose means routine assignment, and the deposit cap and the contract cap have no compiled ceiling.

A compromised admin key can go further than the keeper. It can set the policy to the compiled floors (1% strike, 0.10% premium, 99.85% utilisation), grant itself the keeper role, and arm, list and sell to itself within a block or two: about **2.2% of the notional sold per week** at 50% implied volatility (about 3.9% at 80%), plus a 20% fee on whatever premium is left, sent wherever it chooses. It can also switch on Valorem's 15 bps engine fee, accept it on the vault and sweep it to itself: see [Fees](fees.md#who-holds-the-valorem-fee-switch).

### Guardian

The guardian can halt arming, listings and fills, and can cancel or invalidate listings. It cannot restart anything: only the admin can unhalt. **Costs you:** a compromised or careless guardian means no sales until the admin unhalts, and the premium those weeks would have paid. Exits stay open.

## Valorem

### Valorem is unmaintained upstream

Valorem Clear holds the collateral, mints the calls and settles assignment. Its upstream developer has shown no public activity since January 2024, and the last commit to the clearinghouse is from November 2023. It has published no security advisories, and there is no bug bounty, no incident response and no patch path. Zellic reviewed the clearinghouse twice, in December 2022 and January 2023, and reviewed a patch in August 2023. Two of its findings about how exercises pick buckets (the choice is not weighted by size, and the next bucket is known in advance) were acknowledged and never fixed. Those reviews cover Valorem, not this vault.

**Costs you:** a bug in Valorem would reach the collateral directly, and nobody upstream would fix it.

### Callhouse's own clearinghouse instance

The launch plan deploys Callhouse's own copy of the unmodified upstream clearinghouse, from the same source as upstream release v1.0.1, rather than an instance someone else operates. The clearinghouse has no owner, no pause, no blocklist and no proxy. Its one privileged key, the fee holder, is the vault admin. That key can switch the 15 bps engine fee on, sweep the fees collected, change the metadata renderer and nominate a successor, with no timelock, and a nomination emits no event until it is accepted. It cannot touch collateral.

**Costs you:** the engine-fee lever described on [Fees](fees.md#who-holds-the-valorem-fee-switch), in the hands of the same key that accepts the fee on the vault.

## Third parties in the path

Callhouse sits on contracts and tokens it does not control, and none of them can be overridden from the vault.

| Dependency | What it does | What can go wrong |
|---|---|---|
| **USDG** (Paxos) | Pays premium and strike proceeds | One key can pause, freeze, wipe or burn at once. A week with any assignment can strand; USDG owed can be destroyed. |
| **NVDA Stock Token** (Robinhood Assets (Jersey) Limited) | The collateral | Single keys can pause, blocklist, burn, change the multiplier, upgrade every Stock Token, and end the Series on 30 days' notice. |
| **Chainlink NVDA/USD feed** | Gates arming, listings and fills | No prints while the market is closed; a wrong price with a fresh timestamp passes every check; a 4-of-9 Safe controls its data source. |
| **Valorem Clear** | Holds the collateral, mints the calls, settles assignment | Unmaintained upstream. On Callhouse's own instance, the vault admin holds the engine-fee switch. |
| **Seaport 1.6** | The listing and fill contract | Third-party code with no admin, no pause, no upgrade and no fee switch. The vault relies on Seaport calling it before every fill and after every transfer; no public audit of that part of Seaport 1.6 was found. |
| **Robinhood Chain** | The chain the vault runs on | A single screening sequencer, force inclusion only after 4 days, and a Security Council that can change the rules. |

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

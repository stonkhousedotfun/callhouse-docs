# The weekly cycle

The vault moves through four phases every cycle:

```
Idle ──rollOpen──► Listed ──lockBook──► Exercisable ──rollClose──► Settling ──► Idle
                      │                                   ▲
                      └────────────── rollClose ──────────┘
                              (lockBook is optional)
```

**Nothing is written when a cycle opens.** `rollOpen` arms the vault with one Valorem call option type. Calls are written only inside a buyer's fill, and each fill writes exactly the number of calls that buyer takes. A week can sit in Listed from start to finish with nothing written, and a week nobody buys has nothing to settle.

The vault has no calendar of its own and reads nobody else's. Each week the keeper creates the option type itself, and that type's exercise and expiry timestamps are the week's deadlines. When the vault arms, it checks those timestamps against bounds compiled into the contracts and copies them, so a cycle keeps its own deadlines whatever happens later.

{% hint style="info" %}
**The weekly times are US Eastern Time.** By default the keeper sets exercise at the NYSE Friday close, 16:00 America/New_York, and expiry 24 hours later. That is 20:00 UTC while US daylight saving time is in force, and 21:00 UTC after it ends on 1 November 2026 (it starts again on 14 March 2027). When the Friday is a full-day NYSE holiday, exercise moves back to the previous session's close: Thursday 16:00 ET, or Wednesday if Thursday is closed too. Early-close days are not modelled, so their timestamp stays at 16:00 ET. These are the keeper's choices. The vault enforces only the bounds listed below.
{% endhint %}

{% hint style="info" %}
**History.** Earlier designs took the weekly cycle, its strikes and its deadlines from Overcall's registry, and listed through Overcall. The current vault does not use Overcall for anything.
{% endhint %}

The keeper's built-in holiday table covers 2026 and 2027. The Friday holidays in it that are still to come, and where exercise lands instead:

| Friday holiday | Exercise instead |
|---|---|
| 25 December 2026 (Christmas) | Thursday 24 December 2026, 16:00 ET |
| 1 January 2027 (New Year's Day) | Thursday 31 December 2026, 16:00 ET |
| 26 March 2027 (Good Friday) | Thursday 25 March 2027, 16:00 ET |
| 18 June 2027 (Juneteenth, observed) | Thursday 17 June 2027, 16:00 ET |
| 24 December 2027 (Christmas, observed) | Thursday 23 December 2027, 16:00 ET |

For later years the keeper operator has to supply the dates.

## The phases

| Phase | Starts when | Who triggers it | Deposits | Withdrawals |
|---|---|---|---|---|
| **Idle** | The vault is flat | — | Open, up to the cap | Instant |
| **Listed** | `rollOpen` arms this cycle's option type | Keeper only | Open until the exercise timestamp | Queue |
| **Exercisable** | `lockBook`, at or after the exercise timestamp | Anyone | Closed | Queue |
| **Settling** | `rollClose`, at or after expiry | Keeper from expiry; anyone from expiry + 1 hour | Closed | Being settled |
| **Idle** again | End of the same `rollClose` transaction | — | Open, unless the claim is stranded | Instant, unless the claim is stranded |

Settling exists only inside the `rollClose` transaction. A **stranded claim** is an Idle vault that could not redeem the week's Valorem claim; it has its own section [below](#when-the-close-cannot-redeem-the-claim-a-stranded-claim).

### Idle → Listed: the keeper creates the option type, then `rollOpen`

Anyone can create a Valorem option type with `newOptionType`, and a type's terms can never change once it exists. The keeper builds each week's type from six fields:

| Field | The keeper's default | What the vault enforces at `rollOpen` |
|---|---|---|
| Underlying | The NVDA Stock Token | Must be this vault's asset |
| Contract size | 1 NVDA | Exactly 1 NVDA |
| Exercise asset | USDG | Must be USDG |
| Strike | From Cboe's delayed NVDA option quotes: the call with a delta of about 0.15, rounded to a whole USDG, kept 5% to 11.5% above spot under the current band | At live spot, inside the band: at least 3% and at most 12% above (current policy), both bounds checked |
| Exercise timestamp | The next NYSE Friday close, 16:00 ET, at least 6 hours away | At least 1 hour after the `rollOpen` |
| Expiry timestamp | Exercise plus 24 hours | At least 1 day after exercise, and at most 21 days after the `rollOpen` |

An option id is a pure function of those six fields. If the type already exists, for example from an earlier attempt, the keeper reuses it rather than creating it again.

The keeper then calls `rollOpen(optionId)`. Only the keeper can. The vault reads the type back from the clearinghouse and checks, before anything else happens:

* the vault is Idle, writes are not halted, and no earlier claim is still stranded;
* the id is an option type, not a claim and not an unknown id;
* every rule in the right-hand column above;
* Valorem's engine fee is off, or the vault admin has accepted it;
* the Stock Token has not paused its oracle, the price feed is no older than `maxPriceAge` (currently 4 days), and the strike sits inside the band at that price.

If every check passes, the vault gives the cycle its own number, snapshots the strike, exercise and expiry, resets its listing budget to three, and moves to Listed. No NVDA moves and no option token exists yet.

If any check fails, nothing happens and the vault stays Idle. The keeper also arms nothing when Cboe's option quotes are missing, stale or inconsistent. It keeps trying for that Friday on each tick, so a temporary problem such as a stale price feed can still end in a week armed later. Once that Friday's close is less than 6 hours away (`KEEPER_ARM_LEAD_S`), the keeper targets the following Friday instead, and the week is skipped. Deposits and instant redemptions stay open through a skipped week, and a skipped week is a normal outcome.

The keeper arms as soon as the vault is Idle and flat and these checks pass. After a normal close that is usually during the weekend, so the week's strike is set against the price feed's last Friday print, which can come a few hours before the close. See [Risks](risks.md#the-price-feed).

### During Listed: one listing, and each fill writes what it buys

The keeper proposes one Seaport 1.6 order, and `approveListing` (keeper only) authorises it on chain only if every field matches the vault's own state:

* the offerer and the zone are both the vault, the order type is partial-fill restricted, there is no conduit and the zone hash is zero;
* there is one offer item: this cycle's option id, a fixed number of contracts, at most the vault's remaining capacity (the policy maximum on total assets, less the contracts already written this cycle);
* there is one payment item: USDG to the vault, a fixed amount that divides exactly by the number of contracts, at a price per contract no higher than the strike;
* the order is live now, ends no later than the exercise timestamp, and uses the vault's current Seaport counter;
* at live spot the strike is not below the band floor, and the price is not below the premium floor (currently 0.10% of spot per contract);
* no other listing is live, and fewer than three have been authorised this cycle. Every approval spends one of the three, cancelled or not.

The vault then validates the order on Seaport, so it fills with an empty signature. The vault has no signing key, and there is no venue fee item in the order.

A buyer fills the listing on the app's cycle page or with their own Seaport 1.6 client, taking any whole number of the contracts left (see [Buying calls](buying-calls.md)). On every fill Seaport calls the vault before it moves anything, and the vault runs the fill gate:

* the caller is Seaport, and the order is this vault's live listing;
* the vault is Listed, writes are not halted, and the exercise timestamp has not arrived;
* Valorem's engine fee is off or accepted, the oracle is not paused and the price feed is not stale;
* **at the spot of the fill**, the strike is not below the band floor, and the price of this fill is not below the premium floor (plus the Valorem engine fee valued at spot, if that fee is on);
* the contracts already written this cycle plus this fill stay within the contract cap and the utilisation limit, measured on the vault's total assets at that moment.

If the fill passes, the vault writes exactly the contracts being bought into Valorem, inside the buyer's transaction, and then checks that its NVDA balance still covers what settled redemptions are owed. Seaport moves the new option tokens to the buyer and the buyer's USDG to the vault. A last check runs after every transfer and reverts the whole fill if any option token stayed in the vault. **Written always equals sold, and the vault never holds an unsold call.**

{% hint style="warning" %}
**A fill can be refused after a rally.** Both floors are recomputed from the spot at the moment of each fill, not the spot when the listing was made.

* If spot rises until the listing's price is under the premium floor, fills are refused until the keeper reprices, which spends one of the week's three listings.
* If spot rises until the strike itself is under the band floor, fills are refused whatever the price, until spot falls back.

For cycle 1 (strike 223 USDG, 0.856436 USDG per contract) under the current policy, the band floor refuses fills once spot passes about 216.50 USDG, about 2.2% above the 211.92 USDG the feed showed on 15 September 2026. The premium floor, at 0.10% of spot, would not refuse that price below a spot of about 856 USDG. Both thresholds are computed, not observed. In the keeper's extended fork rehearsal, run with the earlier 0.40% floor, a 1.5% rise in spot (to 215.11 USDG) put a 0.856189 price under the fill floor of 0.860426 USDG: the fill was refused, the keeper cancelled and relisted at 0.869032 USDG with the week's third and last listing, and a fill at the new price went through.
{% endhint %}

### How the keeper chooses

The contracts set the bounds. Inside them, the keeper software (`keeper/src/calendar.ts`, `keeper/src/vol.ts`, `keeper/src/policy.ts`, `keeper/src/roll.ts` and `keeper/src/config.ts` in the app repository) makes these choices with the settings it runs in production. They are operating choices, not commitments: whoever runs the keeper can change them in its configuration, without a contract change.

* **Window:** the next NYSE Friday close at 16:00 ET, at least 6 hours away (otherwise the Friday after), with expiry 24 hours later.
* **Market data:** Cboe's free, delayed NVDA option chain, fetched once per decision. It must be for NVDA, dated within 4 days, and from the latest NYSE session that has closed. Missing, stale or inconsistent data skips the week with a named reason; the keeper never falls back to another way of pricing.
* **Strike:** the strike of the listed call expiring on the week's close day with a delta of 0.15, interpolated between the two listed strikes around it, converted to the token's price and rounded to a whole USDG, then kept at least 2 percentage points above the band floor and 0.5 points below its ceiling: 5% to 11.5% above spot under the current band. When no such strike can be found, the keeper arms nothing; it looks again on each tick until that Friday's close is less than 6 hours away, and then moves on to the following Friday.
* **Size:** the vault's whole remaining capacity, in one listing.
* **Price:** the higher of the fill-time premium floor at the current spot plus 0.5% (`KEEPER_PREMIUM_MARGIN_BPS` 50 in production; the code default is 1%) and the quotes' mid price at the strike plus 10%, rounded up to the next USDG base unit, never above the strike. The cycle page shows the inputs the keeper reports for the live listing. See [Risks](risks.md#keeper-key-compromise).
* **Listing length:** from now until the exercise timestamp.
* **Where the order lives:** the keeper stores the order and serves it, with an empty signature, from its `/orders` endpoint on a private network. The app reads it from there, checks it against the chain, and offers the fill on the cycle page. The keeper has no public endpoint.
* **Repricing:** each tick the keeper repeats the fill gate's spot checks. If a rise in spot has put the price under the premium floor, it cancels and relists, within the vault's three listings. At most every 30 minutes it also checks fresh quotes, and when the market-based ask is more than 25% above the live ask it cancels and relists higher, but only if a listing would still be left afterwards. Stale quotes never trigger that upward reprice, and it applies only to listings the keeper priced in `vol` mode. Without fresh quotes, a floor reprice or a relist prices from the fair value stored with the week's previous listing or its arm, or at the floor plus margin at the new spot if that is higher, so a relist after spot has fallen can ask less than before. With no fair value stored, as for cycle 1, nothing can be priced: a floor reprice leaves the live listing in place, and a relist waits for fresh quotes. If the strike has fallen under the band floor, no price helps: the keeper records an alert and leaves the listing in place for spot to fall back. Once the three listings are spent, a refused listing stays unfillable.
* **Sold out:** if the listing sells out and deposits made during the week have added capacity, the keeper lists the remainder, within the three.
* **Closing:** `lockBook` at the exercise timestamp, `rollClose` at expiry, and `settleQueue` whenever the vault is Idle with shares queued.
* **Stranded claim:** no new week is armed; the keeper tries `retryStrandedClaim()` every hour, simulating it first so a failed attempt costs no gas, and records an alert.
* **Alerts:** the keeper logs its alerts and stores them in its database. They are not delivered to anyone today: no alert webhook or relay is running.

On the live vault, the keeper created cycle 1's option type and armed it on 15 September 2026: a 223 USDG strike, exercise on Friday 18 September at 16:00 ET (20:00 UTC, timestamp 1789761600) and expiry 24 hours later (1789848000). Its first listing was cancelled and replaced the same day, so one of the cycle's three listings is left. Both listings were priced by the keeper version before `vol` mode, from the 0.40% premium floor then in force plus the keeper's margin.

In a fork rehearsal of the keeper run on 15 September 2026 (UTC), against a copy of Robinhood Chain with Seaport 1.6, USDG, a Valorem clearinghouse already on the chain with the same code as the vault's, and a test price feed seeded with the real Chainlink print, spot was 211.93 USDG. The keeper ran in fixed-price mode with the 0.40% floor: it created a 223 USDG strike (spot plus 5%) exercising on Friday 18 September at 16:00 ET (20:00 UTC), armed it, and with 25 NVDA in the vault listed 23 contracts at 0.856189 USDG each, against a floor of 0.847711. Those are rehearsal figures, not a forecast.

### Listed → Exercisable: `lockBook`

From the exercise timestamp, anyone can call `lockBook`. It invalidates any listing still live by bumping the vault's Seaport counter, and moves the vault to Exercisable. Nothing depends on it being called: deposits and fills both stop at the timestamp itself, and `rollClose` also accepts a vault that is still Listed.

During the exercise window, holders of this cycle's calls can exercise them in Valorem. The vault does nothing in this phase. See [Assignment](assignment.md).

### Exercisable → Settling → Idle: `rollClose`

From expiry, the keeper can call `rollClose`. One hour after expiry, anyone can. That is the fallback if the keeper is down: nobody needs a key to get the week closed.

`rollClose` runs as one transaction, in this order:

1. Invalidates any listing still live.
2. Records how many contracts were assigned.
3. If nothing was sold this cycle, there is no claim: the armed type is forgotten and there is nothing to redeem. Otherwise the vault tries to redeem its Valorem claim: NVDA that was not assigned comes back, and strike USDG comes back for what was.
4. Harvests the USDG: the 5% protocol fee is taken from premium only, the rest, including strike proceeds in full, is credited per share, and the fee is pushed to the fee recipient if the transfer goes through.
5. Settles the redeem queue for this epoch.
6. Returns the vault to Idle.

If the redeem in step 3 reverts, the close still completes, and the claim is stranded.

### When the close cannot redeem the claim: a stranded claim

Valorem's redeem pays out a claim's USDG and its NVDA in one call, and a revert on either leg reverts both. Each token's issuer can cause that revert:

* **USDG side**, in a week with any assignment (so there is USDG to pay): USDG paused, the vault or the clearinghouse frozen on USDG, or the clearinghouse's USDG burnt through USDG's supply controls.
* **Stock Token side**, in a week that was not fully assigned (so there is NVDA to pay): the Stock Token paused, or the vault or the clearinghouse blocklisted on it.

When that happens:

* `rollClose` still completes and the vault goes to Idle, **keeping the claim**. Everything inside it, the unassigned NVDA included, stays in Valorem until a redeem goes through.
* Premium already in the vault is harvested as usual. If the protocol fee cannot be paid, it waits.
* The redeem queue still settles, on the idle NVDA. Every epoch that settles while the claim is stranded also owns its pro-rata share of the claim, paid when the claim is redeemed.
* Deposits are refused, instant redemption is off, and `rollOpen` is refused. No new week starts until the claim is collected.
* **Anyone can call `retryStrandedClaim()`**, at any time and as often as they like. It reverts while the cause lasts. The first call that succeeds redeems the claim: the queue's share is set aside for those redeemers, and the rest belongs to the shares still held, with the NVDA back in the share price and the USDG credited fee-free like any strike proceeds. A protocol fee the close could not pay is paid then.
* A call made with too little gas cannot fake a failed redeem: the vault reverts instead of stranding.

Nothing sets a limit on how long a strand lasts. It ends only when the cause is lifted, if it ever is: Valorem gives the vault no other way to take the claim's contents out.

In the same fork rehearsal, week 3 sold 2 calls at a 239 USDG strike and 1 was exercised. The USDG issuer's freeze key, impersonated on the fork, then froze the vault on USDG. `rollClose` stranded the claim: deposits, `rollOpen` and `retryStrandedClaim` were all refused, and the redeem queue settled 2 of the 16 shares for 1.55 NVDA of idle collateral plus a 12.5% share of the claim. The 0.092112 USDG protocol fee could not be paid. After the freeze was lifted, the retry redeemed 1 NVDA and 239 USDG: 0.125 NVDA and 29.875 USDG went to the queued redeemer, 209.125 USDG was credited to the remaining shares with no fee, and the pending fee was paid. The keeper armed week 4 normally afterwards.

## What stops at each phase, and what never does

A halt on writes blocks `rollOpen`, new listings and every fill. It never blocks deposits, instant or queued redemptions, `settleQueue`, USDG claims, cancelling a listing, `lockBook`, `rollClose` or `retryStrandedClaim`.

| Action | Idle | Listed | Exercisable | Idle, claim stranded |
|---|---|---|---|---|
| Deposit | Yes, up to the cap | Until the exercise timestamp | No | No |
| Instant redemption | Yes | No | No | No |
| Queue a redemption | Yes | Yes | Yes | Yes |
| Settle the queue (`settleQueue`, anyone) | Yes, when shares are queued | No, it settles at `rollClose` | No, it settles at `rollClose` | Yes: the idle share now, the claim share when it is redeemed |
| Complete a settled redemption | Yes | Yes | Yes | Yes |
| Claim USDG | Yes | Yes | Yes | Yes |

A deposit is also refused for reasons that do not depend on the phase, such as an issuer burn that leaves settled redemptions unbacked. [Depositing](../getting-started/depositing.md) lists them all.

## Who can call what

| Who | Can call |
|---|---|
| **Anyone** | `lockBook` from the exercise timestamp; `rollClose` from expiry + 1 hour; `settleQueue` while Idle with shares queued; `retryStrandedClaim` while a claim is stranded; `sweepFee` while a protocol fee is pending; filling the listing through Seaport; creating Valorem option types |
| **Keeper** | `rollOpen`, `approveListing`, `cancelListing`, `invalidateAllListings`, and `rollClose` from expiry |
| **Guardian** | `haltWrites`, `cancelListing`, `invalidateAllListings`. It can stop, never start |
| **Vault admin** | Policy inside the hard caps, the deposit cap, the price age, the fee recipient, accepting Valorem's engine fee, halting and unhalting, granting and revoking every role |

Details and worst cases per key: [Roles and admin powers](../protocol/roles.md).

## Related

* [How Stonkhouse works](../getting-started/how-it-works.md)
* [Buying calls](buying-calls.md)
* [Launch policy and hard caps](policy.md)
* [Roles and admin powers](../protocol/roles.md)

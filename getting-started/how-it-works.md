# How Stonkhouse works

Stonkhouse runs one trade a week: it sells covered calls on pooled NVDA Stock Tokens and passes the USDG premium to depositors. The keeper picks each week's option, the vault checks it against its own rules and numbers its own weeks, and no outside party decides either. Calls are written only when a buyer fills, so the vault never holds a call it has not sold.

{% hint style="warning" %}
Premium is paid only if a buyer fills. Assignment can take the collateral at the strike. Stock Tokens are debt securities. Stonkhouse is not available to US persons.
{% endhint %}

## The week in six steps

1. **You deposit.** You send NVDA Stock Tokens to the vault and receive cNVDA shares, pro rata to the NVDA the vault already holds. Deposits are open while the vault is Idle, and while a week is listed until its exercise timestamp. A deposit made while a week is listed buys into that week's open calls. While the vault is Idle with nothing written, you can also withdraw straight away. See [Depositing](depositing.md).

2. **The keeper creates the week's option, and the vault arms it.** The keeper creates a call option type on the Valorem clearinghouse: one NVDA Stock Token per contract, a strike about 5% above spot rounded to a whole USDG, exercise at the NYSE close on Friday, 16:00 New York time (Thursday when Friday is an NYSE holiday), and expiry 24 hours later. It then calls `rollOpen`. The vault reads the option back from the clearinghouse and refuses it unless every term passes its own checks: its asset and USDG, exactly one token per contract, exercise at least an hour away, a window of at least a day, at most 21 days in all, Valorem's engine fee off or accepted, a live price feed, and a strike inside the band, 3% to 12% above spot at launch. **Nothing is written at this point.** No NVDA moves and no option token exists.

3. **The vault lists the calls.** The keeper proposes one Seaport 1.6 order and the vault checks every field before it validates the order on Seaport by hash. The order is a restricted order whose zone is the vault itself, so Seaport must call the vault on every fill. It pays USDG to the vault and to nobody else, offers at most the vault's remaining capacity (95% of its NVDA and at most 50 contracts at launch), and ends by the exercise timestamp. It carries no signature: the vault validated it on chain. At most three listings can be authorised in a week, cancelled ones included, so a relist is a reprice. By default the keeper asks the vault's premium floor, 0.40% of spot per contract at launch, plus a 1% margin. That is a floor-based price, not a model of what the call is worth. See [Buying calls](../product/buying-calls.md).

4. **A buyer fills, or nobody does.** A buyer fills on the app's fill page or through any Seaport 1.6 client. Before Seaport moves anything, it calls the vault. The vault re-checks the week at the spot of that moment: the strike is still at or above the band's lower bound, the price still clears the premium floor, the size still fits, the sale window is open, the price feed is live and writes are not halted. It then locks one NVDA per contract bought in Valorem and writes exactly the contracts the buyer is taking. Seaport hands them to the buyer and moves the whole premium, in USDG, to the vault in the same transaction. After the transfers the vault checks that no option token stayed behind, or the whole fill reverts. Fills can be partial. A fill can be refused after a rally, and the keeper then reprices within the three listings. **If nobody fills, nothing is written:** the week's premium is zero, no fee is charged, and there is nothing to assign.

5. **The exercise window.** At the exercise timestamp the sale window closes: no more fills and no more deposits. Anyone holding one of this week's calls can exercise it on Valorem until expiry, 24 hours later. Exercise takes NVDA from the collateral at the strike and leaves the strike price in USDG. Valorem spreads each exercise pro rata across everyone who wrote that option, so a call the vault sold can be assigned even if its own buyer never exercises. Because the vault writes only what it sells, it can never be assigned on more contracts than it sold. See [Assignment](../product/assignment.md). Anyone can call `lockBook` from the exercise timestamp to record the change of phase; deposits and fills close on the clock whether or not anyone does.

6. **The week closes.** After expiry, `rollClose` redeems the vault's Valorem claim: the NVDA that was not assigned comes back, and so does the strike USDG for the NVDA that was. The vault takes its 5% protocol fee from the premium only, credits the rest of the premium and all of the strike USDG to shareholders, settles the redeem queue, and returns to Idle. The keeper can call `rollClose` from expiry, and anyone can call it one hour later. A week that sold nothing has no claim to redeem and simply closes. If a token issuer's action stops the claim from redeeming, the week still closes but the claim is kept for later: see [When the claim cannot be redeemed](#when-the-claim-cannot-be-redeemed).

Then the keeper creates the next week's option and the loop repeats. At 16:00 New York time the close is 20:00 UTC while US daylight saving time applies and 21:00 UTC from 1 November 2026; the option's own timestamps, shown in the app, are what count. The phase-by-phase version is on [The weekly cycle](../product/weekly-cycle.md).

## Where the money goes

```
  You ──── NVDA ────► Stonkhouse vault ─── cNVDA ────► You
                            │
        rollOpen: arm this week's option type, write nothing
                            │
        approveListing: one Seaport 1.6 order, zone = the vault
                            │
          nobody fills ─────┼───► nothing written, premium 0, fee 0
                            │ a buyer fills k contracts
                            ▼
        inside the buyer's transaction: the vault locks k NVDA
        in Valorem Clear and writes k calls; Seaport moves them
        to the buyer and the whole premium to the vault
                            │
               rollClose, after expiry
                            │
   NVDA not assigned ──► back to the vault        (share price)
   NVDA assigned     ──► strike USDG, no fee      (USDG claim)
   premium at vault  ──► 5% protocol fee,
                         95% of it to holders     (USDG claim)
```

## A week from a fork rehearsal

The figures below come from a rehearsal of the keeper on a fork of Robinhood Chain: the real Valorem clearinghouse, Seaport 1.6 and USDG, a vault deployed on the fork, and a test price feed seeded with the live NVDA price and then moved by hand. They show the mechanics. They are not a live week and not a forecast.

| Step | What happened |
|---|---|
| Arm | Spot was 211.93 USDG. The keeper created an option with a 223 USDG strike (211.93 × 1.05, rounded to a whole USDG), exercise on Friday 25 September 2026 at 16:00 New York time and expiry 24 hours later. `rollOpen` wrote nothing. |
| List | The vault held 15 NVDA, so capacity was 14 contracts. The keeper listed all 14 at 0.856189 USDG each: the premium floor at that spot, 0.847711, plus its 1% margin. |
| Fills | One buyer took 2 contracts and a second buyer took 3. Each fill wrote exactly what it bought: 5 contracts written, 5 sold, 5 NVDA locked. Premium: 4.280945 USDG. |
| Exercise | Spot was set to 228 on the fork. A buyer exercised 2 contracts and paid 446 USDG. |
| Close | `rollClose` returned 3 NVDA and 446 USDG. The protocol fee was 0.214047 USDG, 5% of the premium. Shareholders were credited 4.066898 USDG of net premium plus 446 USDG of strike proceeds, with no fee on the strike proceeds. |

The vault then had 20 shares and 18 NVDA, so the share price fell from 1.0 to 0.9 NVDA per share: 2 NVDA left at the strike, and 22.3 USDG of strike proceeds per share were credited instead.

## Two balances, kept apart

Your position has two parts, and they move for different reasons.

| | Unit | What moves it |
|---|---|---|
| **cNVDA share price** | NVDA per share | Assignment, which removes NVDA without burning shares, and an issuer burn of the vault's tokens. Deposits and redemptions (instant, or queued and settled pro rata at `rollClose` or `settleQueue`) mint or burn shares pro rata and leave it unchanged, apart from rounding in the vault's favour. |
| **Claimable USDG** | USDG | Premium from filled weeks, net of the protocol fee, and strike proceeds from assignment. |

Premium is never folded into the share price. A filled week leaves the share price where it was and adds USDG you can claim. An assigned week lowers the share price in NVDA terms, because NVDA left the vault, and adds the strike USDG to your claim instead. The short call is never marked to market, and no price feed is read when the week settles.

## How a week can end

| Ending | Premium | Collateral |
|---|---|---|
| Nobody bought | Zero, and no fee is charged | Nothing was written, so nothing was locked and nothing can be assigned |
| Bought, not assigned | Kept, net of the fee | Comes back at `rollClose` |
| Bought and assigned, in part or in full | Kept, net of the fee | Assigned NVDA is replaced by strike USDG, credited without a fee; the rest comes back at `rollClose` |
| Bought, and the claim could not be redeemed | Premium already in the vault is credited at the close, net of the fee | Stays in Valorem until `retryStrandedClaim` redeems it |

Which ending you get depends on whether anyone buys, on what holders of this week's calls do (including calls other writers sold on the same option), and on how Valorem spreads exercise across those writers. The vault does not decide it.

## When the claim cannot be redeemed

Valorem's `redeem` sends the claim's strike USDG and its unassigned NVDA to the vault in one call, and either token's issuer can make that call revert: USDG paused, the vault or the clearinghouse frozen on USDG, the clearinghouse's USDG burnt by USDG's supply controller, or the vault blocklisted on the NVDA Stock Token in a week that was not fully assigned. `rollClose` still returns the vault to Idle, credits the premium already in the vault and settles the redeem queue on the idle NVDA, but it keeps the claim. The claim is then **stranded**. While it is:

* deposits are refused and instant redemption is off, so nobody buys in or leaves at a share price that cannot yet see the claim;
* the keeper cannot arm the next week;
* the redeem queue still works: an epoch settled now is paid its share of the idle NVDA straight away, and its pro-rata share of the claim once the claim is redeemed;
* anyone can call `retryStrandedClaim()` at any time. It reverts while the cause persists, and redeems the claim the first time Valorem lets it through.

In the fork rehearsal, USDG's issuer key froze the vault after a week in which 2 contracts were sold and 1 was exercised. `rollClose` stranded the claim, a deposit and the next `rollOpen` were both refused, and `retryStrandedClaim` reverted while the freeze held. After the unfreeze the retry returned 1 NVDA and 239 USDG, and the next week armed normally. See [Withdrawing and the redeem queue](withdrawing.md#stranded-claims-and-your-queue).

For the technical version of this loop, see [Architecture](../protocol/architecture.md) and [Accounting](../protocol/accounting.md).

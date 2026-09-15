# How Stonkhouse works

Stonkhouse runs one trade a week: it sells covered calls on pooled NVDA Stock Tokens and passes the USDG premium to depositors. The timing comes from Overcall's registry, not from a calendar inside the vault. If the registry has no open cycle, the vault writes nothing.

{% hint style="warning" %}
Premium is paid only if a buyer fills. Assignment can take the collateral at the strike. Stock Tokens are debt securities. Stonkhouse is not available to US persons.
{% endhint %}

## The loop in six steps

1. **You deposit.** You send NVDA Stock Tokens to the vault and receive cNVDA shares, pro rata to the NVDA the vault already holds. While the vault is idle you can also withdraw straight away. See [Depositing](depositing.md).

2. **The vault writes calls.** When Overcall's registry opens a weekly cycle, the keeper picks the nearest strike rung inside the vault's out-of-the-money band (3% to 12% above spot at launch). The vault locks idle NVDA in Valorem Clear and writes whole contracts. One contract is backed by 1.0000 Stock Token. The vault writes at most 95% of its idle NVDA and at most 50 contracts. If no rung qualifies, nothing is written and the NVDA sits idle for the week.

3. **The calls are listed for USDG.** The vault lists the option tokens on Seaport 1.6, where they appear on Overcall's book. The vault itself is the seller. The keeper proposes the order and the vault checks every field before authorising it. At most three listings can be signed per cycle, and a listing must end by the cycle's exercise timestamp.

4. **A buyer fills, or nobody does.** If a buyer fills, the USDG arrives in the same transaction: 95% to the vault and 5% to Overcall. Listings can be filled in part. If nobody fills, the week's premium is zero and nobody charges a fee. When the exercise timestamp arrives, the book closes and deposits close with it.

5. **The exercise window.** Anyone holding one of this week's calls can exercise it between the exercise timestamp and expiry. Overcall's current window is 24 hours. Exercise happens inside Valorem: it takes NVDA collateral at the strike and leaves the strike price in USDG. Valorem spreads each exercise across every writer of that option series, whoever sold the call that was exercised, so the vault's collateral can be assigned even if its own listing filled only in part or did not fill at all. See [Assignment](../product/assignment.md).

6. **The week closes.** After expiry, `rollClose` redeems the vault's Valorem claim. NVDA that was not assigned comes back, and strike USDG comes back where it was. The vault takes its 5% protocol fee from the premium only, credits the rest of the USDG to shareholders, settles the redeem queue, and returns to Idle. The keeper can call `rollClose` from expiry, and anyone can call it one hour later.

Then the next cycle opens and the loop repeats. The phase-by-phase version is on [The weekly cycle](../product/weekly-cycle.md).

## Where the money goes

```
  You ──── NVDA ────► Stonkhouse vault ─── cNVDA ────► You
                            │
             rollOpen: lock idle NVDA, write calls
                            ▼
                      Valorem Clear
            (holds the collateral, mints the options)
                            │  option tokens
                            ▼
              Seaport 1.6 listing, shown on Overcall
                            │
          nobody fills ─────┼───► premium 0, fees 0
                            │ a buyer fills
               ┌────────────┴────────────┐
         95% of premium            5% of premium
          to the vault              to Overcall
                            │
               rollClose, after expiry
                            │
   NVDA not assigned ──► back to the vault        (share price)
   NVDA assigned     ──► strike USDG, no fee      (USDG claim)
   premium at vault  ──► 5% protocol fee,
                         95% of it to holders     (USDG claim)
```

## Two balances, kept apart

Your position has two parts, and they move for different reasons.

| | Unit | What moves it |
|---|---|---|
| **cNVDA share price** | NVDA per share | Assignment, which removes NVDA without burning shares. Deposits and redemptions (instant, or queued and settled pro rata at `rollClose`) mint or burn shares pro rata and leave it unchanged, apart from rounding in the vault's favour. |
| **Claimable USDG** | USDG | Premium from filled weeks, net of fees, and strike proceeds from assignment. |

Premium is never folded into the share price. A filled week leaves the share price where it was and adds USDG you can claim. An assigned week lowers the share price in NVDA terms, because NVDA left the vault, and adds the strike USDG to your claim instead. The short call is never marked to market, and no price feed is read when the week settles.

## How a week can end

| Ending | Premium | Collateral |
|---|---|---|
| Nobody bought | Zero, and no fees are charged | Whatever Valorem did not assign comes back at `rollClose` |
| Bought, expired out of the money | Kept, net of fees | Comes back at `rollClose` |
| Bought and exercised | Kept, net of fees | Assigned NVDA is replaced by strike USDG, credited without a fee |

Which ending you get depends on the order book, on what holders of this week's calls do (including calls other writers sold in the same series), and on how Valorem spreads exercise across those writers. The vault does not decide it.

For the technical version of this loop, see [Architecture](../protocol/architecture.md) and [Accounting](../protocol/accounting.md).

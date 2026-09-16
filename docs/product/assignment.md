# Assignment

Assignment can take **your** listed NVDA at the strike. When a holder exercises your option type, Valorem takes NVDA from the collateral **your account** locked and leaves the strike in USDG. You lose that NVDA and receive the strike USDG instead, with no protocol fee.

{% hint style="warning" %}
**What assignment costs you:** every bit of upside above the strike on the lots that sold, and the NVDA itself. v1 does not buy the stock back. You keep the premium those lots earned, net of the 5% fee (already paid to your wallet on the fill). Only lots you listed and that actually sold can be assigned. Idle NVDA cannot.
{% endhint %}

## When it can happen

A call can be exercised only during that option type's window: from the exercise timestamp up to, but not including, expiry. The keeper sets exercise at the NYSE Friday close, 4:00pm ET, and base expiry 24 hours later. **Your** expiry is base expiry plus your account index, so your option type is not anyone else's.

A holder would normally exercise only if NVDA trades above the strike. Week 1 strike is 223 USDG, about 5% above spot when the week was set. It takes a move, and the week has several days in which to make it.

Exercise happens entirely inside Valorem. NVDA leaves your claim immediately. Strike USDG stays in the claim until `settle` redeems it after your expiry.

## Isolation from other Stonkhouse writers

Valorem assigns an exercise pro rata by amount written across writers of **the same option type** in a bucket.

Each Stonkhouse account creates its own type: same strike and exercise, **expiry = base expiry + index**. Other Stonkhouse users cannot share your bucket. Someone else on the clearinghouse could still write that exact type; that is Valorem's rule, not a Stonkhouse pool.

Because the account writes only inside fills, and only 1 NVDA per fill, it can be assigned on at most the lots it sold. An unfilled week wrote nothing and cannot be assigned.

## What you end with

| Outcome on a sold lot | NVDA | USDG |
|---|---|---|
| Not exercised | Unsold / unassigned NVDA returns to the account at `settle` | Premium already in your wallet (95% of ask) |
| Exercised | That NVDA is gone | Strike USDG in the account after `settle`, plus the premium already in your wallet |

Collect strike USDG with **Collect USDG** on `/account`. There is no share price. Your idle lots are untouched.

## Related

* [The weekly cycle](weekly-cycle.md)
* [Fees](fees.md)
* [Accounting](../protocol/accounting.md)

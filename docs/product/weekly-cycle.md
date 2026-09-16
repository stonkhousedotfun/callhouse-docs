# The weekly cycle

Each week the factory posts one strike, one exercise time, one base expiry and one ask. Every listed account copies those terms, then writes **its own** Valorem option type so assignment cannot hit anyone else's lots.

```
factory.setWeek  →  owner requestWrite  →  list (owner or keeper)
                         │
                         ▼
              N full 1-lot Seaport orders
                         │
              buyer fills on /book  (write-on-fill, 1 NVDA)
                         │
         Friday 4:00pm ET: sale window ends, exercise opens
                         │
         after that account's expiry: anyone settle()
```

Nothing is written when the week is set or when you list. Each fill writes exactly one NVDA from **that** account. A week nobody buys writes nothing.

{% hint style="info" %}
**The weekly times are US Eastern Time.** By default the keeper sets exercise at the NYSE Friday close, 4:00pm America/New_York, and base expiry 24 hours later. That is 8:00pm UTC while US daylight saving time is in force, and 9:00pm UTC after it ends on 1 November 2026. When Friday is a full-day NYSE holiday, exercise moves back to the previous session's close. These are the keeper's choices. The factory only checks that exercise is at least 1 hour away and that base expiry is at least 1 day after exercise.
{% endhint %}

The keeper's built-in holiday table covers 2026 and 2027. Fridays still to come:

| Friday holiday | Exercise instead |
|---|---|
| 25 December 2026 (Christmas) | Thursday 24 December 2026, 4:00pm ET |
| 1 January 2027 (New Year's Day) | Thursday 31 December 2026, 4:00pm ET |
| 26 March 2027 (Good Friday) | Thursday 25 March 2027, 4:00pm ET |
| 18 June 2027 (Juneteenth, observed) | Thursday 17 June 2027, 4:00pm ET |
| 24 December 2027 (Christmas, observed) | Thursday 23 December 2027, 4:00pm ET |

## The factory week

Only the keeper can call `setWeek`. It stores:

| Field | Live week 1 (2026-09-15) | What the factory enforces |
|---|---|---|
| `id` | 1 | Increments by one each `setWeek` |
| Strike | 223 USDG | Non-zero |
| Exercise timestamp | Friday 18 September 2026, 4:00pm ET | At least 1 hour after `setWeek` |
| Base expiry | Saturday 19 September 2026, 4:00pm ET | At least 1 day after exercise |
| Ask per lot | 1.000000 USDG | Non-zero, and not above the strike |

A later `setWeek` does **not** move an account that already listed. `list` pins strike, ask, exercise and that account's expiry.

## Listing

1. **You choose lots.** `requestWrite(X)` on your account. Whole NVDA only. `X = 0` un-queues. You cannot change this while listed.
2. **List.** You or the keeper (`listFor`) posts **X full 1-contract Seaport orders**. The account creates a Valorem option type with this week's strike and exercise, and **expiry = base expiry + your account index** (seconds). That offset is what keeps assignment off other Stonkhouse writers.
3. **Nothing is written yet.** NVDA is reserved. Orders are `FULL_RESTRICTED`, zone = the account, end time = exercise timestamp.

Live policy at list: strike 3%–12% OTM at spot, ask at least 0.40% of spot, at most 50 lots, writes not halted, Valorem engine fee off or accepted, oracle live.

## During the sale window

Fills happen on `app.stonkhouse.fun/book`. Each fill:

* writes 1 NVDA from that seller's account into Valorem
* pays 95% of the ask to the **owner's wallet** and 5% to the fee recipient, inside the Seaport order
* stops at the exercise timestamp

Idle NVDA you did not request is never written.

## Exercise and settle

From the option's exercise timestamp until that **account's** expiry, a buyer can take the NVDA at the strike. After `listedExpiryTs`, anyone can call `settle()` on that account: leftover orders are cancelled, unsold NVDA unlocks, and if anything was written the Valorem claim is redeemed (unassigned NVDA back, strike USDG into the account).

If redeem fails (USDG paused or frozen, the account blocklisted on NVDA), `settle` still clears the listing and leaves the claim in place. Call `settle` again once the restriction lifts.

The keeper's holiday Fridays and the 6-hour arm lead are software defaults, not bytecode.

## Related

* [Buying calls](buying-calls.md)
* [Assignment](assignment.md)
* [Roles and admin powers](../protocol/roles.md)

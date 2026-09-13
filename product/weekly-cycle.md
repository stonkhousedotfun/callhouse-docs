# The weekly cycle

The vault moves through four phases every cycle:

```
Idle ──rollOpen──► Listed ──lockBook──► Exercisable ──rollClose──► Settling ──► Idle
                      │                                   ▲
                      └────────────── rollClose ──────────┘
                              (lockBook is optional)
```

The vault has no calendar of its own. Every deadline comes from Overcall's registry for the NVDA market, which publishes each cycle's strikes, its exercise timestamp and its expiry. The vault copies those timestamps when it writes, so a cycle keeps its own deadlines even after the registry moves on to the next one.

{% hint style="info" %}
**Overcall's current window** is book close on Friday at 20:00 UTC and expiry on Saturday at 20:00 UTC, in a seven-day cycle with a 24-hour exercise window. Those times belong to the venue, not to Callhouse. If the registry moves them, the vault moves with it.
{% endhint %}

## The phases

| Phase | Starts when | Who triggers it | Deposits | Withdrawals |
|---|---|---|---|---|
| **Idle** | The vault is flat | — | Open, up to the cap | Instant |
| **Listed** | `rollOpen` writes this cycle's calls | Keeper only | Open until the exercise timestamp | Queue |
| **Exercisable** | `lockBook`, at or after the exercise timestamp | Anyone | Closed | Queue |
| **Settling** | `rollClose`, at or after expiry | Keeper from expiry; anyone from expiry + 1 hour | Closed | Being settled |
| **Idle** again | End of the same `rollClose` transaction | — | Open | Instant |

### Idle → Listed: `rollOpen`

Only the keeper can open a cycle, and only while the registry says writing is open. The keeper chooses one of the registry's strike rungs (up to five per cycle) and a number of contracts. The vault then checks everything itself before any NVDA moves:

* the vault is Idle and writes are not halted;
* the option is approved in the registry's current cycle, and its exercise and expiry match the cycle's;
* the cycle's expiry is after its exercise timestamp and no more than 21 days away;
* the strike is 3% to 12% above spot (launch band);
* the price feed is no older than 4 days (launch setting) and the Stock Token has not paused its oracle;
* the number of contracts is at least 1, at most 50, and at most 95% of idle NVDA in whole tokens;
* Valorem's engine fee is off, or governance has accepted it.

If any check fails, nothing is written and the vault stays Idle for the week. Deposits and instant redemptions stay open. A skipped week is a normal outcome.

### During Listed: listings

The keeper proposes a Seaport order, and the vault authorises it on chain only if every field matches the vault's own state and the gross premium is at least 0.40% of spot notional. One listing can be live at a time, at most three can be signed per cycle, and every listing must end by the exercise timestamp. The keeper or the Guardian can cancel a listing.

Buyers can fill a listing in part or in full. Each fill pays USDG to the vault immediately.

### Listed → Exercisable: `lockBook`

From the exercise timestamp, anyone can call `lockBook`. It cancels any listing still live and moves the vault to Exercisable. Nothing depends on it being called: deposits close on the timestamp itself, and `rollClose` also accepts a vault that is still Listed.

During the exercise window, holders of this cycle's calls can exercise them in Valorem. The vault does nothing in this phase. See [Assignment](assignment.md).

### Exercisable → Settling → Idle: `rollClose`

From expiry, the keeper can call `rollClose`. One hour after expiry, anyone can. This is the fallback if the keeper is down: nobody needs a key to get the week closed.

`rollClose` runs as one transaction, in this order:

1. Cancels any listing still live.
2. Redeems the vault's Valorem claim: NVDA that was not assigned comes back, and strike USDG comes back for what was.
3. Harvests the USDG: the 5% protocol fee is taken from the premium only, and the rest, including strike proceeds in full, is credited per share.
4. Settles the redeem queue for this epoch.
5. Returns the vault to Idle.

## What stops at each phase, and what never does

A halt on writes blocks `rollOpen` and new listings. It never blocks deposits, instant or queued redemptions, USDG claims, cancelling a listing, `lockBook` or `rollClose`.

| Action | Idle | Listed | Exercisable |
|---|---|---|---|
| Deposit | Yes | Until the exercise timestamp | No |
| Instant redemption | Yes | No | No |
| Queue a redemption | Yes, but it waits for the next close | Yes | Yes |
| Complete a settled redemption | Yes | Yes | Yes |
| Claim USDG | Yes | Yes | Yes |

## Related

* [How Callhouse works](../getting-started/how-it-works.md)
* [Launch policy and hard caps](policy.md)
* [Roles and admin powers](../protocol/roles.md)

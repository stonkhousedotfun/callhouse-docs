# Withdrawing and the redeem queue

There are two ways out, and the vault decides which one is open, not you.

* **Instant redemption**, only while the vault is flat: phase Idle with no calls written. Your shares burn and NVDA comes back in the same transaction.
* **The redeem queue**, whenever a call is open. Your shares are escrowed, settled when the week closes, and paid as NVDA plus USDG.

{% hint style="warning" %}
A withdrawal from an open week is never a promise of a fixed number of tokens. Assignment can take the collateral at the strike, and if the week was assigned, part of your payout arrives as USDG instead of NVDA.
{% endhint %}

## Which path is open

| Vault phase | Instant redemption | Queue |
|---|---|---|
| Idle, nothing written | Open | Available, but see the warning below |
| Listed | Closed (`UseQueue`) | Open |
| Exercisable | Closed (`UseQueue`) | Open |
| Settling | Closed. This phase lasts one transaction. | — |

The app shows "instant path open" or "queue only" based on the vault's `canRedeemInstantly()`. The vault's redemption preview returns zero whenever the queue is the only path, so the app never shows an instant amount you cannot actually get.

## Instant redemption

### Step by step

1. Open the NVDA vault at `app.callhouse.xyz` and connect your wallet.
2. Enter the number of cNVDA shares to redeem. The app shows "Redeem now" when the instant path is open.
3. Confirm. Your shares burn and NVDA is sent to you in the same transaction.

### What you receive

NVDA equal to your shares times the current NVDA per share, rounded down. Instant redemption pays NVDA only. Any USDG your shares had earned stays credited to you; claim it separately on [Claiming USDG](claiming-usdg.md).

### What can block it

| Cause | What you see |
|---|---|
| A call is open | `UseQueue`. Use the queue. |
| The Stock Token issuer has frozen transfers | The NVDA transfer reverts until the freeze lifts |
| The amount rounds to zero NVDA | `ZeroAssets` |

A halt on writes never blocks instant redemption. Halting stops new calls from being written; it does not stop a withdrawal of idle NVDA.

## The redeem queue

### Step by step

1. **Queue.** Enter the number of cNVDA shares and choose "Queue redemption". This calls `queueRedeem`. Your shares move out of your wallet into escrow in the vault, tagged with the current epoch.
2. **Wait for the week to close.** When `rollClose` runs after expiry, it harvests the week's USDG first, then settles the queue: the escrowed shares are burned and their NVDA and USDG are set aside for the people who queued.
3. **Complete.** Choose "Complete redemption". This calls `completeRedeem` and sends your NVDA and USDG to you.

### What you receive

* **NVDA:** your share of the vault's idle NVDA at settlement, pro rata to the shares you queued.
* **USDG:** exactly what your own escrowed shares earned between the moment you queued and settlement. Escrowed shares keep earning right up to settlement. On an assigned week this includes their share of the strike proceeds, so the payout is a mix of NVDA and USDG. Someone who queues after you cannot take a share of what your shares earned before they joined.

USDG already credited to your shares *before* you queued is not part of the queue payout. It stays with you when you queue and remains claimable through [Claiming USDG](claiming-usdg.md). If you queue, check both places.

Once an epoch is settled, your amounts are fixed. You are not diluted by later deposits, and you do not dilute anyone else. The contracts set no deadline for completing a settled redemption.

### Timing

A queued redemption settles at the `rollClose` of the cycle that is open when you queue. The keeper can call `rollClose` from expiry, and anyone can call it one hour after expiry, so a stopped keeper cannot hold the queue past the week. Under Overcall's current window, expiry is Saturday 20:00 UTC, but the registry's timestamps are what count.

{% hint style="warning" %}
**Do not queue while the vault is Idle.** The queue is never blocked by the phase, so the transaction will succeed, but a queued redemption only settles at the next `rollClose`. That needs a call to be written first, which may not happen for a week or more. While the vault is Idle, use instant redemption instead.

**A queued redemption cannot be cancelled.** There is no function to take escrowed shares back.
{% endhint %}

### What can block each step

| Step | Blocked by | Not blocked by |
|---|---|---|
| `queueRedeem` | Queueing more shares than you hold (`InsufficientFreeShares`) | The phase, a halt on writes, or an issuer freeze |
| `completeRedeem` | The epoch has not settled yet (`EpochNotSettled`); nothing queued (`NothingQueued`); an issuer freeze on the Stock Token, because the NVDA transfer reverts | A halt on writes |

You have one queue slot per account. If you queue again after an earlier epoch has settled but before you completed it, the earlier amounts are moved into your owed balance automatically. No tokens move at that point, which is why queueing still works during an issuer freeze. `completeRedeem` then pays everything you are owed at once.

## Why withdrawals queue at all

While a call is open, the NVDA behind it is locked in Valorem until expiry. The vault cannot hand it back early, and it will not quote a price for a position whose outcome depends on whether buyers exercise. The queue is the mechanism, not a discretionary gate. No key can jump it, and no key can stop it.

cNVDA is not listed anywhere, so there is no secondary market to sell into instead.

## Related

* [The weekly cycle](../product/weekly-cycle.md)
* [Assignment](../product/assignment.md)
* [Accounting](../protocol/accounting.md), for the queue maths

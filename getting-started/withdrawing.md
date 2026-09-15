# Withdrawing and the redeem queue

There are two ways out, and the vault decides which one is open, not you.

* **Instant redemption**, only while the vault is flat: Idle, with nothing written. Your shares burn and NVDA comes back in the same transaction.
* **The redeem queue**, at any time. Your shares are escrowed and settled when the week closes, or, while the vault is Idle, whenever anyone calls `settleQueue()`. You then collect NVDA plus USDG with `completeRedeem`.

{% hint style="warning" %}
A withdrawal from an open week is never a promise of a fixed number of tokens. Assignment can take the collateral at the strike, and if the week was assigned, part of your payout arrives as USDG instead of NVDA.
{% endhint %}

## Which path is open

| Vault state | Instant redemption | Queue |
|---|---|---|
| Idle, nothing written | Open | Available. Anyone's `settleQueue` settles it at the instant price. |
| Idle, with a stranded claim | Closed (`UseQueue`) | Open, and the only exit. See [Stranded claims and your queue](#stranded-claims-and-your-queue). |
| Listed, including a week with nothing sold yet | Closed (`UseQueue`) | Open. Settles at `rollClose`. |
| Exercisable | Closed (`UseQueue`) | Open. Settles at `rollClose`. |
| Settling | Closed. This phase lasts one transaction. | — |

The app shows "instant path open" or "queue only" based on the vault's `canRedeemInstantly()`. The vault's redemption preview returns zero whenever the queue is the only path, so the app never shows an instant amount you cannot actually get.

## Instant redemption

### Step by step

1. Open the NVDA vault at `app.callhouse.finance` and connect your wallet.
2. Enter the number of cNVDA shares to redeem. The app shows "Redeem now" when the instant path is open.
3. Confirm. Your shares burn and NVDA is sent to you in the same transaction.

### What you receive

NVDA equal to your shares times the current NVDA per share, rounded down. Instant redemption pays NVDA only. Any USDG your shares had earned stays credited to you; claim it separately on [Claiming USDG](claiming-usdg.md).

### What can block it

| Cause | What you see |
|---|---|
| The vault is not flat: a week is listed or open, or a claim is stranded | `UseQueue`. Use the queue. |
| The Stock Token issuer has paused transfers, or blocklisted you or the vault | The NVDA transfer reverts until the restriction lifts |
| Zero shares, or an amount that rounds to zero NVDA | `ZeroShares` or `ZeroAssets` |

A halt on writes never blocks instant redemption. Halting stops new weeks, listings and fills; it does not stop a withdrawal of idle NVDA.

## The redeem queue

### Step by step

1. **Queue.** Enter the number of cNVDA shares and choose "Queue redemption". This calls `queueRedeem`. Your shares move out of your wallet into escrow in the vault, tagged with the current epoch.
2. **Settlement.** The queue settles in one of two ways, and neither moves any tokens:
   * at `rollClose`, after expiry: the close redeems the claim and credits the week's USDG first, then settles the queue;
   * while the vault is Idle, when anyone calls `settleQueue()`, including you from the app ("Settle queue"). It first credits any USDG that arrived since the last close, then settles.

   Settling burns every escrowed share in the queue, not only yours, and sets aside their NVDA and USDG for the people who queued.
3. **Complete.** Choose "Complete redemption". This calls `completeRedeem` and sends your NVDA and USDG to you.

### What you receive

* **NVDA:** your share of the vault's idle NVDA at settlement, priced exactly like an instant redemption of the same shares at that moment.
* **USDG:** what your own escrowed shares earned between the moment you queued and settlement, rounded down and capped at what the epoch still holds. Whoever collects last from an epoch takes whatever USDG it has left instead, so a payout can differ from its own earnings, usually by a few base units of rounding. Escrowed shares keep earning right up to settlement. On an assigned week this includes their share of the strike proceeds, so the payout is a mix of NVDA and USDG. Someone who queues after you cannot take a share of what your shares earned before they joined.
* **A share of a stranded claim,** if a claim was stranded when your epoch settled. It is paid once the claim is redeemed; see below.

USDG already credited to your shares *before* you queued is not part of the queue payout. It stays with you when you queue and remains claimable through [Claiming USDG](claiming-usdg.md). If you queue, check both places.

Once an epoch is settled, your amounts are fixed. You are not diluted by later deposits, and you do not dilute anyone else. The one exception is the pro-rata haircut after an issuer burn, below. The contracts set no deadline for completing a settled redemption.

### Timing

A queued redemption settles at the `rollClose` of the week that is open when you queue. If the vault is Idle when you queue, it settles when anyone calls `settleQueue()`. The keeper settles a queue waiting in an Idle vault before it arms the next week, but that is how the keeper runs, not a rule in the contract: if a week is armed first, your entry waits for that week's close, and your escrowed shares, which still count in the share supply, are exposed to that week like any other.

The keeper can call `rollClose` from expiry, and anyone can call it one hour after expiry, so a stopped keeper cannot hold the queue past the week. The keeper sets expiry 24 hours after the Friday NYSE close, which is Saturday at 16:00 New York time in a normal week; the option's own timestamps, shown in the app, are what count.

A token issuer cannot stop the queue from settling. If the week's claim cannot be redeemed because of a USDG or Stock Token restriction, `rollClose` strands the claim and settles the queue anyway. A halt on writes, a stale price feed or a paused Stock Token oracle does not hold it up either.

{% hint style="warning" %}
**A queued redemption cannot be cancelled.** There is no function to take escrowed shares back.

**While the vault is Idle with nothing written, redeem instantly.** Instant redemption is one transaction. The queue is three (`queueRedeem`, `settleQueue`, `completeRedeem`), and if a new week is armed before the queue settles, your shares stay exposed to that week until it closes.
{% endhint %}

### The two legs of a payout

`completeRedeem` pays the NVDA leg first and then tries the USDG leg on its own.

* **The NVDA leg is paid whatever USDG is doing.** A USDG pause, or USDG freezing the vault or your receiving address, does not stop it. A Stock Token pause, or a Stock Token blocklist of you or of the vault, does: the whole call reverts, because there is nothing else to pay principal with.
* **The USDG leg may be deferred.** If the USDG transfer fails, the NVDA still goes out, the USDG stays owed to you (the vault emits `UsdgLegDeferred`), and a later `completeRedeem`, to the same or another receiving address, collects it. If USDG is the only thing left and it still cannot move, the call reverts with `UsdgLegBlocked` and nothing changes.

### After an issuer burn: the reserve haircut

NVDA set aside for settled redemptions is senior to live shares, but the Stock Token issuer can burn tokens from the vault. If a burn leaves the vault holding less NVDA than it has set aside, every settled redeemer who has not yet collected is paid the same fraction of their booked NVDA: the vault's NVDA balance divided by the amount set aside. The order in which people collect does not change the fraction, and the vault records each cut as `ReserveHaircut`. A haircut already paid is permanent, even if the issuer later restores tokens; restored tokens go to live shares through the share price. While a week is open, collateral returning at `rollClose` refills the balance, and a redeemer who has not yet collected is then paid in full. `previewCompleteRedeem` quotes the amount after any haircut.

### Stranded claims and your queue

If the week's claim is stranded (see [How Callhouse works](how-it-works.md#when-the-claim-cannot-be-redeemed)), instant redemption stays off until the claim is redeemed, and the queue is the exit. An epoch settled while the claim is stranded, at that `rollClose` or by a later `settleQueue`, is paid in two parts:

1. **Now:** its share of the idle NVDA, and the USDG its escrowed shares earned. `completeRedeem` pays these straight away.
2. **When the claim is redeemed:** a pro-rata share of the stranded claim, recorded as `EpochStrandShare`. It becomes NVDA and USDG only when someone's `retryStrandedClaim()` succeeds. Your next `completeRedeem` after that pays it.

Until the claim is redeemed, `previewCompleteRedeem` quotes that share as nothing, and a `completeRedeem` with nothing else to collect reverts with `StillStranded`. The share is owed, not lost. The app shows it on the stranded banner, with a button that sends `retryStrandedClaim`.

In the fork rehearsal, a holder queued 2 of the vault's 16 shares in the week whose claim was stranded. At the close that holder was owed 1.55 NVDA of idle collateral, 0.218766 USDG and 12.5% of the claim. After the retry returned 1 NVDA and 239 USDG, one `completeRedeem` paid 1.675 NVDA and 30.093766 USDG.

### What can block each step

| Step | Blocked by | Not blocked by |
|---|---|---|
| `queueRedeem` | Queueing zero shares (`ZeroShares`) or more shares than you hold (`InsufficientFreeShares`) | The phase, a halt on writes, an issuer freeze, or a stranded claim |
| `settleQueue` | The vault not being Idle (`WrongPhase`); nothing queued (`NothingQueued`) | A halt on writes, an issuer freeze, or a stranded claim |
| `completeRedeem` | The epoch has not settled yet (`EpochNotSettled`); nothing queued (`NothingQueued`); only a share of a still-stranded claim left (`StillStranded`); only USDG left and USDG cannot move (`UsdgLegBlocked`); a Stock Token pause or blocklist, because the NVDA transfer reverts | A halt on writes; a USDG pause or freeze while there is NVDA to pay |

You have one queue slot per account. If you queue again after an earlier epoch has settled but before you completed it, the earlier amounts are moved into your owed balance automatically. No tokens move at that point, which is why queueing still works during an issuer freeze. `completeRedeem` pays everything you are owed at once, and it can be called for the earlier amounts even while your new entry is still waiting. The app offers a separate button for those earlier amounts only in some states; you can always call `completeRedeem` directly.

## Why withdrawals queue at all

While a week has calls sold, the NVDA behind them is locked in Valorem until expiry. The vault cannot hand it back early, and it will not quote a price for a position whose outcome depends on whether holders exercise. The queue is the mechanism, not a discretionary gate. No Callhouse key can jump it or stop it. The token issuers are outside Callhouse's control: a Stock Token restriction can hold up the NVDA leg of a payout until it lifts, and a USDG restriction can defer the USDG leg or strand the week's claim. See [Risks](../product/risks.md).

Do not send cNVDA to the vault's own address. That is not a withdrawal request: shares sent there are never burned or paid out, so they are lost. cNVDA is not listed anywhere, so there is no secondary market to sell into instead.

## Related

* [The weekly cycle](../product/weekly-cycle.md)
* [Assignment](../product/assignment.md)
* [Accounting](../protocol/accounting.md), for the queue maths

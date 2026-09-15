# Claiming USDG

Premium and strike proceeds reach you as USDG, tracked per share and claimed separately from your cNVDA. The cNVDA share price is a pure NVDA number. If your claimable USDG does not move, no premium reached you.

{% hint style="warning" %}
Premium is paid only if a buyer fills. A week with no buyer adds no premium to your claimable USDG, and that is shown as zero rather than hidden. A week with no buyer also writes no calls, so nothing can be assigned in it. When a week that did sell calls is assigned (see [Assignment](../product/assignment.md)), the strike USDG for the NVDA that was taken is credited to your claimable balance, with no fee.
{% endhint %}

## What becomes claimable

| Source | What reaches depositors |
|---|---|
| Premium from a fill | The whole premium the buyer paid reaches the vault. Depositors are credited that amount less the Stonkhouse protocol fee, currently 5% (`protocolFeeBps` 500). The rate is the one in force when the vault accounts for the USDG, and the admin can change it up to 20%. No other party takes a cut: the Valorem engine fee on Stonkhouse's clearinghouse is switched off. |
| Strike proceeds from assignment | All of it. No protocol fee is charged on strike proceeds. |
| A week with no buyer | Nothing, and no fee is charged. |
| A stranded claim, once redeemed | The strike USDG belonging to shares still held, credited in full when `retryStrandedClaim` succeeds. The part belonging to epochs that settled while the claim was stranded is paid to those redeemers through `completeRedeem` instead. |

The amounts are split across all cNVDA shares pro rata. USDG has 6 decimals. See [Fees](../product/fees.md) for the arithmetic.

In the keeper's fork dry run (see [How Stonkhouse works](how-it-works.md#a-week-from-a-fork-rehearsal)), two fills paid 4.280945 USDG of premium. The protocol fee was 0.214047 USDG and 4.066898 USDG was credited to shares. Two contracts were then assigned at a 223 USDG strike, and the 446 USDG of strike proceeds was credited with no fee.

## How the USDG index works

The vault keeps one per-share index, `accUsdgPerShare`, that only ever goes up. When the vault accounts for new USDG, it sets the protocol fee aside and adds the rest, divided by the share supply, to the index. The index is scaled by 10^27 because USDG has only 6 decimals, so a small premium spread over many shares does not round to zero.

Each account remembers the index at its last balance change. What it has earned since is its share balance times the rise in the index. That settlement runs inside every transfer, mint and burn of cNVDA, so it holds without any action from you. An amount too small to add to the index is carried into the next distribution, and USDG that arrives while no shares exist is held until there are some. Nothing is dropped.

## When it becomes claimable

A fill pays USDG into the vault straight away, but it is credited to shareholders when the vault next accounts for it:

* **At `rollClose`**, after expiry. This is the normal case. The close credits both the premium and any strike proceeds.
* **At a deposit.** Before any deposit (or `mint`) creates new shares, the vault credits premium that has already arrived to the existing shares. So if someone deposits after a fill, that premium can become claimable before the week closes.
* **At `settleQueue`.** Settling the queue while the vault is Idle first credits any USDG that has arrived since the last close.
* **At `retryStrandedClaim`**, for the strike USDG of a claim that was stranded.

Until one of those runs, premium sitting in the vault is not in your claimable figure. Claiming does not run it, and the vault has no separate function that does. Strike proceeds are only credited at `rollClose` or `retryStrandedClaim`, because they stay inside the Valorem claim until it is redeemed.

USDG is not reinvested into NVDA. It waits for you to claim it.

## Step by step

1. Open the NVDA vault at `app.stonkhouse.fun/vault/nvda` and connect MetaMask or Phantom.
2. The USDG card shows your claimable balance ("Claimable"). This is the vault's own `claimableUsdg` figure read from the chain, not a projection. Because of index rounding it can be a base unit or so above what the claim actually pays (see below).
3. Choose "Claim … USDG". This calls `claimUsdg()` and sends the full claimable amount to your wallet. The contract also has `claimUsdgTo(address)` if you want it sent to a different address.

You can claim at any time, in any phase. The contracts set no deadline.

## What can block a claim

| Cause | What you see |
|---|---|
| Nothing is claimable | `NothingToClaim` |
| A problem on USDG's side: a paused USDG contract, or USDG freezing the vault or the receiving address | The USDG transfer reverts |

Claims are **not** blocked by:

* the vault's phase, an open week or a stranded claim;
* a halt on writes;
* a pause or blocklist on the NVDA Stock Token. A claim only moves USDG, so it keeps working while Stock Token transfers are stopped.

Each claim is limited to the USDG the vault holds that is not already set aside for the redeem queue or the protocol fee. Because the per-share index rounds down, this can leave at most a few base units of dust unpaid. It never touches principal.

## USDG from the redeem queue, and deferred legs

USDG earned by your shares while they wait in the redeem queue, and your share of a stranded claim's USDG, are paid by `completeRedeem`, not by `claimUsdg`. They do not appear in your claimable figure.

If USDG could not move when you completed a redemption (USDG paused, or the vault or your receiving address frozen by USDG), the NVDA was still paid and the USDG leg was deferred. It stays owed to you in the queue's books, and a later `completeRedeem`, to the same or a different address, collects it. See [Withdrawing and the redeem queue](withdrawing.md#the-two-legs-of-a-payout).

## Transfers, redemptions and the queue

* **Transferring cNVDA.** USDG credited to the shares up to the moment of a transfer stays with the sender, and the receiver starts earning from that point. Premium that reached the vault before the transfer but is credited after it (see [When it becomes claimable](#when-it-becomes-claimable)) goes to the receiver. Shares are ERC-20 tokens and the accrual settles on every transfer, mint and burn.
* **Instant redemption.** Burning your shares does not burn your USDG. Anything already credited stays claimable here.
* **The redeem queue.** USDG credited before you queued stays claimable here. USDG credited to your escrowed shares while they wait in the queue is paid with the redemption through `completeRedeem`, not through `claimUsdg`.

## Related

* [Fees](../product/fees.md)
* [Assignment](../product/assignment.md)
* [Accounting](../protocol/accounting.md), for the per-share index

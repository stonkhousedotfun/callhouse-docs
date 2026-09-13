# Claiming USDG

Premium and strike proceeds reach you as USDG, tracked per share and claimed separately from your cNVDA. The cNVDA share price is a pure NVDA number. If your claimable USDG does not move, no premium reached you.

{% hint style="warning" %}
Premium is paid only if a buyer fills. A week with no buyer adds no premium to your claimable USDG, and that is shown as zero rather than hidden. The vault's collateral can still be assigned that week (see [Assignment](../product/assignment.md)). If it is, the strike USDG for the NVDA that was taken is credited to your claimable balance at `rollClose`, with no fee.
{% endhint %}

## What becomes claimable

| Source | What reaches depositors |
|---|---|
| Premium from a filled listing | The 95% of gross premium the vault receives after Overcall's 5%, less the 5% Callhouse protocol fee on that amount |
| Strike proceeds from assignment | All of it. No protocol fee is charged on strike proceeds. |
| An unfilled week | No premium, and no fee is charged. If any of the vault's contracts were still assigned that week, the strike proceeds are credited in full, as in the row above. |

The amounts are split across all cNVDA shares pro rata. USDG has 6 decimals. See [Fees](../product/fees.md) for the arithmetic.

## When it becomes claimable

A fill pays USDG into the vault straight away, but it is credited to shareholders when the vault next accounts for it:

* **At `rollClose`**, after expiry. This is the normal case. The close credits both the premium and any strike proceeds.
* **At a deposit.** Before any deposit mints new shares, the vault credits premium that has already arrived to the existing shares. So if someone deposits after a fill, that premium can become claimable before the week closes.

Strike proceeds are only credited at `rollClose`, because they stay inside the Valorem claim until the close redeems it.

USDG is not reinvested into NVDA. It waits for you to claim it.

## Step by step

1. Open the NVDA vault at `app.callhouse.finance` and connect your wallet.
2. The USDG card shows your claimable balance. This is the vault's own `claimableUsdg` figure read from the chain, not a projection. Because of index rounding it can be a base unit or so above what the claim actually pays (see below).
3. Choose "Claim". This calls `claimUsdg()` and sends the full claimable amount to your wallet. The contract also has `claimUsdgTo(address)` if you want it sent to a different address.

You can claim at any time, in any phase. The contracts set no deadline.

## What can block a claim

| Cause | What you see |
|---|---|
| Nothing is claimable | `NothingToClaim` |
| A problem on USDG's side, such as a paused USDG contract or a receiving address frozen by USDG | The USDG transfer reverts |

Claims are **not** blocked by:

* the vault's phase, or an open call;
* a halt on writes;
* a freeze on the NVDA Stock Token. A claim only moves USDG, so it keeps working while Stock Token transfers are stopped.

Each claim is limited to the USDG the vault holds that is not already set aside for the redeem queue or the protocol fee. Because the per-share index rounds down, this can leave at most a few base units of dust unpaid. It never touches principal.

## Transfers, redemptions and the queue

* **Transferring cNVDA.** USDG earned up to the moment of a transfer stays with the sender. The receiver starts earning from that point. Shares are ERC-20 tokens and the accrual settles on every transfer, mint and burn.
* **Instant redemption.** Burning your shares does not burn your USDG. Anything already credited stays claimable here.
* **The redeem queue.** USDG credited before you queued stays claimable here. USDG credited to your escrowed shares while they wait in the queue is paid with the redemption through `completeRedeem`, not through `claimUsdg`. See [Withdrawing and the redeem queue](withdrawing.md).

## Related

* [Fees](../product/fees.md)
* [Assignment](../product/assignment.md)
* [Accounting](../protocol/accounting.md), for the per-share index

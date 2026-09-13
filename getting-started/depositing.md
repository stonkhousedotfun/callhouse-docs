# Depositing

A deposit sends NVDA Stock Tokens into the vault and mints cNVDA shares to you. Deposits are open while the vault is Idle, and while it is Listed up until the cycle's exercise timestamp.

{% hint style="warning" %}
**Before you deposit:** Premium is paid only if a buyer fills. Assignment can take the collateral at the strike. Stock Tokens are debt securities, issued by Robinhood Assets (Jersey) Limited. Callhouse is not available to US persons. The contracts are not audited. Read [Risks](../product/risks.md) first.
{% endhint %}

{% hint style="info" %}
The vault is not deployed yet. The steps below describe how depositing works once it is. The vault address will be published on [Contracts and addresses](../protocol/addresses.md).
{% endhint %}

## What you need

* NVDA Stock Tokens on Robinhood Chain (chain id 4663), and eligibility to hold them under the issuer's own terms.
* ETH on Robinhood Chain for gas.
* A wallet connected to `app.callhouse.finance`.

## Step by step

1. Open the NVDA vault at `app.callhouse.finance` and connect your wallet. Switch to Robinhood Chain (4663) if asked.
2. Enter the amount of NVDA to deposit. The form shows how much room is left under the deposit cap and how many cNVDA the amount buys at the current share price. It does not quote a return.
3. **Approve.** The vault needs permission to move your NVDA. The app asks for an approval of exactly the amount you are depositing, not an unlimited one.
4. **Deposit.** Confirm the deposit transaction. The vault pulls your NVDA and mints cNVDA to you in the same transaction.

## What you receive

You receive cNVDA shares. cNVDA is an ERC-20 token with 18 decimals, the same as the Stock Token.

The number of shares is your deposit divided by the vault's current NVDA per share, rounded down. At launch one share is one NVDA. After that, deposits and redemptions leave the share price unchanged, apart from rounding; it falls when NVDA leaves without shares being burned, as in an assignment. Rounding always favours the vault, so you can never round your way to more than you put in.

The share price counts the vault's idle NVDA plus NVDA still locked in this week's Valorem claim. It does not include USDG. Premium is tracked separately; see [Claiming USDG](claiming-usdg.md).

## What your deposit does during an open week

* **It is not added to a call that is already written.** New NVDA lands in the vault's idle balance and waits for the next cycle's write.
* **It does not share premium earned before you arrived.** Before minting your shares, the deposit folds any premium that has already reached the vault into the per-share USDG index. Your shares start from that point.
* **Your shares are pooled.** Once you hold cNVDA, you share pro rata in whatever the rest of the week brings. That includes premium from fills after your deposit, and the effect of any assignment: a lower NVDA share price plus a share of the strike USDG.

## When deposits are open

| Vault phase | Deposits |
|---|---|
| Idle | Open, up to the cap |
| Listed, before the exercise timestamp | Open, up to the cap |
| Listed, at or after the exercise timestamp | Closed (`DepositsClosedForCycle`) |
| Exercisable | Closed |
| Settling | Closed. This phase starts and ends inside a single `rollClose` transaction. |

Deposits reopen when `rollClose` returns the vault to Idle. The app's "max" figure goes to zero at the same moment the deposit would start to fail.

## What can block a deposit

| Cause | What you see | What to do |
|---|---|---|
| The cycle's exercise timestamp has passed | `DepositsClosedForCycle`, or `WrongPhase` once the book is locked | Wait for `rollClose` to return the vault to Idle |
| Assignment proceeds are waiting in the Valorem claim | `DepositsClosedForCycle` | Same. This second check does not depend on the clock. |
| The deposit would take the vault past its cap | `DepositCapExceeded` | Deposit less. The cap is 20 NVDA at deployment. |
| The amount is too small to mint a share | `ZeroShares` | Deposit more |
| The Stock Token issuer has frozen transfers | The token transfer reverts | Nothing can be done from the vault. Wait for the freeze to lift. |

The cap is measured against the NVDA the vault is responsible for: idle NVDA, plus NVDA locked in this week's call, minus NVDA already set aside for settled redemptions. Writing a call does not free up room under it.

A halt on writes does **not** block deposits, and neither does a stale or paused price feed. Those stop the vault from writing new calls and authorising new listings, not from accepting NVDA.

## Why deposits close at the exercise timestamp

Assignment happens inside Valorem with no callback to the vault. When a buyer exercises, NVDA leaves the vault's claim at once, but the offsetting strike USDG only arrives at `rollClose`. If deposits stayed open through the exercise window, someone could exercise, mint shares against the lowered share price in the same block, and take part of the strike proceeds from the depositors who were actually assigned. Closing deposits on the timestamp removes that window whether or not anyone calls `lockBook` and whether or not the keeper is running. [Security and audits](../protocol/security.md) has the full finding.

## Related

* [Withdrawing and the redeem queue](withdrawing.md)
* [The weekly cycle](../product/weekly-cycle.md)
* [Launch policy and hard caps](../product/policy.md)

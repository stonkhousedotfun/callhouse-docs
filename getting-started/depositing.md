# Depositing

A deposit sends NVDA Stock Tokens into the vault and mints cNVDA shares to you. Deposits are open while the vault is Idle, and while a week is listed until its exercise timestamp, unless one of the conditions under [What can block a deposit](#what-can-block-a-deposit) closes them.

{% hint style="warning" %}
**Before you deposit:** Premium is paid only if a buyer fills. Assignment can take the collateral at the strike. Stock Tokens are debt securities, issued by Robinhood Assets (Jersey) Limited. Stonkhouse is not available to US persons. The contracts have had no external audit, and the vault's admin is a single hot wallet with no timelock. Read [Risks](../product/risks.md) first.
{% endhint %}

{% hint style="info" %}
The NVDA vault is live at `0x88a98931E3682137E7e4D3426f623247f4A4ecbb`. Total deposits are capped at 20 NVDA (`depositCap`), and the admin can change the cap at any time. Every address is on [Contracts and addresses](../protocol/addresses.md).
{% endhint %}

## What you need

* NVDA Stock Tokens (`0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC`) on Robinhood Chain (chain id 4663), and eligibility to hold them under the issuer's own terms.
* ETH on Robinhood Chain for gas.
* A browser-extension wallet connected to `app.stonkhouse.fun`. The app has no WalletConnect or mobile QR connection.

[What you need](../README.md#what-you-need) has the chain settings and one route to NVDA and ETH on chain 4663.

## Step by step

1. Open the NVDA vault at `app.stonkhouse.fun/vault/nvda` and connect your wallet. Switch to Robinhood Chain (4663) if asked.
2. Enter the amount of NVDA to deposit. The Deposit card shows how much room is left under the deposit cap ("cap headroom") and how many cNVDA the amount buys at the current share price ("You receive"). It does not quote a return. While a week is armed, it shows the risk described below. When the vault would refuse a deposit, the card says deposits are closed and why.
3. **Approve.** The vault needs permission to move your NVDA. The app asks for an approval of exactly the amount you are depositing, not an unlimited one.
4. **Deposit.** Confirm the deposit transaction. The vault pulls your NVDA and mints cNVDA to you in the same transaction.

## What you receive

You receive cNVDA shares. cNVDA is an ERC-20 token with 18 decimals, the same as the Stock Token. Its on-chain name is "Callhouse NVDA", set before the rename.

The number of shares is your deposit divided by the vault's current NVDA per share, rounded down. The vault's first deposit minted one share per NVDA. After that, deposits and redemptions leave the share price unchanged, apart from rounding; it falls when NVDA leaves without shares being burned, as in an assignment. Rounding always favours the vault, so you can never round your way to more than you put in.

The share price counts the vault's idle NVDA plus NVDA locked in this week's Valorem claim, minus NVDA already set aside for settled redemptions, and never reads below zero. While a claim is stranded, only the part of it still owed to live shares counts. It does not include USDG. Premium is tracked separately; see [Claiming USDG](claiming-usdg.md).

## Depositing while a week is listed

A week is listed from `rollOpen` until its exercise timestamp. Deposits stay open in that time, and a deposit then buys into the week as it stands.

* **Your NVDA can be written that week.** Every fill sizes itself against all the NVDA the vault holds at that moment, so a fill after your deposit can lock your NVDA behind a call sold after you arrived.
* **Your shares carry the week's result from the moment they are minted.** Premium from fills after your deposit, and the effect of any assignment (a lower NVDA share price plus a share of the strike USDG), reach every share, yours included, whether or not your own NVDA was written.
* **You do not share premium already in the vault.** Before minting your shares, the deposit folds any premium that has reached the vault into the per-share USDG index, taking the protocol fee on it. Your shares start from that point.
* **You cannot leave instantly until the week closes.** While a week is listed, the only exit is the [redeem queue](withdrawing.md).

{% hint style="warning" %}
**A deposit while a week is listed is priced at face value.** The share price counts the NVDA locked behind this week's calls at full value and does not subtract what the calls already sold could cost. If NVDA is already near or above the strike when you deposit, you pay full price for shares whose collateral may leave at the strike, and part of that loss is yours. Depositing while the vault is Idle avoids this.
{% endhint %}

## When deposits are open

| Vault state | Deposits |
|---|---|
| Idle | Open, up to the cap |
| Idle, with a stranded claim | Closed (`DepositsClosed`) |
| Listed, before the exercise timestamp | Open, up to the cap |
| Listed, at or after the exercise timestamp | Closed (`DepositsClosed`) |
| Exercisable | Closed (`DepositsClosed`) |
| Settling | Closed. This phase starts and ends inside a single `rollClose` transaction. |

Deposits reopen when `rollClose` returns the vault to Idle, or, after a week whose claim was stranded, when `retryStrandedClaim` redeems the claim. The vault's `maxDeposit` goes to zero at the same moment a deposit would start to fail, and the app's "max" figure follows it.

## What can block a deposit

Every closing condition reverts with the same error, `DepositsClosed`, which carries no argument. The app reads the vault's phase, the clock and its balances to say which one applies.

| Cause | What you see | What to do |
|---|---|---|
| The vault is not Idle or Listed | `DepositsClosed` | Wait for `rollClose` to return the vault to Idle |
| The week is listed and its exercise timestamp has passed | `DepositsClosed` | Same. This check does not depend on anyone calling `lockBook`. |
| Contracts have been assigned and their strike USDG is still inside the Valorem claim | `DepositsClosed` | Same. This second check does not depend on the clock. |
| A claim is stranded | `DepositsClosed` | Wait for `retryStrandedClaim` to redeem it |
| The vault holds less NVDA than it has set aside for settled redemptions. In practice only an issuer burn of the vault's tokens causes this. | `DepositsClosed` | Wait until the settled redemptions are collected or returning collateral covers them |
| The share price is below the share-price floor | `DepositsClosed` | See [The share-price floor](#the-share-price-floor) |
| A fill of the vault's listing has already happened earlier in the same transaction | `DepositsClosed` | Deposit in a separate transaction. See [A deposit inside a fill is refused](#a-deposit-inside-a-fill-is-refused). |
| The deposit would take the vault past its cap | `DepositCapExceeded` | Deposit less. The cap is currently 20 NVDA. The admin sets it with `setDepositCap`, which has no bound, so it can also close deposits by setting 0. |
| The amount is zero | `ZeroAssets` | Enter an amount |
| The amount is too small to mint a share | `ZeroShares` | Deposit more |
| The Stock Token issuer has paused transfers, or blocklisted you or the vault | The token transfer reverts | Nothing can be done from the vault. Wait for the restriction to lift. |

The cap is measured against the NVDA the vault is responsible for: idle NVDA, plus NVDA locked in this week's calls, minus NVDA already set aside for settled redemptions. A fill does not free up room under it.

A halt on writes does **not** block deposits, and neither does a stale or paused price feed. Those stop the vault from arming weeks, authorising listings and accepting fills, not from accepting NVDA.

### The share-price floor

The vault sells no new shares while one cNVDA is worth less than one millionth of an NVDA: in the contract's terms, while `totalSupply > totalAssets × 1,000,000`, both counted in base units. A vault reads like that only after losing almost all of its NVDA with its shares still outstanding, for example every contract it sold assigned plus an issuer burn, or a burn of its whole idle balance. Without the floor a newcomer could buy nearly all of what is left in the vault, and anything that later came back to it, for dust. The floor is compiled into the contract. Deposits reopen by themselves once the share price is back above it, for example when collateral returns or a stranded claim is redeemed, with no governance action. A new vault with no shares is not below it.

### After an issuer burn

The Stock Token has an issuer burn (`adminBurn`) that takes tokens from any address, the vault's included. The vault does not overstate its value when that happens: NVDA set aside for settled redemptions comes off the whole balance, and the share price reads the loss. If the burn leaves the vault holding less NVDA than it has set aside, deposits close until that is covered again, so no new deposit is paid out to earlier redeemers, and settled redemptions are paid pro rata. See [Withdrawing and the redeem queue](withdrawing.md#after-an-issuer-burn-the-reserve-haircut).

## A deposit inside a fill is refused

A deposit in the same transaction as a fill of the vault's listing, made after that fill has written its calls, is refused with `DepositsClosed`. Seaport hands the option tokens to a buyer before it collects the buyer's USDG, and a buyer that is a contract gets control in between. A deposit made at that moment would mint shares before the fill's premium reached the vault, and those shares would take a slice of the premium the fill was paying. So once any fill has written in a transaction, every later deposit in that transaction is refused, even after the USDG has arrived. The next transaction is unaffected. An ordinary deposit from a wallet never meets this.

## Why deposits close at the exercise timestamp

Assignment happens inside Valorem with no callback to the vault. When a buyer exercises, NVDA leaves the vault's claim at once, but the offsetting strike USDG only arrives at `rollClose`. If deposits stayed open through the exercise window, someone could exercise, mint shares against the lowered share price in the same block, and take part of the strike proceeds from the depositors who were actually assigned. Closing deposits on the timestamp removes that window whether or not anyone calls `lockBook` and whether or not the keeper is running. Fills close at the same moment, so nothing can be sold and exercised in the same block either. [Security and audits](../protocol/security.md) has the full finding.

## Related

* [Withdrawing and the redeem queue](withdrawing.md)
* [The weekly cycle](../product/weekly-cycle.md)
* [Launch policy and hard caps](../product/policy.md)

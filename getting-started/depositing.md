# Depositing

A deposit sends NVDA Stock Tokens into **your isolated account**. They sit idle until you request lots. Idle NVDA can be withdrawn. Only lots you request can be listed, filled, or assigned.

{% hint style="warning" %}
**Before you deposit:** Premium is paid only if a buyer fills. Assignment can take the collateral at the strike. Stock Tokens are debt securities, issued by Robinhood Assets (Jersey) Limited. Stonkhouse is not available to US persons. The contracts have had no external audit, and factory admin is a single hot wallet with no timelock. Read [Risks](../product/risks.md) first.
{% endhint %}

{% hint style="info" %}
The factory is live at `0xc4A5Cd0DE91CaB7F5Ebe2114bc63Fbb43E642BBb`. Every address is on [Contracts and addresses](../protocol/addresses.md).
{% endhint %}

## What you need

* NVDA Stock Tokens (`0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC`) on Robinhood Chain (chain id 4663), and eligibility to hold them under the issuer's own terms.
* ETH on Robinhood Chain for gas.
* MetaMask or Phantom, connected to `app.stonkhouse.fun`. The app has no WalletConnect or mobile QR connection, and other injected wallets are not offered.

[What you need](../README.md#what-you-need) has the chain settings and one route to NVDA and ETH on chain 4663.

## Step by step

1. Open `app.stonkhouse.fun/account` and connect MetaMask or Phantom. Switch to Robinhood Chain (4663) if asked.
2. Create your account if you do not have one. The factory clones one account per owner.
3. Enter the amount of NVDA to deposit. Approve exactly that amount, then deposit. Only the account owner can deposit.
4. Set how much is for sale this week (whole NVDA lots), then **List this week** (or wait for the keeper to list for you).

Idle NVDA is still yours. Only the amount you list can be sold. See [Withdrawing](withdrawing.md) and [Claiming USDG](claiming-usdg.md).

## What the deposit does

`deposit` pulls NVDA from your wallet into your clone. There are no shares and no NAV. The tokens sit as idle balance until you `requestWrite` and the account `list`s.

The factory's `depositCap` is checked against **that account's** held NVDA (idle plus anything locked in this week's Valorem claim). Live, the cap is `type(uint256).max`, so it does not bind. Admin can lower it at any time, including to zero.

## What can block a deposit

| Cause | Error | What to do |
|---|---|---|
| You are not the account owner | `NotOwner` | Deposit from the wallet that created the account |
| Amount is zero | `ZeroAmount` | Enter an amount |
| The deposit would take **this account** past `depositCap` | `DepositCapExceeded` | Deposit less, or wait for admin to raise the cap |
| The Stock Token issuer has paused transfers, or blocklisted you or the account | The token transfer reverts | Nothing can be done from the account. Wait for the restriction to lift |

A halt on writes does **not** block deposits. A stale or paused price feed does not either. Those stop listing and fills, not deposits.

You can deposit while a week is listed. New NVDA stays idle: it is not added to this week's reserved lots. To offer more you settle the open week first, then request and list again.

## Related

* [Withdrawing](withdrawing.md)
* [The weekly cycle](../product/weekly-cycle.md)
* [Launch policy and hard caps](../product/policy.md)

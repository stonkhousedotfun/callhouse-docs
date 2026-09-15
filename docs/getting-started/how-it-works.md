# How Stonkhouse works

You deposit NVDA into **your own account** and choose how much is for sale this week. A buyer pays you. Unsold stock comes back. Only what you offered can be sold.

{% hint style="warning" %}
Premium is paid only if a buyer fills. Assignment can take the collateral at the strike. Stock Tokens are debt securities. Stonkhouse is not available to US persons.
{% endhint %}

## The week

1. **Deposit.** `app.stonkhouse.fun/account`. Idle NVDA can be withdrawn until it is listed.
2. **Set how much is for sale.** Whole NVDA only. The rest stays yours.
3. **List.** You or the keeper posts one Seaport order per NVDA, on an option type that belongs to **your** account (same strike, expiry offset so assignment cannot hit anyone else). Terms are pinned at list. A later week cannot move them.
4. **A buyer pays, or nobody does.** Fills on `app.stonkhouse.fun/book`. That fill writes your NVDA and pays you USDG (minus 5%). If nobody buys, nothing is written.
5. **Exercise.** From Friday 4:00pm New York for 24 hours, a buyer can take the NVDA at the strike.
6. **Settle.** After your pinned expiry, unsold NVDA unlocks. Assigned lots pay strike USDG into the account. Collect USDG whenever you like.

App: `/account` to deposit and offer. `/book` to buy.

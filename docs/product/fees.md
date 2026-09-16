# Fees

Stonkhouse charges one fee: **5% of the ask** (`protocolFeeBps` 500). It is taken **inside the Seaport order** as a second USDG payment. Premium exists only when a buyer fills, so a week with no buyer is charged nothing.

On a fill of ask `A`:

* `A × 5%` (rounded down) goes to the factory fee recipient
* the rest goes to the **seller's wallet** in the same transaction

There is no harvest, no share index, and no `sweepFee` on the live accounts. The seller does not wait to claim premium.

{% hint style="info" %}
**History.** The closed pooled vault harvested 5% of premium into a USDG index. Isolated accounts do not. Earlier designs also listed through Overcall, which took a second venue cut. The live product does neither.
{% endhint %}

{% hint style="warning" %}
The protocol fee reduces what a filled week pays you. It is never charged on your deposit, on idle NVDA, or on strike proceeds from assignment. The Valorem engine fee, off and not accepted today, would take NVDA out of the account on every fill if it were switched on and accepted.
{% endhint %}

## Fee table

| Charged by | Size | When | How |
|---|---|---|---|
| **Stonkhouse protocol fee** | 5% of ask (500 bps) | On every fill | Second Seaport consideration item, USDG, to `factory.feeRecipient()` |
| **Valorem engine fee** | 15 bps of notional (minimum 1 base unit): NVDA on each write, USDG on each exercise | Off. If switched on and accepted: on every fill. If switched on at all: on every exercise, paid by the exerciser | Pulled by the clearinghouse into its own fee balance |

### Who holds the Valorem fee switch

Stonkhouse runs its own Valorem clearinghouse at `0x53d7A6d0489Daf3d67b9A314e0eAB2B78Acab9C6`. `feeTo()` is the Safe `0xff1454009F024507f3E455eb2027E98fAF4ccF61` (one owner, threshold 1). Accepting the fee on the factory is a separate admin power (`setValoremFeeAccepted`).

1. **The Safe's single owner** can switch the engine fee on (`setFeesEnabled`) and sweep collected fees.
2. **Factory admin** can accept it (`setValoremFeeAccepted(true)`).

If the fee is on and **not** accepted, `list` and every fill revert. Exercisers still pay 15 bps of the strike in USDG. If both are on, each fill pulls 15 bps of notional in NVDA from that account. See [Roles and admin powers](../protocol/roles.md).

### What is never charged

* No fee on deposits, withdrawals or USDG claims.
* No fee on idle NVDA.
* No fee on strike proceeds from assignment. Strike USDG lands in the account at `settle` and is yours in full.
* No fee on an unfilled week.

### The ceiling

The protocol fee is 5% today. Factory admin can change it with `setPolicy`, never above **20% of the ask** (`PROTOCOL_FEE_CEIL_BPS` = 2000). That ceiling is compiled in. Admin is currently the hot key `0xEb82c3D0F89d47453F94f0C2b2a2752e27a19d9b`, also the fee recipient. A change applies to the next `list` / fill that reads `policy()`. Listed accounts have already pinned their ask and fee split in the Seaport order.

## Worked example: week 1 terms

Live week 1 ask is 1.000000 USDG per lot, strike 223 USDG.

```
Buyer pays                         1.000000 USDG
  Protocol fee 5%                  0.050000        to 0xEb82…9d9b
  Premium to seller's wallet       0.950000

If that lot is later assigned:
  Strike proceeds                223.000000 USDG   into the account, fee-free
```

A week with no fill writes nothing and charges 0.

## Related

* [Claiming USDG](../getting-started/claiming-usdg.md)
* [Launch policy and hard caps](policy.md)
* [Accounting](../protocol/accounting.md)

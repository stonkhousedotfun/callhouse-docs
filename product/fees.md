# Fees

The two live fees, Overcall's and Stonkhouse's, are taken out of premium, and premium exists only when a buyer fills. With those two fees, a week with no buyer is charged nothing.

Valorem's engine fee works differently. It is not taken out of premium. If Valorem switches it on and the vault admin accepts it, it is 15 bps of written notional, paid in NVDA from the vault's own balance on top of the locked collateral at each write, whether or not a buyer fills. It is off today, and the vault will not write while it is on and not accepted.

{% hint style="warning" %}
Premium is paid only if a buyer fills. The Overcall and Stonkhouse fees reduce what a filled week pays you. They are never charged on your deposit, on idle NVDA, or on strike proceeds from assignment. The Valorem engine fee, off and not accepted today, would be charged in NVDA on every write if the vault admin ever accepted it, so it would reduce depositors' NVDA.
{% endhint %}

## Fee table

| Charged by | Size | When | How |
|---|---|---|---|
| **Overcall** | 5% of gross premium | On each fill | A second payment inside the Seaport order itself. The buyer's USDG is split in the same transaction: 95% to the vault, 5% to Overcall. |
| **Stonkhouse protocol fee** | 5% of the premium the vault receives | At harvest, only when that premium is above zero | Accrued when premium is harvested (at `rollClose`, or at a deposit checkpoint) and sent to the fee Safe |
| **Valorem engine fee** | 15 bps of written notional (minimum 1 base unit), in NVDA | Currently off. If on and accepted: at each write, filled or not | Pulled by Valorem from the vault's NVDA on top of the collateral. If Valorem switches it on, `rollOpen` reverts until the vault admin calls `acceptValoremFee(true)` |

**Stacked, the two live fees come to 9.75% of what the buyer paid:** Overcall's 5% of the gross, then Stonkhouse's 5% of the 95% that reaches the vault.

### What is never charged

These hold for the Overcall fee and the Stonkhouse protocol fee. They would not hold for the Valorem engine fee if the vault admin ever accepted it: that fee is paid in NVDA from the vault's balance on every write, including weeks that never fill.

* No fee on deposits.
* No fee on idle NVDA.
* No fee on strike proceeds from assignment. They are your collateral sold at the strike, not income, and they are credited to depositors in full. This exclusion is in the contract code, not a policy setting, so no admin action can put strike proceeds back under the fee.
* No fee on an unfilled week. There is no premium, and the fee on zero premium is zero. If the week is assigned anyway, the strike proceeds are harvested and credited to depositors without a fee.

### The ceiling

The protocol fee is set to 5% (500 basis points) at launch. The vault admin (a single deployer key at launch, the 2-of-3 Admin Safe after the handover) can change it, but never above **20% of premium**. That ceiling is compiled into the contracts. At the ceiling, the stack would be 24% of what the buyer paid: Overcall's 5%, plus 20% of the remaining 95%.

## Worked example: a filled week

The numbers below are illustrative, taken from the vault's accounting reference. They are not a forecast of what any week will pay.

20 NVDA is deposited. The vault writes 10 contracts at a $231 strike and lists them at 2.00 USDG per contract. A buyer fills all 10.

```
Buyer pays (gross premium)       20.000000 USDG   2.00 x 10
  Overcall 5%                     1.000000         0.10 per contract x 10
  Vault receives 95%             19.000000         1.90 per contract x 10

Harvest at rollClose
  Fee-bearing premium            19.000000
  Stonkhouse protocol fee 5%      0.950000         floor(19.00 x 5%)
  Credited to depositors         18.050000

Expiry out of the money
  NVDA returned                  10.000000 NVDA    all of it
  Share price                    unchanged         premium is not in the share price
```

Total fees: 1.00 + 0.95 = 1.95 USDG, which is 9.75% of the 20.00 USDG the buyer paid. With one depositor holding all 20 shares, that depositor can claim 18.05 USDG.

## Worked example: the same week, assigned in full

```
Premium, as above                19.000000 USDG   received by the vault
Strike proceeds                2310.000000 USDG   231.00 x 10, fee-free
Harvested at rollClose         2329.000000 USDG
  Fee-bearing                    19.000000         premium only
  Stonkhouse protocol fee 5%      0.950000
  Credited to depositors       2328.050000         2310.00 strike + 18.05 premium
NVDA left in the vault           10.000000 NVDA   the vault is now underweight
```

The protocol fee is the same 0.95 USDG whether or not the week was assigned. [Assignment](assignment.md) walks through what depositors hold afterwards.

## Rounding

* **Overcall's 5% is rounded per contract, then multiplied.** For a price per contract, Overcall's fee per contract is 5% of it rounded down, and the vault gets the rest. This matches Overcall's own order builder. Rounding on the total instead would produce an order that cannot be partly filled.
* **The protocol fee is rounded down** on the fee-bearing premium.

## How the protocol fee is paid

The fee accrues inside the vault and is pushed to the fee Safe at `rollClose` on a best-effort basis. If the transfer fails, for example because USDG is paused, the close still completes and the fee waits in the vault. Anyone can later call `sweepFee()`, which always pays the stored fee recipient, never the caller. A stuck fee harms only the protocol. It cannot block the close of the week or anyone's withdrawal.

## Related

* [Claiming USDG](../getting-started/claiming-usdg.md)
* [Launch policy and hard caps](policy.md)
* [Accounting](../protocol/accounting.md)

# Fees

Stonkhouse charges one fee: **5% of the premium** buyers pay (`protocolFeeBps` 500). Premium exists only when a buyer fills, so a week with no buyer is charged nothing. There is no venue fee. Every listing has a single payment item, USDG to the vault, so the price a buyer pays and the premium the vault receives are the same figure.

Valorem's engine fee works differently. It is not taken out of premium, and it is off today (`feesEnabled()` on the clearinghouse returns false). While it is on, the vault refuses to arm a week or accept a fill unless the vault admin has accepted it (`valoremFeeAccepted()` returns false today). If it were switched on and accepted, it would be 15 bps of each fill's notional, paid in NVDA from the vault's balance on top of the collateral, and the vault would raise the minimum price of every fill by that fee's value at spot, so that the buyer pays for it in USDG.

{% hint style="info" %}
**History.** Earlier designs listed through Overcall, which took 5% of every fill as a second payment inside the order. The current vault has no venue fee and does not list through Overcall.
{% endhint %}

{% hint style="warning" %}
Premium is paid only if a buyer fills. The protocol fee reduces what a filled week pays you. It is never charged on your deposit, on idle NVDA, or on strike proceeds from assignment. The Valorem engine fee, off and not accepted today, would take NVDA out of the vault on every fill if it were switched on and accepted. The fill's minimum price rises to cover its value in USDG, but the NVDA itself still leaves the vault.
{% endhint %}

## Fee table

| Charged by | Size | When | How |
|---|---|---|---|
| **Stonkhouse protocol fee** | 5% of premium (500 basis points) | Whenever premium is harvested, and only when it is above zero | Accrued inside the vault at each harvest (a deposit or mint, `settleQueue`, `rollClose`, or `retryStrandedClaim`), pushed to the fee recipient at `rollClose` or the retry, and otherwise collectable by anyone with `sweepFee()`, which always pays the stored fee recipient |
| **Valorem engine fee** | 15 bps of notional (minimum 1 base unit): in NVDA on each write, in USDG on each exercise | Off. If switched on and accepted: on every fill, top-ups of the same claim included. If switched on at all: on every exercise, paid by the exerciser | Pulled by the clearinghouse into its own fee balance, which only the clearinghouse's fee holder can sweep. While it is on and not accepted, `rollOpen` and every fill revert with `ValoremFeeNotAccepted` |

### Who holds the Valorem fee switch

A Valorem clearinghouse has one privileged role, its fee holder (`feeTo`). The fee holder can switch the engine fee on and off (`setFeesEnabled`), sweep the fees collected to itself (`sweepFees`), change the metadata renderer and nominate its own successor. It cannot touch collateral, and the clearinghouse has no pause, no blocklist and no upgrade path. The rate is the compiled constant `feeBps` = 15; only on or off can change.

Stonkhouse runs its own instance of the Valorem clearinghouse, at `0x53d7A6d0489Daf3d67b9A314e0eAB2B78Acab9C6`, and the vault's clearinghouse is fixed in its bytecode. Its `feeTo()` is the Safe `0xff1454009F024507f3E455eb2027E98fAF4ccF61`, which has one owner (`0x7A3a8C3F6331f63107D5b3aEeA0515e799022C32`) and a threshold of 1. Accepting the fee on the vault is a separate power, held by the vault admin (`acceptValoremFee`).

So two keys decide the engine fee, each acting immediately and with no timelock:

1. **The Safe's single owner** can switch the engine fee on at the clearinghouse (`setFeesEnabled`, which emits `FeeSwitchUpdated`) and sweep the fees collected to the Safe.
2. **The vault admin** can accept it on the vault (`acceptValoremFee(true)`, which emits `ValoremFeeAccepted`).

If the fee were switched on and **not** accepted, the vault would stop arming weeks and every fill would revert, while exercisers would still pay 15 bps of the strike in USDG. If it were switched on **and** accepted, the vault would pay 15 bps of every fill's notional in NVDA. With 95% of the vault's NAV sold in a week, that is about 0.14% of NAV a week, taken in NVDA rather than out of premium. Depositors are compensated only through the fill floor, which makes the buyer's USDG cover the fee's value at spot. The net effect is a forced sale of that NVDA at spot on every fill, and a less competitive price for buyers. See [Roles and admin powers](../protocol/roles.md).

In the keeper's extended fork rehearsal, with the fee switched on and accepted, spot at 244 USDG and the premium floor then at 0.40%, the minimum price per contract rose from 0.976000 to 1.342000 USDG, a fill of 5 contracts paid 0.0075 NVDA to the clearinghouse on top of the 5 NVDA of collateral, and exercising 2 contracts at the 256 USDG strike cost the exerciser 0.768 USDG in fee.

### What is never charged

These hold for the protocol fee. The Valorem engine fee, if it were ever switched on and accepted, would take NVDA from the vault on every fill.

* No fee on deposits, redemptions or USDG claims.
* No fee on idle NVDA.
* No fee on strike proceeds from assignment. They are your collateral sold at the strike, not income, and they are credited to depositors in full. The exclusion is in the contract code, not a policy setting: the vault measures the USDG that comes out of its Valorem claim and leaves it out of the fee base, so no admin action can put strike proceeds back under the fee.
* No fee on an unfilled week. Nothing was written, there is no premium, and the fee on zero is zero. Because nothing was written, an unfilled week cannot be assigned either.

### The ceiling

The protocol fee is 5% (500 basis points) today. The vault admin can change it with `setPolicy`, but never above **20% of premium** (`PROTOCOL_FEE_CEIL_BPS` = 2000). That ceiling is compiled into the contracts. With no venue fee, 20% of premium is also 20% of what the buyer paid. The vault admin is currently a single hot key, `0xEb82c3D0F89d47453F94f0C2b2a2752e27a19d9b`; moving the role to a Safe is planned and has not happened. See [Roles and admin powers](../protocol/roles.md).

A change takes effect at the next harvest, immediately and with no timelock. That includes premium already paid earlier in the same week that has not yet been harvested.

## Worked example: a filled and assigned week

These figures come from a fork rehearsal of the keeper run on 15 September 2026 (UTC), against a copy of Robinhood Chain with Seaport 1.6, USDG, a Valorem clearinghouse already on the chain with the same code as the vault's, and a test price feed seeded with the real Chainlink print. The keeper priced at a fixed margin over the 0.40% floor then in force. They are not a forecast of what any week will pay.

The keeper armed a 223 USDG strike and listed 14 contracts at 0.856189 USDG each. Two buyers filled 2 and then 3. At the exercise window spot was set above the strike, and one buyer exercised 2.

```
Premium paid by buyers            4.280945 USDG   0.856189 x 5
  Stonkhouse protocol fee 5%      0.214047        floor(4.280945 x 5%)
  Premium to depositors           4.066898

Strike proceeds                 446.000000 USDG   223 x 2, fee-free
Credited to depositors in all   450.066898 USDG   446 + 4.066898

NVDA written                      5 NVDA          one write per fill
NVDA back from the claim          3 NVDA          the 3 contracts not exercised
```

The protocol fee was 0.214047 USDG, exactly 5% of the premium rounded down, and exactly what it would have been with no assignment. In the rehearsal a deposit made while the week was Listed ran the harvest first, so the fee was accrued mid-week and a stranger's `sweepFee()` paid it to the fee recipient then. `rollClose` later harvested the 446 USDG of strike proceeds with a fee of zero.

In the week before, the same rehearsal listed 23 contracts and nobody bought any. Nothing was written, the close harvested 0 USDG and charged a fee of 0.

[Assignment](assignment.md) walks through what depositors held after the assigned week.

## Rounding

* **The protocol fee is rounded down** on the premium it is charged on.
* **The price per contract is exact.** A listing's total must divide exactly by its number of contracts, so a fill of any part of it pays exactly that many contracts times the price per contract. The keeper rounds its price up to the next USDG base unit, so the price never lands a fraction under the floor.

## How the protocol fee is paid

The fee accrues inside the vault. `rollClose` and `retryStrandedClaim()` each try to push it to the fee recipient. If the transfer fails, for example because USDG is paused or the vault is frozen on USDG, the call still completes and the fee waits in the vault. Anyone can later call `sweepFee()`, which always pays the stored fee recipient, never the caller. A stuck fee harms only the protocol. It cannot block the close of the week or anyone's withdrawal.

Premium from a fill reaches the vault's USDG balance at once, but it is harvested, and becomes claimable, only at the next deposit or mint, `settleQueue`, `rollClose` or `retryStrandedClaim`.

In the rehearsal's stranded week, the vault was frozen on USDG when the week closed, so the 0.092112 USDG fee could not be paid. It was paid by the successful retry after the freeze was lifted.

The fee recipient today is `0xEb82c3D0F89d47453F94f0C2b2a2752e27a19d9b`, the same hot key that holds the vault admin role (`feeRecipient()`). It was set when the vault was deployed. The admin can change it at any time, to any non-zero address, with no timelock; each change emits `FeeRecipientUpdated`.

## Related

* [Claiming USDG](../getting-started/claiming-usdg.md)
* [Launch policy and hard caps](policy.md)
* [Accounting](../protocol/accounting.md)

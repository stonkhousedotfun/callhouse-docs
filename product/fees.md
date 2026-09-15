# Fees

Callhouse charges one fee: **5% of the premium** buyers pay. Premium exists only when a buyer fills, so a week with no buyer is charged nothing. There is no venue fee. Every listing has a single payment item, USDG to the vault, so the price a buyer pays and the premium the vault receives are the same figure.

Valorem's engine fee works differently. It is not taken out of premium, and it is off today. The vault refuses to arm a week or accept a fill while it is on, unless the vault admin has accepted it. If it were ever switched on and accepted, it would be 15 bps of each fill's notional, paid in NVDA from the vault's balance on top of the collateral, and the vault would raise the minimum price of every fill by that fee's value at spot, so that the buyer pays for it in USDG.

{% hint style="info" %}
**History.** Earlier designs listed through Overcall, which took 5% of every fill as a second payment inside the order. The current vault has no venue fee and does not list through Overcall.
{% endhint %}

{% hint style="warning" %}
Premium is paid only if a buyer fills. The protocol fee reduces what a filled week pays you. It is never charged on your deposit, on idle NVDA, or on strike proceeds from assignment. The Valorem engine fee, off and not accepted today, would take NVDA out of the vault on every fill if it were switched on and accepted. The fill's minimum price rises to cover its value in USDG, but the NVDA itself still leaves the vault. With Callhouse's own clearinghouse, one admin key holds both switches.
{% endhint %}

## Fee table

| Charged by | Size | When | How |
|---|---|---|---|
| **Callhouse protocol fee** | 5% of premium (500 basis points) | Whenever premium is harvested, and only when it is above zero | Accrued inside the vault at each harvest (a deposit, `settleQueue`, `rollClose`, or a stranded-claim retry), pushed to the fee recipient at `rollClose` or the retry, and otherwise collectable by anyone with `sweepFee()` |
| **Valorem engine fee** | 15 bps of notional (minimum 1 base unit): in NVDA on each write, in USDG on each exercise | Off. If switched on and accepted: on every fill, top-ups of the same claim included, and on every exercise, paid by the exerciser | Pulled by the clearinghouse into its own fee balance, which only the clearinghouse's fee holder can sweep. While it is on and not accepted, `rollOpen` and every fill revert |

### Who holds the Valorem fee switch

A Valorem clearinghouse has one privileged key, its fee holder (`feeTo`). That key can switch the engine fee on and off, sweep the fees collected, change the metadata renderer and nominate its own successor. It cannot touch collateral, and the clearinghouse has no pause, no blocklist and no upgrade path. The rate is fixed at 15 bps; only on or off can change.

The launch plan deploys Callhouse's own instance of the unmodified upstream Valorem clearinghouse, with its fee holder set to the vault admin. The deploy scripts refuse to continue if the switch is on. The vault's clearinghouse is fixed when the vault is deployed, and its address will be published on [Contracts and addresses](../protocol/addresses.md).

With that setup, **one admin key can**, immediately and with no timelock:

1. switch the engine fee on at the clearinghouse (`setFeesEnabled`, which emits `FeeSwitchUpdated`);
2. accept it on the vault (`acceptValoremFee(true)`, which emits `ValoremFeeAccepted`);
3. sweep the fees collected to itself.

The vault would then pay 15 bps of every fill's notional in NVDA. The project's internal review of 2026-09-14 put that at about 0.15% of the vault's utilised NAV per week at launch policy: about twice what the 20% protocol fee ceiling allows, and taken in NVDA rather than out of premium. Depositors are compensated only through the fill floor, which makes the buyer's USDG cover the fee's value at spot. The net effect is a forced sale of that NVDA at spot on every fill, and a less competitive price for buyers. Exercisers would also pay 15 bps of the strike in USDG, to the same key. At launch that key is a single deployer key; see [Roles and admin powers](../protocol/roles.md).

In the keeper's extended fork rehearsal, with the fee switched on and accepted and spot at 244 USDG, the minimum price per contract rose from 0.976000 to 1.342000 USDG, a fill of 5 contracts paid 0.0075 NVDA to the clearinghouse on top of the 5 NVDA of collateral, and exercising 2 contracts at the 256 USDG strike cost the exerciser 0.768 USDG in fee.

### What is never charged

These hold for the protocol fee. The Valorem engine fee, if it were ever switched on and accepted, would take NVDA from the vault on every fill.

* No fee on deposits, redemptions or USDG claims.
* No fee on idle NVDA.
* No fee on strike proceeds from assignment. They are your collateral sold at the strike, not income, and they are credited to depositors in full. The exclusion is in the contract code, not a policy setting: the vault measures the USDG that comes out of its Valorem claim and leaves it out of the fee base, so no admin action can put strike proceeds back under the fee.
* No fee on an unfilled week. Nothing was written, there is no premium, and the fee on zero is zero. Because nothing was written, an unfilled week cannot be assigned either.

### The ceiling

The protocol fee is 5% (500 basis points) at launch. The vault admin (a single deployer key at launch, until the admin role is handed to a 2-of-3 Safe) can change it, but never above **20% of premium**. That ceiling is compiled into the contracts. With no venue fee, 20% of premium is also 20% of what the buyer paid.

A change takes effect at the next harvest, immediately and with no timelock. That includes premium already paid earlier in the same week that has not yet been harvested.

## Worked example: a filled and assigned week

These figures come from a fork rehearsal of the keeper run on 15 September 2026 (UTC), against a copy of Robinhood Chain with the live Valorem clearinghouse, Seaport 1.6 and USDG, and a test price feed seeded with the real Chainlink print. They are not a forecast of what any week will pay.

The keeper armed a 223 USDG strike and listed 14 contracts at 0.856189 USDG each. Two buyers filled 2 and then 3. At the exercise window spot was set above the strike, and one buyer exercised 2.

```
Premium paid by buyers            4.280945 USDG   0.856189 x 5
  Callhouse protocol fee 5%       0.214047        floor(4.280945 x 5%)
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

In the rehearsal's stranded week, the vault was frozen on USDG when the week closed, so the 0.092112 USDG fee could not be paid. It was paid by the successful retry after the freeze was lifted.

The fee recipient is set when the vault is deployed and will be published with the vault's address. The admin can change it at any time, to any non-zero address, with no timelock; each change emits `FeeRecipientUpdated`.

## Related

* [Claiming USDG](../getting-started/claiming-usdg.md)
* [Launch policy and hard caps](policy.md)
* [Accounting](../protocol/accounting.md)

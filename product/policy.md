# Launch policy and hard caps

The vault's trading rules come in two layers:

* **Launch values**: the settings the vault starts with. The vault admin can change them: a single deployer key at launch, and the 2-of-3 Admin Safe after the handover (see [Roles and admin powers](../protocol/roles.md)).
* **Hard caps**: bounds compiled into the contract bytecode. Every policy change is checked against them, and no key can move them. Changing a hard cap would take a new vault.

These are contract bounds, not intentions or targets. They are also not forecasts: none of them says what a week will pay.

{% hint style="warning" %}
The caps rule out the worst settings, such as selling calls at the money or charging a fee above 20% of premium. They do not rule out poor settings inside the caps, and there is no timelock on policy changes in v1. Every admin change to these settings is visible on chain: the policy fields (strike band, premium floor, utilisation, protocol fee and contracts cap) as a `PolicyUpdated` event, the deposit cap as `DepositCapUpdated`, the price age as `MaxPriceAgeUpdated` and the Valorem fee switch as `ValoremFeeAccepted`.
{% endhint %}

## The table

| Parameter | Launch value | Hard cap (compiled in) |
|---|---|---|
| Minimum strike distance above spot (`minOtmBps`) | 3% (300 bps) | Floor: 1% (100 bps) |
| Maximum strike distance above spot (`maxOtmBps`) | 12% (1200 bps) | Ceiling: 25% (2500 bps). Also must not be below the minimum. |
| Minimum list premium (`minPremiumBps`) | 0.40% of spot notional (40 bps) | Floor: 0.10% (10 bps) |
| Maximum utilisation of idle NVDA (`maxUtilizationBps`) | 95% (9500 bps) | Ceiling: 100% (10000 bps) |
| Protocol fee on premium (`protocolFeeBps`) | 5% (500 bps) | Ceiling: 20% (2000 bps). Never charged on strike proceeds, at any setting. |
| Maximum contracts per cycle (`maxContractsCap`) | 50 | Must be at least 1. No compiled ceiling. |
| Listings signed per cycle | 3 | Constant. Not adjustable. |
| Maximum price age (`maxPriceAge`) | 4 days | Between 1 hour and 7 days |
| Maximum cycle length | Overcall's cycle (currently 7 days) | Ceiling: 21 days from the write. Constant. |
| Deposit cap | 20 NVDA | No compiled ceiling |
| Contract size | 1 NVDA per contract | Compiled in: the vault refuses to write a cycle whose lot size is anything else |
| Valorem engine fee | Not accepted | Admin switch. While Valorem's fee is on and not accepted, the vault does not write. |

The underlying is NVDA only. One contract always covers 1.0000 Stock Token.

## What each one means for you

### Strike band: 3% to 12% above spot

The keeper picks the nearest Overcall strike that is at least 3% and at most 12% above spot at the time of the write. If no strike on the registry's ladder fits, the vault writes nothing that week.

A strike further above spot leaves more room for NVDA to rise before assignment. The **1% floor** is the important cap: it stops an admin from selling at-the-money calls against your NVDA. The 25% ceiling exists because a weekly call that far out earns nothing.

### Minimum premium: 0.40% of spot notional

A listing is refused if its gross price, before Overcall's 5%, is below 0.40% of spot times the number of contracts. This stops the vault selling the week's upside for dust. It is a floor on the asking price, not a promise that anyone pays it. The compiled floor is 0.10%.

### Utilisation: 95% of idle NVDA

The vault writes at most 95% of its idle NVDA, rounded down to whole contracts. With 20 NVDA idle, that is at most 19 contracts. At least part of the idle balance is never written, and NVDA deposited after the write is not added to that week's call (its shares still share that week's result pro rata; see [Depositing](../getting-started/depositing.md)). The ceiling is 100%.

### Protocol fee: 5% of premium

Charged on the premium the vault receives, only when it is above zero. Never on deposits, idle NVDA or strike proceeds. The ceiling is 20% of premium. See [Fees](fees.md).

### Contracts per cycle: 50

A hard limit on position size per cycle, on top of the utilisation limit. The admin can raise it; there is no compiled ceiling other than the utilisation limit and the deposit cap.

### Listings per cycle: 3

The vault signs at most three listings a cycle, one live at a time. This stops a keeper cutting the price again and again through the week. It is a constant, not a policy setting.

### Price age: 4 days

The vault refuses to write or list if the NVDA price feed is older than this. The feed stops over weekends and market holidays, so a limit measured in hours would block every weekend write. The compiled bounds of 1 hour to 7 days stop anyone switching the check off.

### Cycle length: at most 21 days

The registry that sets the cycle is controlled by a third party, and nothing on its side stops a very long expiry. The vault refuses to write any cycle that expires more than 21 days after the write. A bad cycle becomes a skipped week, not a long lock on your NVDA.

### Deposit cap: 20 NVDA

The most NVDA the vault accepts, measured on NVDA idle plus NVDA locked in the current call, not counting NVDA already set aside for settled redemptions. It starts small because the contracts are unaudited today and have never run a live week. The launch plan is to publish four weekly results, including any unfilled weeks, before raising it. The admin can change it at any time, with no timelock (a `DepositCapUpdated` event is emitted), and there is no compiled ceiling.

### Valorem engine fee: not accepted

Valorem can charge 15 bps of written notional on writes. Unlike the other fees, it is not taken out of premium: it is paid in NVDA from the vault's balance on top of the collateral at each write, whether or not a buyer fills. It is currently off. If it is switched on, the vault stops writing until the admin explicitly accepts it (`acceptValoremFee(true)`), because on a weekly out-of-the-money call that fee can be a large part of the premium.

## Related

* [Roles and admin powers](../protocol/roles.md)
* [The weekly cycle](weekly-cycle.md)
* [Risks](risks.md)

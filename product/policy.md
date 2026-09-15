# Launch policy and hard caps

The vault's trading rules come in two layers, and the keeper adds a third:

* **Launch values**: the settings the vault starts with. The vault admin can change them: a single deployer key at launch, until the admin role is handed to a 2-of-3 Safe (see [Roles and admin powers](../protocol/roles.md)).
* **Hard caps**: bounds compiled into the contract bytecode. Every policy change is checked against them, and no key can move them. Changing a hard cap would take a new vault.
* **Keeper defaults**: choices the keeper software makes inside those bounds. Whoever runs the keeper can change them without touching the contracts.

These are contract bounds, not intentions or targets. They are also not forecasts: none of them says what a week will pay.

{% hint style="warning" %}
The caps rule out the worst settings, such as selling calls at the money or charging a fee above 20% of premium. They do not rule out poor settings inside the caps, and there is no timelock on policy changes. A change applies immediately, including to the rest of a week already under way: the next fill is checked against the new policy, and the next harvest charges the new fee. Every admin change is visible on chain: the policy fields (strike band, premium floor, utilisation, protocol fee and contracts cap) as a `PolicyUpdated` event, the deposit cap as `DepositCapUpdated`, the price age as `MaxPriceAgeUpdated`, the fee recipient as `FeeRecipientUpdated` and the Valorem fee switch as `ValoremFeeAccepted`.
{% endhint %}

## The table

| Parameter | Launch value | Hard cap (compiled in) |
|---|---|---|
| Minimum strike distance above spot (`minOtmBps`) | 3% (300 bps) | Floor: 1% (100 bps). Must not be above the maximum. |
| Maximum strike distance above spot (`maxOtmBps`) | 12% (1200 bps) | Ceiling: 25% (2500 bps) |
| Minimum premium (`minPremiumBps`) | 0.40% of spot per contract (40 bps) | Floor: 0.10% (10 bps) |
| Maximum utilisation of total assets (`maxUtilizationBps`) | 95% (9500 bps) | Ceiling: 99.85% (9985 bps) |
| Protocol fee on premium (`protocolFeeBps`) | 5% (500 bps) | Ceiling: 20% (2000 bps). Never charged on strike proceeds, at any setting. |
| Maximum contracts per cycle (`maxContractsCap`) | 50 | Must be at least 1. No compiled ceiling. |
| Listings authorised per cycle | 3 | Constant. Not adjustable. |
| Maximum price age (`maxPriceAge`) | 4 days | Between 1 hour and 7 days |
| Contract size | 1 NVDA per contract | Constant: the vault refuses to arm an option type of any other size |
| Time from arming to exercise | Keeper default: at least 6 hours | Constant: at least 1 hour |
| Exercise window | Keeper default: 24 hours | Constant: at least 1 day |
| Cycle length, from arming to expiry | Keeper default: the next Friday close plus 24 hours | Constant: at most 21 days |
| Price per contract | — | Constant: never above the strike |
| Listing end | — | Constant: no later than the exercise timestamp |
| Deposit cap | 20 NVDA | No compiled ceiling |
| Share-price floor on deposits | — | Constant: no new shares while one share is worth less than a millionth of the Stock Token's smallest unit |
| Valorem engine fee | Not accepted | Admin switch. While the fee is on and not accepted, the vault neither arms a week nor accepts a fill. |

The underlying is NVDA only. One contract always covers 1.0000 Stock Token.

### Keeper defaults

| Choice | Default | Setting |
|---|---|---|
| Strike | Spot plus 5%, rounded to the nearest whole USDG | `KEEPER_STRIKE_OTM_BPS` 500 |
| Price | The fill-time premium floor plus 1%, rounded up | `KEEPER_PREMIUM_MARGIN_BPS` 100 |
| How early to arm | At least 6 hours before the Friday close | `KEEPER_ARM_LEAD_S` 21600 |
| Retrying a stranded claim | Every hour | `KEEPER_RETRY_STRANDED_MS` 3600000 |

## What each one means for you

### Strike band: 3% to 12% above spot, both ends when a week arms, the floor at every fill

When the keeper arms a week, the vault reads the strike from the option type and requires it to be at least 3% and at most 12% above live spot. The keeper aims 5% above spot, rounded to a whole USDG. While that would fall outside the band, it arms nothing, and it looks again on each tick until that week's Friday goes by.

After arming, only the floor is checked again: when a listing is authorised, and at the spot of **every fill**. If NVDA has risen far enough that the strike is now less than 3% above spot, the vault refuses every fill until spot falls back; no price fixes that. With the keeper's 5% target, a rise of roughly 2% between the arm and a fill is enough. The ceiling is deliberately not re-checked: after a fall in NVDA the strike can sit more than 12% above spot, and a call further out of the money is safer to sell, not riskier.

The **1% floor** is the important cap: it stops an admin from selling at-the-money calls against your NVDA. The 25% ceiling exists because a weekly call that far out earns nothing.

### Minimum premium: 0.40% of spot notional

A listing is refused if its price is below 0.40% of spot times the number of contracts. The same floor is applied again at the spot of every fill, to that fill's contracts, so a listing that cleared the floor when it was made can be refused after NVDA rises. When the Valorem engine fee is on and accepted, each fill's floor also includes that fee's value at spot.

This stops the vault selling the week's upside for dust. It is a floor on the asking price, not a promise that anyone pays it, and it is not a fair price for the call. By default the keeper lists just above it (the floor plus 1%), because it has no model price. The compiled floor is 0.10%. See [Risks](risks.md#keeper-key-compromise).

### Utilisation: 95% of total assets

The contracts written in a cycle, counted fill by fill, may not exceed 95% of the vault's total assets, rounded down to whole contracts. Total assets means idle NVDA plus NVDA locked behind this week's calls, less NVDA already set aside for settled redemptions, measured at the moment of each fill. With 20 NVDA in the vault, that is at most 19 contracts in the cycle. In a fork rehearsal of the keeper, 25 NVDA gave a listing of 23 contracts.

Deposits stay open while a week is Listed, and they add capacity. A later fill can write calls against NVDA deposited after the week began (see [Depositing](../getting-started/depositing.md)).

The ceiling is 99.85%, not 100%. If Valorem's engine fee were ever on, it would be pulled on top of the collateral, and the missing 0.15% keeps that fee inside the vault's free balance, so NVDA set aside for settled redemptions is never used to pay it. Every write is also followed by a check that the balance still covers those redemptions.

### Protocol fee: 5% of premium

Charged on premium, only when it is above zero. Never on deposits, idle NVDA or strike proceeds. The ceiling is 20% of premium. A change applies from the next harvest, including premium paid earlier in the week and not yet harvested. See [Fees](fees.md).

### Contracts per cycle: 50

A hard limit on position size per cycle, on top of the utilisation limit. The admin can raise it; there is no compiled ceiling other than the utilisation limit and the deposit cap.

### Listings per cycle: 3

The vault authorises at most three listings a cycle, one live at a time, and every authorisation spends one whether or not it is later cancelled. A listing is sized to the vault's whole capacity and Seaport tracks partial fills, so a new listing is a reprice. This stops a keeper walking the price again and again through the week. Once the three are spent, a listing refused after a rise in NVDA stays unfillable until spot falls back. It is a constant, not a policy setting.

### Price age: 4 days

The vault refuses to arm a week, authorise a listing or accept a fill if the NVDA price feed is older than this. The feed publishes nothing while the US equity market is closed, weekends included, so a limit measured in hours would block every weekend fill and every weekend arm. The compiled bounds of 1 hour to 7 days stop anyone switching the check off. What 4 days does not catch is on [Risks](risks.md#the-price-feed).

### Option type bounds: 1 NVDA, at least 1 hour, at least 1 day, at most 21 days

* **One NVDA per contract.** The band, the premium floor and utilisation are all priced per token. A contract covering more than one token would make an in-the-money strike look out of the money.
* **At least 1 hour from arming to exercise.** Nothing can be sold and assigned in the same moment, which is what lets deposits stay open until the exercise timestamp.
* **An exercise window of at least 1 day.** A shorter window is a lottery, not a call.
* **At most 21 days from arming to expiry.** Anyone can create a Valorem option type with dates of their choosing, and a compromised keeper could arm one. Collateral written into a type with a far expiry would be locked in Valorem until then, so the vault refuses it: a bad type becomes a skipped week, not a long lock on your NVDA.

### Deposit cap: 20 NVDA

The most NVDA the vault accepts, measured on total assets: idle NVDA plus NVDA locked behind the current week's calls, not counting NVDA already set aside for settled redemptions. It starts small because the contracts are unaudited and have never run a live week. The admin can change it at any time, with no timelock (a `DepositCapUpdated` event is emitted), and there is no compiled ceiling.

### Share-price floor

A compiled constant, not a setting. If the vault has lost almost everything while its shares are still outstanding, for example after full assignment combined with an issuer burn, new deposits are refused, so a newcomer cannot buy the whole book, and the claim of existing holders on anything that later comes back, for dust. Deposits reopen by themselves once a share is worth at least a millionth of the Stock Token's smallest unit again.

### Valorem engine fee: not accepted

Valorem can charge 15 bps of notional on writes. Unlike the protocol fee, it is not taken out of premium: it is paid in NVDA from the vault's balance on top of the collateral, on every fill. It is off today. If it is switched on, the vault stops arming weeks and accepting fills until the admin explicitly accepts it (`acceptValoremFee(true)`). With Callhouse's own clearinghouse, the same admin key holds the switch on the clearinghouse and the acceptance on the vault. See [Fees](fees.md#who-holds-the-valorem-fee-switch).

## Related

* [Roles and admin powers](../protocol/roles.md)
* [The weekly cycle](weekly-cycle.md)
* [Risks](risks.md)

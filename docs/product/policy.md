# Launch policy and hard caps

The vault's trading rules come in two layers, and the keeper adds a third:

* **Current values**: the settings the vault runs with today. The vault admin can change them. The admin is currently a single hot key, `0xEb82c3D0F89d47453F94f0C2b2a2752e27a19d9b`, with no timelock; moving the role to a Safe is planned and has not happened (see [Roles and admin powers](../protocol/roles.md)).
* **Hard caps**: bounds compiled into the contract bytecode. Every policy change is checked against them (`Policy.validate`), and no key can move them. Changing a hard cap would take a new vault.
* **Keeper settings**: choices the keeper software makes inside those bounds. Whoever runs the keeper can change them without touching the contracts.

These are contract bounds, not intentions or targets. They are also not forecasts: none of them says what a week will pay.

{% hint style="warning" %}
The caps rule out the worst settings, such as selling calls at the money or charging a fee above 20% of premium. They do not rule out poor settings inside the caps, and there is no timelock on policy changes. A change applies immediately, including to the rest of a week already under way: the next fill is checked against the new policy, and the next harvest charges the new fee. Every admin change is visible on chain: the policy fields (strike band, premium floor, utilisation, protocol fee and contracts cap) as a `PolicyUpdated` event, the deposit cap as `DepositCapUpdated`, the price age as `MaxPriceAgeUpdated`, the fee recipient as `FeeRecipientUpdated`, the vault's acceptance of Valorem's engine fee as `ValoremFeeAccepted`, a halt or unhalt as `WritesHalted`, and role changes as `RoleGranted` and `RoleRevoked`. The engine fee switch itself is not the admin's: it sits on the clearinghouse, where its `feeTo` sets it and it emits `FeeSwitchUpdated`.
{% endhint %}

## The table

Current values are read from the vault (`policy()`, `maxPriceAge()`, `depositCap()`, `valoremFeeAccepted()`) on 15 September 2026.

| Parameter | Current value | Hard cap (compiled in) |
|---|---|---|
| Minimum strike distance above spot (`minOtmBps`) | 3% (300 bps) | Floor: 1% (100 bps). Must not be above the maximum. |
| Maximum strike distance above spot (`maxOtmBps`) | 12% (1200 bps) | Ceiling: 25% (2500 bps) |
| Minimum premium (`minPremiumBps`) | 0.10% of spot per contract (10 bps), the compiled floor. It was 0.40% (40 bps) at deploy and was lowered on 15 September 2026. | Floor: 0.10% (10 bps). No ceiling. |
| Maximum utilisation of total assets (`maxUtilizationBps`) | 95% (9500 bps) | Ceiling: 99.85% (9985 bps). No floor. |
| Protocol fee on premium (`protocolFeeBps`) | 5% (500 bps) | Ceiling: 20% (2000 bps). Never charged on strike proceeds, at any setting. |
| Maximum contracts per cycle (`maxContractsCap`) | 50 | Must be at least 1. No compiled ceiling. |
| Listings authorised per cycle | 3 | Constant (`MAX_LISTINGS_PER_CYCLE`). Not adjustable. |
| Maximum price age (`maxPriceAge`) | 4 days (345,600 s) | Between 1 hour and 7 days |
| Contract size | 1 NVDA per contract | Constant: the vault refuses to arm an option type of any other size |
| Time from arming to exercise | Keeper: at least 6 hours | Constant: at least 1 hour |
| Exercise window | Keeper: 24 hours | Constant: at least 1 day |
| Cycle length, from arming to expiry | Keeper: the next Friday close plus 24 hours | Constant: at most 21 days |
| Price per contract | — | Constant: never above the strike |
| Listing end | — | Constant: no later than the exercise timestamp |
| Deposit cap | 20 NVDA | No compiled ceiling, and no floor: 0 closes deposits |
| Share-price floor on deposits | — | Constant: no new shares while one cNVDA is worth less than one millionth of an NVDA (`totalSupply > totalAssets × 1,000,000`) |
| Valorem engine fee | Not accepted | Admin switch. While the fee is on and not accepted, the vault neither arms a week nor accepts a fill. |

The underlying is NVDA only. One contract always covers 1 Stock Token.

### Keeper settings

The keeper's code defaults, and the production value where it differs.

| Choice | Setting | Code default | Production |
|---|---|---|---|
| Pricing mode | `KEEPER_PRICING_MODE` | `vol`: strike and ask from Cboe's delayed NVDA option quotes; the week is skipped when the data is unusable | `vol` |
| Strike | `KEEPER_TARGET_DELTA`, `KEEPER_STRIKE_BAND_BUFFER_BPS` | The listed call with a delta of 0.15 on the close-day expiry, rounded to a whole USDG, kept at least 2 percentage points above the band floor and 0.5 points below its ceiling (5% to 11.5% above spot under the current band) | Default |
| Price | `KEEPER_PREMIUM_MARGIN_BPS`, `KEEPER_PRICE_EDGE_BPS` | The higher of the fill-time premium floor plus 1% and the quotes' mid price plus 10%, rounded up, never above the strike | Margin 0.5% (50 bps); edge default |
| How early to arm | `KEEPER_ARM_LEAD_S` | At least 6 hours before the Friday close | Default |
| Retrying a stranded claim | `KEEPER_RETRY_STRANDED_MS` | Every hour | Default |

## What each one means for you

### Strike band: 3% to 12% above spot, both ends when a week arms, the floor at every fill

When the keeper arms a week, the vault reads the strike from the option type and requires it to be at least 3% and at most 12% above live spot (`rollOpen`, `StrikeBelowBand` and `StrikeAboveBand`). The keeper picks a strike between 5% and 11.5% above spot from the option quotes. When it cannot, it arms nothing, and it looks again on each tick until that Friday's close is less than 6 hours away; then it moves on to the following Friday.

After arming, only the floor is checked again: when a listing is authorised, and at the spot of **every fill**. If NVDA has risen far enough that the strike is now less than 3% above spot, the vault refuses every fill until spot falls back; no price fixes that. For a strike 5% above spot at the arm, a rise of about 2% is enough. The ceiling is deliberately not re-checked: after a fall in NVDA the strike can sit more than 12% above spot, and a call further out of the money is safer to sell, not riskier.

The **1% floor** is the important cap: it stops an admin from selling at-the-money calls against your NVDA. The 25% ceiling exists because a weekly call that far out earns nothing.

### Minimum premium: 0.10% of spot notional

A listing is refused if its price is below 0.10% of spot times the number of contracts (`PremiumBelowMinimum`). The same floor is applied again at the spot of every fill, to that fill's contracts (`PremiumBelowFloorAtFill`), so a listing that cleared the floor when it was made can be refused after NVDA rises. When the Valorem engine fee is on and accepted, each fill's floor also includes that fee's value at spot.

This stops the vault selling the week's upside for dust. It is a floor on the asking price, not a promise that anyone pays it, and it is not a fair price for the call. The current value is the compiled floor, so the admin can raise it but not lower it further. The keeper's ask is the higher of the floor plus 0.5% and a price taken from the option quotes. See [Risks](risks.md#keeper-key-compromise).

### Utilisation: 95% of total assets

The contracts written in a cycle, counted fill by fill, may not exceed 95% of the vault's total assets, rounded down to whole contracts. Total assets means idle NVDA plus NVDA locked behind this week's calls, less NVDA already set aside for settled redemptions, measured at the moment of each fill. With 20 NVDA in the vault, that is at most 19 contracts in the cycle; with the 1.06 NVDA it held on 15 September 2026, it is 1. In a fork rehearsal of the keeper, 25 NVDA gave a listing of 23 contracts.

Deposits stay open while a week is Listed, and they add capacity. A later fill can write calls against NVDA deposited after the week began (see [Depositing](../getting-started/depositing.md)).

The ceiling is 99.85%, not 100%. If Valorem's engine fee were ever on, it would be pulled on top of the collateral, and the missing 0.15% keeps that fee inside the vault's free balance, so NVDA set aside for settled redemptions is never used to pay it. Every write is also followed by a check that the balance still covers those redemptions.

### Protocol fee: 5% of premium

Charged on premium, only when it is above zero. Never on deposits, idle NVDA or strike proceeds. The ceiling is 20% of premium. A change applies from the next harvest, including premium paid earlier in the week and not yet harvested. See [Fees](fees.md).

### Contracts per cycle: 50

A hard limit on position size per cycle, on top of the utilisation limit. The admin can raise it; there is no compiled ceiling other than the utilisation limit and the deposit cap.

### Listings per cycle: 3

The vault authorises at most three listings a cycle, one live at a time, and every authorisation spends one whether or not it is later cancelled. A listing is sized to the vault's whole capacity and Seaport tracks partial fills, so a new listing is a reprice. This stops a keeper walking the price again and again through the week. Once the three are spent, a listing refused after a rise in NVDA stays unfillable until spot falls back. It is a constant, not a policy setting.

### Price age: 4 days

The vault refuses to arm a week, authorise a listing or accept a fill if the NVDA price feed is older than this (`StalePrice`). The feed is a 24/5 feed: it can print overnight on weekdays, but it publishes nothing from around the Friday close until Sunday 8:00pm ET, or over market holidays, so a limit measured in hours would block every weekend fill and every weekend arm. The compiled bounds of 1 hour to 7 days stop anyone switching the check off. What 4 days does not catch is on [Risks](risks.md#the-price-feed).

### Option type bounds: 1 NVDA, at least 1 hour, at least 1 day, at most 21 days

* **One NVDA per contract.** The band, the premium floor and utilisation are all priced per token. A contract covering more than one token would make an in-the-money strike look out of the money.
* **At least 1 hour from arming to exercise.** Nothing can be sold and assigned in the same moment, which is what lets deposits stay open until the exercise timestamp.
* **An exercise window of at least 1 day.** A shorter window is a lottery, not a call.
* **At most 21 days from arming to expiry.** Anyone can create a Valorem option type with dates of their choosing, and a compromised keeper could arm one. Collateral written into a type with a far expiry would be locked in Valorem until then, so the vault refuses it: a bad type becomes a skipped week, not a long lock on your NVDA.

### Deposit cap: 20 NVDA

The most NVDA the vault accepts, measured on total assets: idle NVDA plus NVDA locked behind the current week's calls, not counting NVDA already set aside for settled redemptions. It is small because the contracts are unaudited and new. The admin can change it at any time, with no timelock (a `DepositCapUpdated` event is emitted), and there is no compiled ceiling.

### Share-price floor

A compiled constant, not a setting. If the vault has lost almost everything while its shares are still outstanding, for example after full assignment combined with an issuer burn, new deposits are refused, so a newcomer cannot buy the whole book, and the claim of existing holders on anything that later comes back, for dust. Deposits reopen by themselves once one cNVDA is worth at least one millionth of an NVDA again.

### Valorem engine fee: not accepted

Valorem can charge 15 bps of notional on writes. Unlike the protocol fee, it is not taken out of premium: it is paid in NVDA from the vault's balance on top of the collateral, on every fill. It is off today. If it is switched on, the vault stops arming weeks and accepting fills until the admin explicitly accepts it (`acceptValoremFee(true)`). On Stonkhouse's own clearinghouse the switch is held by a 1-of-1 Safe, and the acceptance on the vault by the vault admin. See [Fees](fees.md#who-holds-the-valorem-fee-switch).

## Related

* [Roles and admin powers](../protocol/roles.md)
* [The weekly cycle](weekly-cycle.md)
* [Risks](risks.md)

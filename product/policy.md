# Launch policy and hard caps

Trading rules come in two layers, and the keeper adds a third:

* **Current values**: what the factory runs with today. Admin can change them. Admin is the hot key `0xEb82c3D0F89d47453F94f0C2b2a2752e27a19d9b`, with no timelock.
* **Hard caps**: bounds compiled into `Policy.validate`. No key can move them. Changing a hard cap would take a new factory.
* **Keeper settings**: choices the keeper software makes inside those bounds.

{% hint style="warning" %}
The caps rule out the worst settings, such as selling calls at the money or charging a fee above 20% of the ask. They do not rule out poor settings inside the caps, and there is no timelock. A change applies to the next `list` and fill that read `policy()`. Accounts that already listed have pinned this week's strike, ask and expiry.
{% endhint %}

## The table

Read from the factory on 15 September 2026.

| Parameter | Current value | Hard cap (compiled in) |
|---|---|---|
| Minimum strike distance above spot (`minOtmBps`) | 3% (300 bps) | Floor: 1% (100 bps). Must not be above the maximum |
| Maximum strike distance above spot (`maxOtmBps`) | 12% (1200 bps) | Ceiling: 25% (2500 bps) |
| Minimum premium (`minPremiumBps`) | 0.40% of spot (40 bps) | Floor: 0.10% (10 bps). No ceiling |
| Maximum utilisation (`maxUtilizationBps`) | 95% (9500 bps) | Ceiling: 99.85% (9985 bps) |
| Protocol fee (`protocolFeeBps`) | 5% (500 bps) | Ceiling: 20% (2000 bps). Never charged on strike proceeds |
| Maximum lots per list (`maxContractsCap`) | 50 | At least 1. No compiled ceiling |
| Maximum price age (`maxPriceAge`) | 4 days (345,600 s) | 1 hour to 7 days |
| Contract size | 1 NVDA per lot | Constant |
| Time from `setWeek` to exercise | Keeper: at least 6 hours | Factory: at least 1 hour |
| Exercise window | Keeper: 24 hours | Factory: at least 1 day |
| Ask | — | Never above the strike |
| Listing end | Exercise timestamp | Constant |
| Deposit cap | `type(uint256).max` (effectively none) | No compiled ceiling. 0 would close deposits on any account at the cap |
| Valorem engine fee | Not accepted | Admin switch. While on and not accepted, `list` and fills revert |

The underlying is NVDA only. One contract always covers 1 Stock Token. There is no shared 20 NVDA vault cap: each account is checked against `depositCap` on its own held balance.

### Keeper settings (factory weeks)

| Choice | Production |
|---|---|
| Strike | Spot × 5% OTM, rounded down to a whole USDG |
| Ask | 0.40% of spot, floored at 1 USDG, never above the strike |
| How early to set the week | At least 6 hours before the Friday close (`KEEPER_ARM_LEAD_S`) |

The keeper does **not** use Cboe vol mode for factory weeks.

## Related

* [Fees](fees.md)
* [Roles and admin powers](../protocol/roles.md)
* [The weekly cycle](weekly-cycle.md)

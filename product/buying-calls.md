# Buying calls

Each week listed accounts sell 1-lot covered calls on the NVDA Stock Token for USDG. This page is for buyers: what the calls are, where they are sold, what a fill does, and how to exercise.

{% hint style="warning" %}
**Before you buy:** A call that ends the week out of the money expires worthless, and the premium you paid is gone. The underlying is the NVDA Stock Token, a debt security issued by Robinhood Assets (Jersey) Limited, not an Nvidia share. Stonkhouse is not available to US persons. The contracts are unaudited. Nothing here is investment advice.
{% endhint %}

Calls live on Stonkhouse's Valorem clearinghouse `0x53d7A6d0489Daf3d67b9A314e0eAB2B78Acab9C6`. Each seller is a user's clone from factory `0xc4A5Cd0DE91CaB7F5Ebe2114bc63Fbb43E642BBb`. Every address is on [Contracts and addresses](../protocol/addresses.md).

## What you are buying

| | |
|---|---|
| **Underlying** | 1 NVDA Stock Token per contract |
| **Strike** | USDG per contract, fixed when the keeper calls `setWeek`. The factory policy requires it 3% to 12% above spot when the account lists. Week 1 is 223 USDG |
| **Ask** | One USDG price per lot for the whole week. Week 1 is 1.000000 USDG. Never above the strike |
| **Exercise window** | From the option's exercise timestamp until **that account's** expiry. The keeper sets exercise at the NYSE Friday close, 4:00pm ET, and base expiry 24 hours later. Each account's expiry is base expiry plus its index, so every seller has a unique option type |
| **Settlement** | Physical, on the clearinghouse: exercising pays the strike in USDG and delivers the NVDA Stock Token |
| **Form** | An ERC-1155 token on the clearinghouse. The id is that seller's option type |
| **Seller** | The writer's account. Each fill locks 1 NVDA from **that** account inside Valorem |

The terms of an option type cannot change once it exists.

### How the keeper sets the strike and the ask

Production prices factory weeks from spot, not from Cboe quotes:

* **Strike:** spot × (1 + 5%) (`KEEPER_STRIKE_OTM_BPS` = 500), rounded down to a whole USDG.
* **Ask:** 0.40% of spot (`minPremiumBps` 40), floored at 1 USDG, never above the strike.
* **No data, no week:** if the price feed cannot be read, the keeper sets no week.

Week 1, exercising Friday 18 September 2026, 4:00pm ET: **223 USDG strike, 1.000000 USDG ask**.

## Where to buy

The live lots are on the app's book, `app.stonkhouse.fun/book`. They are not posted to any marketplace. Each lot is a Seaport 1.6 `FULL_RESTRICTED` order the account already validated, so a fill needs no signature.

The book also has the Exercise card for option tokens you already hold.

## What a fill does

1. You pick a 1-NVDA lot and confirm. Approve USDG to Seaport for the ask if needed.
2. Seaport calls the account's `authorizeOrder`. The account writes 1 NVDA into Valorem, then Seaport pays:
   * **95% of the ask** to the seller's **wallet** (not the clone)
   * **5%** to the factory fee recipient
3. You receive 1 option token. The seller's reserved NVDA drops by 1.

A fill is always exactly one lot. There is no partial fill of a lot.

## Why a fill can be refused

The account re-checks at fill time. Usual reasons:

* **Spot has risen.** Strike below the 3% OTM floor, or the ask under the 0.40% premium floor (`StrikeBelowBand`, `PremiumBelowFloorAtFill`).
* **The sale window has closed.** No fill from the exercise timestamp (`WriteWindowClosed`). The order itself ends then.
* **Writes are halted**, the oracle is paused, the price is older than four days, or Valorem's engine fee is on and not accepted.
* **The order is no longer live.** It filled, the seller settled, or the counter was incremented.
* **Your side.** Not enough USDG, no Seaport approval, USDG paused or you frozen, or a receiver that cannot take ERC-1155.

A refused fill reverts as a whole. A sent-and-reverted transaction still costs gas.

## How to exercise

On `app.stonkhouse.fun/book`, during that option's window. The card shows your balance, the strike, NVDA per contract and the USDG total. It simulates, asks for a USDG approval to the clearinghouse if needed, then calls `exercise`. If the NVDA you would receive is worth no more than the strike at spot, or spot cannot be read, it warns and asks you to confirm.

Nothing is exercised automatically. You can also call `exercise(optionId, amount)` on the clearinghouse yourself after approving `strike × amount` USDG (plus 15 bps if the engine fee is on). The clearinghouse does not check whether the call is in the money.

Week 1 exercise: Friday 18 September 2026, 4:00pm ET through that seller's expiry (base Saturday 19 September 2026, 4:00pm ET, plus the account's index in seconds).

## Related

* [Fees](fees.md)
* [Assignment](assignment.md)
* [The weekly cycle](weekly-cycle.md)

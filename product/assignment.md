# Assignment

Assignment can take the collateral at the strike. When a call holder exercises, Valorem takes NVDA from the collateral the vault locked and leaves the strike price in USDG. Depositors lose the NVDA and receive the strike USDG instead, with no protocol fee taken from it.

{% hint style="warning" %}
**What assignment costs you:** every bit of upside above the strike for that week, and the NVDA itself. v1 does not buy the stock back, so after an assigned week the vault holds less NVDA and more USDG, and the cNVDA share price in NVDA terms falls. You keep any premium the week earned, net of fees. A week with no fill can still be assigned, and then there is no premium to keep.
{% endhint %}

## When it can happen

A call can be exercised only during the cycle's exercise window, which runs from the exercise timestamp to expiry. Overcall's current window is 24 hours, from Friday 20:00 UTC to Saturday 20:00 UTC, but the registry's timestamps are what count. A holder would normally exercise only if NVDA trades above the strike, and the strike sits 3% to 12% above spot at the time of the write (launch band). So it takes a move, though not an enormous one.

Exercise happens entirely inside Valorem, with no call into the vault. The NVDA leaves the vault's claim immediately. The strike USDG stays inside the claim until `rollClose` redeems it after expiry.

## Partial and full assignment

**Partial assignment is normal.** Valorem assigns exercises by bucket, not perfectly pro rata. How many of the vault's contracts are assigned is Valorem's decision, not the vault's: a vault that wrote N contracts can come back with anywhere from none to all N assigned. Settlement returns whatever collateral was not assigned and does not depend on how many of the vault's own option tokens were sold.

{% hint style="warning" %}
**Unsold contracts can still be assigned.** Option tokens for the same strike and cycle are interchangeable, and anyone can write them on Valorem. When a holder exercises, Valorem assigns the exercise across the claims of everyone who wrote that option, not only to writers whose tokens were sold. So a week where the vault sold few or none of its contracts can still end with some of its collateral assigned, if other people's contracts on the same rung were bought and exercised. The vault earns premium only on what it sold, but its assignment exposure is everything it wrote.
{% endhint %}

| Outcome | NVDA back at the close | USDG from the claim |
|---|---|---|
| None assigned | All the NVDA that was written | None |
| Partly assigned | The NVDA behind the contracts not assigned | Strike x contracts assigned |
| Fully assigned | None | Strike x all contracts written |

The vault pools the result. Every depositor gets the same blend per share. Nobody is singled out for the assigned part.

## What depositors hold afterwards

* **Fewer NVDA per cNVDA share.** The share price counts only NVDA, so it falls by the NVDA that left.
* **More claimable USDG.** The strike proceeds are credited to all shares pro rata, in full. The protocol fee is charged on premium only.
* **The premium, net of fees,** as in any filled week.

### The no-rebuy consequence

v1 does not use the strike USDG to buy NVDA back. An automated market buy is its own risk, and a rebuy is not part of the v1 contracts. So:

* the vault stays underweight NVDA until new deposits add to it;
* the next cycle writes against the smaller idle NVDA balance, so fewer contracts can be written;
* if NVDA keeps rising after the assignment, the vault does not participate on the assigned part. You sold that move for a week's premium.

What you do with the USDG is up to you. It sits in your claimable balance until you claim it.

## Worked example

The numbers below are illustrative and are not a forecast. The premium, fee and fully assigned figures follow the vault's accounting reference; the share-price lines and the partial case apply the same rules. 20 NVDA is deposited by one depositor, who holds 20 cNVDA. The vault writes 10 contracts at a $231 strike. A buyer pays 2.00 USDG per contract, so the vault receives 19.00 USDG after Overcall's 5%.

### Fully assigned

```
NVDA given up                    10.000000 NVDA
Strike proceeds                2310.000000 USDG   231.00 x 10, fee-free
Premium received by the vault    19.000000 USDG
Protocol fee                      0.950000 USDG   5% of the 19.00 premium only
Credited to depositors         2328.050000 USDG   2310.00 + 18.05

NVDA in the vault after close    10.000000 NVDA   was 20
Share price                      0.50 NVDA per cNVDA   was 1.00
```

The depositor now holds 20 cNVDA worth about 10 NVDA, plus 2,328.05 USDG to claim.

### Partly assigned: 4 of the 10 contracts

The same week, with only 4 contracts assigned:

```
NVDA given up                     4.000000 NVDA
Strike proceeds                 924.000000 USDG   231.00 x 4, fee-free
Premium received by the vault    19.000000 USDG
Protocol fee                      0.950000 USDG   unchanged
Credited to depositors          942.050000 USDG   924.00 + 18.05

NVDA in the vault after close    16.000000 NVDA   10 idle + 6 returned
Share price                      0.80 NVDA per cNVDA
```

In both cases the protocol fee is 0.95 USDG, exactly what it would be on the same week with no assignment.

## Withdrawals in an assigned week

If you queued a redemption during a week that was assigned, your payout is a mix: your pro-rata share of the NVDA left in the vault, plus USDG that includes your escrowed shares' share of the strike proceeds. A queued redemption is never a promise of a fixed number of tokens. See [Withdrawing and the redeem queue](../getting-started/withdrawing.md).

## How the vault protects depositors around assignment

Between an exercise and `rollClose`, the vault's NVDA has dropped while the offsetting USDG has not arrived. New shares priced in that gap would take strike proceeds from the depositors who were actually assigned. The vault prevents this in two independent ways:

* deposits close at the cycle's exercise timestamp, whether or not anyone calls `lockBook` and whether or not the keeper is running;
* deposits are also refused whenever assignment proceeds are waiting in the vault's Valorem claim, regardless of the clock.

## Related

* [Fees](fees.md)
* [Risks](risks.md)
* [Accounting](../protocol/accounting.md)

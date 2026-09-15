# Assignment

Assignment can take the collateral at the strike. When a call holder exercises, Valorem takes NVDA from the collateral the vault locked and leaves the strike price in USDG. Depositors lose the NVDA and receive the strike USDG instead, with no protocol fee taken from it.

{% hint style="warning" %}
**What assignment costs you:** every bit of upside above the strike for that week, and the NVDA itself. v1 does not buy the stock back, so after an assigned week the vault holds less NVDA and more USDG, and the cNVDA share price in NVDA terms falls. You keep the premium the week earned, net of the protocol fee. The vault can be assigned only on calls it sold, so every assigned contract earned a premium; a week with no fill writes nothing and cannot be assigned.
{% endhint %}

## When it can happen

A call can be exercised only during the cycle's exercise window: the clearinghouse accepts an exercise from the exercise timestamp up to, but not including, the expiry timestamp. The keeper sets exercise at the NYSE Friday close, 16:00 ET (Thursday when the Friday is an NYSE holiday), and expiry 24 hours later; the option type's own timestamps are what count (see [The weekly cycle](weekly-cycle.md)). A holder would normally exercise only if NVDA trades above the strike. The keeper sets the strike 5% to 11.5% above spot when the week is armed, from the option quotes, and the vault requires it to be 3% to 12% above spot at that moment (current policy). So it takes a move, though not an enormous one, and the week has several days in which to make it.

Exercise happens entirely inside Valorem, with no call into the vault. The NVDA leaves the vault's claim immediately. The strike USDG stays inside the claim until `rollClose` redeems it after expiry, or `retryStrandedClaim` if the close could not.

## How Valorem assigns an exercise

Valorem groups writes of the same option type into **buckets**. Every write made before the first exercise of that type goes into the same bucket, whoever the writer is. The vault writes only inside fills, and fills stop at the exercise timestamp, before any exercise is possible, so all of a week's fills land in one bucket together with anything other writers wrote before the first exercise, including writes made after the window opened but before anyone exercised. Writes made after the first exercise open new buckets.

When a holder exercises, Valorem starts at a bucket picked from a seed fixed when the option type is created (the seed modulo the number of buckets not yet fully exercised) and walks on from there; anyone can compute the order. **Inside a bucket, it assigns the exercise pro rata by amount written, across every writer in that bucket**, whether or not their own calls were sold and whoever holds the calls being exercised. For the vault's bucket, that is every writer of the option type who wrote before the first exercise. So:

* the vault can be assigned because of calls that other writers sold, or that someone wrote and exercised themselves;
* the vault's share of an exercise depends on how much others wrote into the same bucket, which the vault does not control;
* assignment can come back in fractions of a contract.

### Bounded to what the vault sold

**The vault is never assigned on more contracts than it sold.** Nothing is written when a week is armed. Each fill writes exactly the contracts that buyer takes, in the buyer's own transaction, and the fill is reverted if any option token stays in the vault. Written always equals sold, so whatever anyone else writes or exercises beside the vault, the most it can be assigned is the number of calls it was paid a premium for.

### What "unfilled" means now

An unfilled week wrote nothing. There is no claim, nothing to exercise against, and nothing assignable: `rollClose` has no claim to redeem and the week closes flat. The "unfilled, but assigned anyway" week that earlier designs could produce, where calls written ahead of a sale were assigned without earning a premium, cannot happen to this vault.

## Partial and full assignment

**Partial assignment is normal.** How many of the vault's sold contracts are assigned is decided by Valorem's buckets, not by the vault. A vault that sold N contracts can come back with anywhere from none to all N assigned, in fractions of a contract when it shares a bucket with other writers. Settlement returns whatever collateral was not assigned.

| Outcome | NVDA back at the close | USDG from the claim |
|---|---|---|
| None assigned | All the NVDA written, which is the NVDA behind the contracts sold | None |
| Partly assigned | The NVDA behind the sold contracts not assigned | Strike x contracts assigned |
| Fully assigned | None | Strike x all contracts sold |
| Nothing sold | Nothing was written; the NVDA never left the vault | None |

The vault pools the result. Every depositor gets the same blend per share. Nobody is singled out for the assigned part.

## What depositors hold afterwards

* **Fewer NVDA per cNVDA share.** The share price counts only NVDA, so it falls by the NVDA that left.
* **More claimable USDG.** The strike proceeds are credited to all shares pro rata, in full. The protocol fee is charged on premium only.
* **The premium, net of the protocol fee,** as in any filled week.

### The no-rebuy consequence

v1 does not use the strike USDG to buy NVDA back. An automated market buy is its own risk, and a rebuy is not part of the v1 contracts. So:

* the vault stays underweight NVDA until new deposits add to it;
* the next week's capacity is measured on the smaller total, so fewer contracts can be sold;
* if NVDA keeps rising after the assignment, the vault does not participate on the assigned part. You sold that move for a week's premium.

What you do with the USDG is up to you. It sits in your claimable balance until you claim it.

## Worked example

These figures come from a fork rehearsal of the keeper run on 15 September 2026 (UTC), against a copy of Robinhood Chain with Seaport 1.6, USDG, a Valorem clearinghouse already on the chain with the same code as the vault's, and a test price feed seeded with the real Chainlink print. The keeper priced at a fixed margin over the 0.40% floor then in force. They are not a forecast.

The keeper armed a 223 USDG strike with spot at 211.93 USDG. Two buyers filled 2 and then 3 calls at 0.856189 USDG each, so the vault wrote and sold 5. A deposit made while the week was Listed brought the vault to 20 NVDA behind 20 cNVDA. At the exercise window spot was set to 228 USDG, above the strike, and one buyer exercised 2 of the 5. Nobody else had written that option type, so both exercised contracts were assigned to the vault's claim.

```
Contracts sold                        5
Contracts assigned                    2
NVDA given up                         2.000000 NVDA
Strike proceeds                     446.000000 USDG   223 x 2, fee-free
NVDA back from the claim              3.000000 NVDA   the 3 sold contracts not exercised
Premium                               4.280945 USDG   protocol fee 0.214047

NVDA behind 20 cNVDA                 20 before the exercise, 18 after
Share price                           1.00 NVDA per cNVDA before, 0.90 after
Strike proceeds per cNVDA            22.3 USDG
```

The protocol fee was 0.214047 USDG, exactly what it would have been on the same fills with no assignment. The 3 contracts that were not exercised expired, and their 3 NVDA came back at `rollClose`.

In the week before, the same rehearsal listed 23 calls and nobody bought any. Nothing was written, nothing was assigned, and the week closed with every NVDA still in the vault.

## Withdrawals in an assigned week

If you queued a redemption during a week that was assigned, your payout is a mix: your pro-rata share of the NVDA left in the vault, plus USDG that includes your escrowed shares' share of the strike proceeds. In the rehearsal above, 4 cNVDA queued during the week settled at the close for 3.6 NVDA and 89.2 USDG. A queued redemption is never a promise of a fixed number of tokens. See [Withdrawing and the redeem queue](../getting-started/withdrawing.md).

## How the vault protects depositors around assignment

Between an exercise and `rollClose`, the vault's NVDA has dropped while the offsetting USDG has not arrived. New shares priced in that gap would take strike proceeds from the depositors who were actually assigned. The vault prevents this in several independent ways:

* deposits close at the cycle's exercise timestamp, whether or not anyone calls `lockBook` and whether or not the keeper is running;
* deposits are also refused whenever assignment proceeds are waiting in the vault's Valorem claim, regardless of the clock;
* deposits stay refused while a claim is stranded, until its strike proceeds have been collected;
* fills stop at the exercise timestamp too, and the week's option type must exercise at least an hour after it was armed, so no call can be sold and exercised at the same moment.

## Related

* [Fees](fees.md)
* [Risks](risks.md)
* [Accounting](../protocol/accounting.md)

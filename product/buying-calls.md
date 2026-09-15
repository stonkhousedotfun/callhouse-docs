# Buying calls

Each week the vault sells covered calls on the NVDA Stock Token for USDG. This page is for buyers: what the calls are, where they are sold, what a fill does, what it costs in gas, why a fill can be refused, and how to exercise.

{% hint style="warning" %}
**Before you buy:** A call that ends the week out of the money expires worthless, and the premium you paid is gone. The underlying is the NVDA Stock Token, which is a debt security issued by Robinhood Assets (Jersey) Limited, not an Nvidia share. Stonkhouse is not available to US persons. The contracts are unaudited. Nothing here is investment advice.
{% endhint %}

The vault is live on Robinhood Chain at `0x88a98931E3682137E7e4D3426f623247f4A4ecbb`, and its calls live on Stonkhouse's own Valorem clearinghouse at `0x53d7A6d0489Daf3d67b9A314e0eAB2B78Acab9C6`. Every address is on [Contracts and addresses](../protocol/addresses.md).

## What you are buying

| | |
|---|---|
| **Underlying** | 1 NVDA Stock Token per contract |
| **Strike** | USDG per contract, fixed when the keeper creates the week's option type. The vault requires it to be 3% to 12% above spot when the week is armed (current policy); the keeper's pricing puts it 5% to 11.5% above |
| **Exercise window** | From the option type's exercise timestamp until its expiry timestamp. The keeper sets exercise at the NYSE close on Friday, 4:00pm New York time (Thursday when Friday is an NYSE holiday), and expiry 24 hours later |
| **Settlement** | Physical, on the clearinghouse: exercising pays the strike in USDG and delivers the NVDA Stock Token |
| **Form** | An ERC-1155 token on the clearinghouse `0x53d7…C6`, whose id is the week's option type (`vault.optionId()` while the week is open) |
| **Price** | One USDG price per contract for the whole listing, never above the strike |
| **Seller** | The vault. Each contract is collateralised by one NVDA that the vault locks in the clearinghouse inside your fill. |

The terms of an option type cannot change once it exists. The cycle page reads them back from the clearinghouse and warns if they differ from what the vault recorded when it armed the week.

### How the keeper sets the strike and the price

The keeper prices each week from Cboe's free, delayed NVDA option quotes. This is its default `vol` mode, and production runs it.

* **Strike:** the strike of the listed NVDA call that expires on the week's close day with a delta of about 0.15, interpolated between the two listed strikes around it, converted to the token's price and rounded to a whole USDG. The keeper then keeps it at least 2 percentage points above the vault's band floor and 0.5 points below its ceiling, which under the current policy is 5% to 11.5% above spot.
* **Ask per contract:** the higher of the vault's premium floor plus 0.5% (`KEEPER_PREMIUM_MARGIN_BPS` is 50 in production) and the quotes' mid price at that strike plus 10%, rounded up to a USDG base unit and never above the strike.
* **No data, no week:** if the quotes are missing, stale or inconsistent, the keeper arms nothing that week. It never falls back to another price.

The cycle page shows the inputs the keeper reports for the live listing. They come from the keeper, not the chain, so the page cannot check them.

Cycle 1, which exercises on 18 September 2026, is an exception. Its live listing, 1 contract at 0.856436 USDG with a 223 USDG strike, was priced by the keeper version before `vol` mode, from the premium floor then in force (0.40% of spot) plus the keeper's margin. It is the second of that cycle's three listings.

## Where to buy

The vault's order is published in one place: the app's cycle page, `app.stonkhouse.fun/vault/nvda/cycle`. It is not posted to any marketplace or order-book service, there is no third-party fee, and there is nothing to sign: the vault validated the order on Seaport by hash, and Seaport skips the signature check for a validated order.

1. **On the cycle page.** It reads the week's option and the vault's authorised order from the chain, gets the order's full parameters from the keeper, and checks them against the chain: the order must hash to the vault's authorised order, name the vault as offerer and zone, and pay USDG to the vault and nobody else. It then simulates your exact fill from your address. The button stays off while the simulation shows the vault or Seaport refusing the fill, or USDG refusing to move. It stays on when only your side is short, such as a missing USDG approval, which the button sends first, and when the result is inconclusive, which the page flags with a warning.
2. **With your own Seaport 1.6 client.** The fill card on the cycle page shows the raw order and lets you copy it. With it, call `fulfillAdvancedOrder` on Seaport 1.6 with numerator k (the contracts you want) and denominator N (the order's size), an empty signature, empty extra data, no criteria resolvers, a zero conduit key, and your receiving address, after approving k × the unit price of USDG to Seaport. The Seaport address is on [Contracts and addresses](../protocol/addresses.md).

## The order

The vault has at most one live order at a time. `approveListing` checks its shape on chain before it is authorised:

* a Seaport 1.6 `PARTIAL_RESTRICTED` order (order type 3), with the vault as both offerer and zone, a zero zone hash and a zero conduit key;
* one offer item: the week's option token, N contracts, at most the vault's remaining [capacity](../resources/glossary.md#capacity);
* one consideration item: N × the unit price in USDG, paid to the vault. The total is an exact multiple of N, so a partial fill of k contracts pays exactly k × the unit price;
* the same amounts from start to end (no price ramp), a start time no later than the moment the order is authorised, and an end time no later than the exercise timestamp.

At most three orders can be authorised in a cycle (`MAX_LISTINGS_PER_CYCLE`), cancelled ones included. When the keeper cancels an order and lists a new one, the new one is a reprice, and it uses one of the three.

## What a fill does

All of this happens in your one transaction. If any step fails, the whole fill reverts: nothing is written and no USDG moves.

1. **You approve USDG to Seaport,** at least k × the unit price. The approval goes to Seaport, not to the vault.
2. **Seaport calls the vault before it moves anything** (`authorizeOrder`). The vault checks that this is its live order, that the week is listed and that writes are not halted. It then checks the fill against the price feed at that moment: the sale window is still open, Valorem's engine fee is off or accepted, the Stock Token's oracle is not paused and the feed is fresh, the strike is still at or above the band's lower bound, the price for k contracts clears the premium floor, and the contracts written so far plus k still fit the capacity. Only then does it lock k NVDA in the clearinghouse and write k contracts.
3. **Seaport moves the tokens.** The k freshly written option tokens go to your receiving address, and k × the unit price of USDG goes from you to the vault.
4. **Seaport calls the vault again** (`validateOrder`). The vault confirms that no option token stayed behind in it.

The vault never holds an unsold call: the calls you buy did not exist before your transaction.

## Partial fills

You can take any whole number of contracts up to what is left. Seaport records the fraction filled, and the rest stays on offer to the next buyer. The first fill of a week opens the vault's position on the clearinghouse; later fills add to it.

In a fork rehearsal of the keeper, with the real Seaport 1.6 and a Valorem clearinghouse with the same code as the vault's, an order of 14 contracts was listed at 0.856189 USDG each. One buyer filled 2 of the 14 and paid 1.712378 USDG; a second buyer filled 3 more and paid 2.568567 USDG. Each fill wrote exactly the contracts it bought.

## Gas

Measured in fork rehearsals of the keeper, in gas units. What that costs in ETH depends on the chain's gas price when you send it, and live figures will differ.

| Transaction | Gas used |
|---|---|
| First fill of a week, which opens the vault's position | 462,677 (2 contracts); 445,577 (2 contracts, a later week) |
| A later fill in the same week, which adds to it | 289,157 (3 contracts) |
| USDG approval to the clearinghouse, before exercising | 57,988 (an earlier rehearsal, 13 September 2026) |
| Exercise | 156,019 (9 contracts, the same earlier rehearsal) |

The cycle page simulates the fill with a gas limit of 800,000 before it lets you send it.

## When a fill is refused

The vault prices every fill against the spot of the moment it happens, not the spot of the day the order was listed. After a rally that has two consequences:

* **The strike can fall below the band.** At every fill the strike must still be at least 3% above spot under the current policy (`minOtmBps` 300). For cycle 1's 223 USDG strike that holds only while spot stays at or below about 216.50 USDG, about 2.2% above the 211.92 the feed showed on 15 September 2026. This is arithmetic, not an observed result. Above that, every fill reverts with `StrikeBelowBand`, and no new price can fix it, because the strike belongs to the week's option type. That week sells no more calls unless spot falls back.
* **The premium floor rises with spot.** The floor is currently 0.10% of spot per contract (`minPremiumBps` 10). A price under it at the spot of the fill reverts with `PremiumBelowFloorAtFill` until the keeper cancels the order and lists a new one, which uses one of the week's three listings. At 0.10% this floor rarely binds: cycle 1's 0.856436 USDG price clears it at any spot up to about 856 USDG. The keeper's extended fork rehearsal, run with the earlier 0.40% floor, went through a refusal: after a 1.5% rise the fill was refused, the keeper relisted at the new floor plus its 1% margin (0.869032 USDG against a floor of 0.860427), and a fill at the new price went through.

The band's upper bound is not checked again at a fill: after spot falls, the strike is further out of the money, which makes the call safer to sell.

Other reasons a fill can be refused: the sale window has closed (`WriteWindowClosed`), capacity has shrunk (`ContractsAboveUtilization`, `ContractsAboveCap`), writes are halted (`WritesAreHalted`), the Stock Token's oracle is paused (`OraclePaused`), the price feed is older than `maxPriceAge`, currently four days (`StalePrice`), Valorem's engine fee is on and not accepted (`ValoremFeeNotAccepted`), or the order has been cancelled, sold out or replaced. On your side: not enough USDG, a missing approval, USDG paused or your address frozen by USDG. The cycle page names the reason its simulation hit. See the [FAQ](../resources/faq.md#why-was-my-fill-refused).

## Exercising

Exercise happens on the clearinghouse, `0x53d7A6d0489Daf3d67b9A314e0eAB2B78Acab9C6`. The vault takes no part in it. You can exercise from the cycle page or call the clearinghouse directly.

### The exercise window

The clearinghouse's `exercise` accepts a call only while `exerciseTimestamp <= block.timestamp < expiryTimestamp`, reading both from the option type. Before the window it reverts with `ExerciseTooEarly`; from expiry on it reverts with `ExpiredOption`. For cycle 1 (strike 223 USDG) the window opens at 1789761600, Friday 18 September 2026, 8:00pm UTC (4:00pm ET), and closes at 1789848000, Saturday 19 September 2026, 8:00pm UTC (4:00pm ET). Nothing is exercised automatically: a call not exercised by expiry is worthless.

### The Exercise card on the cycle page

When the connected wallet holds this week's option (the clearinghouse ERC-1155 token whose id is `vault.optionId()`), the cycle page shows an **Exercise** card with:

* the wallet's option balance;
* the strike;
* the NVDA received per contract;
* the exact USDG totals for the number of contracts you choose.

The Exercise button is enabled only inside the exercise window, judged by the chain's latest block rather than your device's clock. You pick a number of contracts up to your balance, and the card shows exactly what the clearinghouse will take: the strike cost plus its engine fee, which is zero while that fee is off. The card simulates the exercise from your address. The button stays off while the simulation says the clearinghouse would refuse it, your USDG balance is short, or a token would not move. It stays on when only the USDG approval is missing, and when the result is inconclusive, which the card flags with a warning.

When you click, the app simulates again. If your USDG approval to the clearinghouse is below the total, it first asks for an approval of exactly the total, never more, and simulates once more; then it calls `exercise(optionId, amount)`. When the NVDA you would receive is worth no more than what you pay at the vault's spot, or spot cannot be read because the feed is stale, the card warns you and the button waits for you to tick a confirmation.

Before the window opens the card shows when exercise opens, in UTC and Eastern time. From expiry until the week is closed it says that the options expired worthless. The card follows `vault.optionId()`, which `rollClose` clears, so after the close it no longer appears for that option unless the close stranded the claim. The keeper sends `rollClose` on its first check at or after expiry, and it checks every minute.

### Exercising directly on the clearinghouse

You can do the same from a block explorer's contract page or your own tooling:

1. **Find the option id.** It is the ERC-1155 token id your wallet holds on the clearinghouse. While the week is open, `optionId()` on the vault returns it. `option(optionId)` on the clearinghouse returns its terms, including the underlying amount `1000000000000000000` (1 NVDA), exercise amount (the strike in USDG base units, 6 decimals; `223000000` for cycle 1), exercise timestamp and expiry timestamp.
2. **Approve USDG to the clearinghouse.** Call `approve(0x53d7A6d0489Daf3d67b9A314e0eAB2B78Acab9C6, amount)` on USDG (`0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168`) for k × the exercise amount. The engine fee is off today (`feesEnabled()` returns false). If it were on, add `max(floor(k × exercise amount × 15 / 10000), 1)` base units. No approval of the option tokens is needed.
3. **Call `exercise(uint256 optionId, uint112 amount)`** (selector `0xf55e49b2`) on the clearinghouse inside the window, with `amount` = k whole contracts. It burns your k option tokens, pulls k × the strike in USDG (plus any fee) from you, and sends you k NVDA Stock Tokens.

It reverts with `CallerHoldsInsufficientOptions` if you hold fewer than k, and with `TRANSFER_FROM_FAILED` if the USDG approval or balance is short, USDG is paused, or your address is frozen on USDG. It reverts with `TRANSFER_FAILED` if the NVDA cannot be delivered, for example while the Stock Token is paused or your address is blocklisted on it.

The clearinghouse does not check whether the call is in the money. Whether exercising is worth it is your decision: you pay the strike for Stock Tokens worth whatever they are worth at that moment, and you need to be able to hold them under the issuer's terms.

Valorem assigns your exercise to the option's writers bucket by bucket, pro rata by amount written inside a bucket, so it can fall on writers other than the vault (see [Assignment](assignment.md)). You receive the NVDA either way.

In the fork rehearsal, with spot set to 228 on the fork, a buyer exercised 2 contracts at the 223 USDG strike and paid 446 USDG, with the engine fee off.

## Who can buy, and with what account

* Stonkhouse is not available to US persons, and that includes buying the vault's calls.
* The app connects MetaMask and Phantom on Robinhood Chain. It does not support WalletConnect or mobile QR connections, and other injected wallets are not offered.
* Your receiving address must accept ERC-1155 tokens. An ordinary wallet does. A contract must implement the ERC-1155 receiver hooks, and an address with an EIP-7702 delegation accepts only what its delegate's code allows; if it refuses, the fill reverts.
* A contract that fills cannot deposit into the vault in the same transaction. See [Depositing](../getting-started/depositing.md#a-deposit-inside-a-fill-is-refused).

## Related

* [How Stonkhouse works](../getting-started/how-it-works.md)
* [The weekly cycle](weekly-cycle.md)
* [Assignment](assignment.md)
* [Launch policy and hard caps](policy.md)

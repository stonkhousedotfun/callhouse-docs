# Buying calls

Each week the vault sells covered calls on the NVDA Stock Token for USDG. This page is for buyers: what the calls are, where they are sold, what a fill does, what it costs in gas, why a fill can be refused, and how to exercise.

{% hint style="warning" %}
**Before you buy:** A call that ends the week out of the money expires worthless, and the premium you paid is gone. The underlying is the NVDA Stock Token, which is a debt security issued by Robinhood Assets (Jersey) Limited, not an Nvidia share. Callhouse is not available to US persons. The contracts are unaudited. Nothing here is investment advice.
{% endhint %}

{% hint style="info" %}
The vault is not deployed yet. This page describes how buying works once it is. The vault address will be published on [Contracts and addresses](../protocol/addresses.md).
{% endhint %}

## What you are buying

| | |
|---|---|
| **Underlying** | 1.0000 NVDA Stock Token per contract |
| **Strike** | USDG per contract, fixed when the keeper creates the week's option type: by default about 5% above spot, rounded to a whole USDG |
| **Exercise window** | From the exercise timestamp, which the keeper sets at the NYSE close on Friday, 16:00 New York time (Thursday when Friday is an NYSE holiday), until expiry 24 hours later |
| **Settlement** | Physical, on the Valorem clearinghouse: exercising pays the strike in USDG and delivers the NVDA Stock Token |
| **Form** | An ERC-1155 token on the Valorem clearinghouse, whose id is the week's option type |
| **Price** | One USDG price per contract for the whole listing, never above the strike |
| **Seller** | The vault. Each contract is collateralised by one NVDA that the vault locks in Valorem inside your fill. |

The terms of an option type cannot change once it exists. The app's fill page reads them back from the clearinghouse and cross-checks them against what the vault recorded when it armed the week.

By default the keeper asks the vault's premium floor at the spot of the listing (0.40% of spot per contract at launch) plus a 1% margin. That is the vault's minimum plus a buffer, not a model of what the call is worth.

## Where to buy

There are two ways to fill the vault's order, and no other venue. There is no order-book API, no third-party fee, and nothing to sign: the vault validated the order on Seaport by hash, and Seaport skips the signature check for a validated order.

1. **The app's fill page,** `app.callhouse.finance/vault/nvda/cycle`. It reads the week's option and the vault's authorised order from the chain, fetches the order's full parameters from the keeper, and checks them against the chain: the order must hash to the vault's authorised order, name the vault as offerer and zone, and pay USDG to the vault and nobody else. It then simulates your exact fill from your address and enables the button only if the simulation passes.
2. **Any Seaport 1.6 client.** The fill card shows the raw order. With it, call `fulfillAdvancedOrder` on Seaport 1.6 with numerator k (the contracts you want) and denominator N (the order's size), an empty signature, empty extra data, no criteria resolvers, a zero conduit key, and your receiving address, after approving k × the unit price of USDG to Seaport. The Seaport address is on [Contracts and addresses](../protocol/addresses.md).

## The order

The vault has at most one live order at a time. Its shape is checked on chain before it is authorised:

* a Seaport 1.6 `PARTIAL_RESTRICTED` order (order type 3), with the vault as both offerer and zone, a zero zone hash and a zero conduit key;
* one offer item: the week's option token, N contracts, at most the vault's remaining [capacity](../resources/glossary.md#capacity);
* one consideration item: N × the unit price in USDG, paid to the vault. The total is an exact multiple of N, so a partial fill of k contracts pays exactly k × the unit price;
* the same amounts from start to end (no price ramp), a start time no later than the moment the order is authorised, and an end time no later than the exercise timestamp.

At most three orders can be authorised in a week, cancelled ones included. When the keeper cancels an order and lists a new one, the new one is a reprice, and it uses one of the three.

## What a fill does

All of this happens in your one transaction. If any step fails, the whole fill reverts: nothing is written and no USDG moves.

1. **You approve USDG to Seaport,** at least k × the unit price. The approval goes to Seaport, not to the vault.
2. **Seaport calls the vault before it moves anything.** The vault checks that this is its live order, that the week is listed and that writes are not halted. It then checks the fill against the price feed at that moment: the sale window is still open, Valorem's engine fee is off or accepted, the Stock Token's oracle is not paused and the feed is fresh, the strike is still at or above the band's lower bound, the price for k contracts clears the premium floor, and the contracts written so far plus k still fit the capacity. Only then does it lock k NVDA in Valorem and write k contracts.
3. **Seaport moves the tokens.** The k freshly written option tokens go to your receiving address, and k × the unit price of USDG goes from you to the vault.
4. **Seaport calls the vault again.** The vault confirms that no option token stayed behind in it.

The vault never holds an unsold call: the calls you buy did not exist before your transaction.

## Partial fills

You can take any whole number of contracts up to what is left. Seaport records the fraction filled, and the rest stays on offer to the next buyer. The first fill of a week opens the vault's position on the clearinghouse; later fills add to it.

In a fork rehearsal of the keeper, with the real Seaport 1.6 and Valorem clearinghouse, an order of 14 contracts was listed at 0.856189 USDG each. One buyer filled 2 of the 14 and paid 1.712378 USDG; a second buyer filled 3 more and paid 2.568567 USDG. Each fill wrote exactly the contracts it bought.

## Gas

Measured in the same fork rehearsal, in gas units. What that costs in ETH depends on the chain's gas price when you send it, and live figures will differ.

| Transaction | Gas used |
|---|---|
| USDG approval to Seaport | 57,892 |
| First fill of a week, which opens the vault's position | 462,677 (2 contracts); 445,577 (2 contracts, a later week) |
| A later fill in the same week, which adds to it | 289,157 (3 contracts) |
| USDG approval to the clearinghouse, before exercising | 57,988 |
| Exercise | 151,219 (2 contracts); 138,919 (1 contract) |

The fill page simulates the fill with a generous gas limit before it lets you send it.

## When a fill is refused

The vault prices every fill against the spot of the moment it happens, not the spot of the day the order was listed. After a rally that has two consequences:

* **The premium floor rises with spot.** At launch the floor is 0.40% of spot per contract. In the rehearsal above, the order was listed at 0.856189 USDG per contract against a floor of 0.847711 at a spot of 211.93. By the launch policy's arithmetic (not a rehearsal result), that price clears the floor only while spot stays below about 214.05. Above that, the same fill reverts with `PremiumBelowFloorAtFill` until the keeper cancels the order and lists a new one at the new floor, which uses one of the week's three listings. The keeper's extended fork rehearsal went through exactly this: after a 1.5% rise the fill was refused, the keeper relisted at the new floor, and a fill at the new price went through.
* **The strike can fall below the band.** At every fill the strike must still be at least 3% above spot at launch. For a 223 USDG strike that holds only while spot stays below about 216.50, again by the policy's arithmetic. Above that, every fill reverts with `StrikeBelowBand`, and no new price can fix it, because the strike belongs to the week's option type. That week sells no more calls unless spot falls back.

The band's upper bound is not checked again at a fill: after spot falls, the strike is further out of the money, which makes the call safer to sell.

Other reasons a fill can be refused: the sale window has closed (`WriteWindowClosed`), capacity has shrunk (`ContractsAboveUtilization`, `ContractsAboveCap`), writes are halted (`WritesAreHalted`), the Stock Token's oracle is paused (`OraclePaused`), the price feed is older than four days (`StalePrice`), Valorem's engine fee is on and not accepted (`ValoremFeeNotAccepted`), or the order has been cancelled, sold out or replaced. On your side: not enough USDG, a missing approval, USDG paused or your address frozen by USDG. The fill page names the reason its simulation hit. See the [FAQ](../resources/faq.md#why-was-my-fill-refused).

## Exercising

Exercise happens on the Valorem clearinghouse, not through Callhouse. The app does not send exercise transactions; use a block explorer's contract page or your own tooling.

1. Between the exercise timestamp and expiry, approve k × the strike in USDG to the clearinghouse. If its engine fee were switched on, add 15 bps of that amount.
2. Call `exercise(optionId, k)` on the clearinghouse. It burns your k option tokens, takes the USDG, and sends you k NVDA Stock Tokens.

An exercise before the exercise timestamp, or at or after expiry, reverts. A call not exercised by expiry is worthless. Whether exercising is worth it is your decision: you pay the strike for Stock Tokens worth whatever they are worth at that moment, and you need to be able to hold them under the issuer's terms.

Valorem spreads your exercise pro rata across everyone who wrote that option, which can include writers other than the vault. You receive the NVDA either way.

In the fork rehearsal, with spot set to 228 on the fork, a buyer approved 446 USDG to the clearinghouse and exercised 2 contracts at the 223 USDG strike.

## Who can buy, and with what account

* Callhouse is not available to US persons, and that includes buying the vault's calls.
* Your receiving address must accept ERC-1155 tokens. An ordinary wallet does. A contract must implement the ERC-1155 receiver hooks, and an address with an EIP-7702 delegation accepts only what its delegate's code allows; if it refuses, the fill reverts.
* A contract that fills cannot deposit into the vault in the same transaction. See [Depositing](../getting-started/depositing.md#a-deposit-inside-a-fill-is-refused).

## Related

* [How Callhouse works](../getting-started/how-it-works.md)
* [The weekly cycle](weekly-cycle.md)
* [Assignment](assignment.md)
* [Launch policy and hard caps](policy.md)

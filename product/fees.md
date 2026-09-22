# Fees

See how premium, taker, resale, and exercise fees affect a contract's cost and payout.

{% hint style="warning" %}
Stonkhouse v2 is unaudited. Interface v8 is deployed on Robinhood Chain 4663 from block 69,512,673 (22 September 2026); the launch markets are NVDA and SPCX. Registered markets can change; check the current app and on-chain status before trading. Operational services and market liquidity may be unavailable. Stock Tokens carry market and issuer risks. Buyers can lose their full cost; writers can lose collateral. Stonkhouse is not available to US persons. Read [Risks](../resources/risks.md) before using the product.
{% endhint %}

## Fee schedule

These are the **settings in force** on the current contracts, read on chain on 22 September 2026, not a live quote. The order book charges a 5% primary premium fee across every market it lists; each market is registered separately with a collateral rent rate of 0 parts per million and a 25-basis-point exercise fee. A role holder can change adjustable rates; check the live ticket, effective rates and pending changes before trading. On chain, `feeParams()` and `pendingFeeParams()` on the OrderBook return the book fees in force and any change already scheduled, and `market(underlying)` on the Clearinghouse returns a market's exercise fee and rent rate. Read them on the current contracts listed on the [Addresses](../protocol/addresses.md) page, not on the legacy set. A book-fee change carries two waits: the Admin Safe schedules it on the access manager and waits out the fee-manager lane, 48 hours at present and itself changeable with notice, and only then can the new schedule be announced on the book, where it takes a further 48 hours to take effect. A new schedule before activation replaces it and restarts the delay; scheduling the current rates cancels it. A change to a market's exercise fee or rent rate sits behind a separate 72-hour lane and applies to series created afterwards; a series keeps both rates pinned as they were when it was created. USDG has six decimal places; contract calculations round in base units.

The legacy interface-7 contracts keep their own settings: an 80 ppm mint rent on NVDA, a 0% primary premium fee and a 24-hour book-fee delay. None of that set's switches had been thrown at block 69,692,855 on 22 September 2026 — its NVDA market was still enabled, creation and minting were unpaused, trading was unpaused and no fee change was scheduled — so a fill that mints on the legacy book still pays that rent. Those numbers describe the legacy contracts only; read them on that set before acting on it. [Moving from v1](../legacy/moving-from-v1.md) covers v1 factory positions, not this set.

| Fee | Who pays and when | Default | Compiled limit |
|---|---|---|---|
| Collateral rent at mint | Writer whenever a fill mints a new long and short pair | Registered rate: 0 ppm, so no rent is charged | 0.5% of collateral per full seven days remaining |
| Primary premium fee | Seller when a fill creates new long and short tokens | 5% of premium | 10% of premium |
| Resale fee | Seller when an existing long is resold | 0% of premium | 10% of premium |
| Taker fee | Buyer hitting asks or seller hitting bids, **once per `take` call** | Smaller of 0.10 USDG and 10% of premium | Flat setting at most 1 USDG; cap at most 10% of premium |
| Maker rebate | Resting order's maker, paid **from** that call's taker fee | 50% of the maker-attributed fee | Never more than that taker fee |
| Exercise fee | In-the-money long holder at settlement, taken from the payout | 0.25% of collateral per unit | Rate at most 2% of collateral; actual fee at most 10% of gross payout |

Collateral rent is a rate the contracts keep and do not currently charge. Every market registered on the current contracts sets it to 0 ppm, so a mint costs you collateral and nothing else. The mechanism stays compiled in: rent would be charged **in the collateral asset** from the writer's free Clearinghouse balance when a fill mints, Stock Tokens for calls and USDG for puts, and closing matching long and short units before expiry would return the unused part. Switching a market's rate above zero is a fee change in the 72-hour lane, so you would see it on chain three days before it could reach a new series, and a series created before that keeps its pinned 0 ppm rate for its whole life. Read the rate on the ticket rather than assuming it is still zero.

New units are only ever minted **by a fill**. There is no separate mint step you can call before listing an ask, so writing costs you nothing until a buyer actually fills you, and a resting ask that never fills costs you nothing at all.

The exercise fee rate is pinned when a series is created. A later change affects new series only, and it sits behind the 72-hour market-fee lane. Book fees, including a resting order's seller fee, are those effective when `take` executes, so a fee change can activate between submission and inclusion; `TakeParams` carries both a price limit and a fee limit, `maxTotalFee`, and a take whose fee would exceed the limit you set reverts rather than paying the new rate. You can cancel or replace your resting order during the notice period. No exercise fee is taken from an out-of-the-money long's zero payout. Gas paid to the chain is separate from all table entries. There is no v2 manual exercise payment of the strike.

## Worked examples

**0.01-share ticket.** Buying one unit from an ask at 12.50 USDG a share costs **0.125 USDG** of premium, so the taker fee is the smaller of 0.10 and 10% × 0.125 = **0.0125 USDG**. The buyer pays **0.1375 USDG**, its maximum loss on the option; network gas is extra. The resting writer pays the 5% primary premium fee, **0.00625 USDG**, and is paid the maker rebate out of that call's taker fee, **0.00625 USDG**, so at this size the two cancel and the writer receives **0.125 USDG**. Do not read that as a free fill: the rebate is half of the taker fee, not half of the premium fee, and it stops covering the primary fee as soon as the premium is larger. The protocol keeps the remaining **0.0125 USDG**, which is the seller fee plus the taker fee less the rebate. A resale from existing inventory pays no primary fee at all.

**One-share ticket.** Buying 100 units across two asks, 99 units at 12.50 and one at 13.00, is **12.505 USDG** of premium in one `take` call, so the taker fee is the smaller of 0.10 and 10% × 12.505 = the flat **0.10 USDG**. The buyer pays **12.605 USDG**, its maximum loss on the option; network gas is extra. The first maker's 12.375 USDG of premium carries a 0.61875 USDG primary fee and earns 0.04948 USDG of rebate, so it receives **11.80573 USDG**; the second maker's 0.130 USDG carries 0.0065 and earns 0.00052, so it receives **0.12402 USDG**. The protocol keeps **0.67525 USDG**. Makers split the taker fee and its rebate in proportion to the premium each one filled, and a second `take` call incurs a second taker fee.

**In-the-money call.** For an illustrative one-share call with strike 200 USDG and final price 220 USDG, gross intrinsic value is about 20 USDG, paid from locked Stock Token collateral. At the default 0.25% exercise rate, the fee is 0.0025 Stock Token, worth about **0.55 USDG at that final price**. The long's net in-kind value is about **19.45 USDG** before any conversion. A routed USDG payout also bears the pool's swap fee and price impact. The conversion floor in force allows a 30 bps base shortfall plus that route's own fee, rounded up to whole basis points and counted at no more than 100 bps, capped at 300 bps in total; a failed conversion pays Stock Tokens instead. Read `maxPayoutSlippageBps()` on the Clearinghouse and `routeFeeBps(asset)` on the payout adapter for the bounds in force: on the launch routes they add 5 bps for NVDA and 100 bps for SPCX to that 30 bps base. Actual token rounding, conversion, and the position's purchase cost change its realised result.

Historical v1 charged a single 5% fee on the sale's ask through Seaport. The current shared market charges 5% of the premium on a first sale and nothing on a resale, plus the separate taker, rebate and settlement charges above; the legacy interface-7 market additionally charges collateral rent on every mint. An ask quote is **not** the buyer's all-in cost; a card and ticket include the taker fee, while a scenario payout is net of the exercise fee. A maker may independently choose a different ask. Fees the protocol keeps are not held by the book: see [Where fees go](where-fees-go.md).

## Related

* [Payoff cards](../buying/payoff-cards.md)
* [Where fees go](where-fees-go.md)
* [Order book](../market/order-book.md)
* [Accounting](../protocol/accounting.md)
* [Risks](../resources/risks.md)

# Fees

See how collateral rent, premium, taker, resale, and exercise fees affect a contract's cost and payout.

{% hint style="warning" %}
Stonkhouse v2 is unaudited. The chain-4663 contracts first deployed for the dev launch are the live public contract set. Only NVDA is registered; other markets remain planned. Operational services and market liquidity may be unavailable. Stock Tokens carry market and issuer risks. Buyers can lose their full cost; writers can lose collateral. Stonkhouse is not available to US persons. Read [Risks](../resources/risks.md) before using the product.
{% endhint %}

## Fee schedule

These are the **recorded v7 launch settings** for the live NVDA deployment, not a live quote. At registration, NVDA's mint rent was 80 parts per million of collateral per seven days remaining, the primary premium fee was 0%, and the exercise fee was 25 basis points. An admin can change adjustable rates; check the live ticket, effective rates, pending changes and [on-chain configuration](../protocol/addresses.md) before trading. A book-fee change is announced on chain and takes effect 24 hours later. A new schedule before activation replaces it and restarts the delay; scheduling the current rates cancels it. A market rent-rate change applies to series created afterwards; a series keeps the rate pinned when it was created. USDG has six decimal places; contract calculations round in base units.

| Fee | Who pays and when | Default | Compiled limit |
|---|---|---|---|
| Collateral rent at mint | Writer whenever a new long and short pair is minted, including a write-on-fill ask | NVDA launch rate: 80 ppm of locked collateral per seven days remaining | 0.5% of collateral per full seven days remaining |
| Primary premium fee | Seller when a fill creates new long and short tokens | Launch setting: 0% of premium | 10% of premium |
| Resale fee | Seller when an existing long is resold | 0% of premium | 10% of premium |
| Taker fee | Buyer hitting asks or seller hitting bids, **once per `take` call** | Smaller of 0.10 USDG and 10% of premium | Flat setting at most 1 USDG; cap at most 10% of premium |
| Maker rebate | Resting order's maker, paid **from** that call's taker fee | 50% of the maker-attributed fee | Never more than that taker fee |
| Exercise fee | In-the-money long holder at settlement, taken from the payout | 0.25% of collateral per unit | Rate at most 2% of collateral; actual fee at most 10% of gross payout |

Collateral rent is charged **in the collateral asset**, from the writer's free Clearinghouse balance on every mint: Stock Tokens for calls and USDG for puts. An unfilled write-on-fill ask pays no rent. A direct mint made before listing an existing long pays rent immediately, even if the long never sells. At a given token price, rent can be worth more than the premium from a cheap ask, so a 0% primary premium fee does not make writing free. Closing matching long and short units **before expiry** returns unused rent to whoever closes, in that same asset; the initial charge and refund can differ because time has passed and rounding differs. Closing at or after expiry returns no rent. Any rent still held when the series settles becomes a protocol fee. Transferring a short does not guarantee that its original writer receives a later refund.

The exercise fee rate is pinned when a series is created. A later admin change affects new series only. Book fees, including a resting order's seller fee, are those effective when `take` executes; a fee change can activate between submission and inclusion. `TakeParams` has a price limit but no fee limit. You can cancel or replace your resting order during the notice period. No exercise fee is taken from an out-of-the-money long's zero payout. Gas paid to the chain is separate from all table entries. There is no v2 manual exercise payment of the strike.

## Worked examples

**0.01-share ticket.** If its premium is 0.10 USDG, the taker fee is the smaller of 0.10 and 10% × 0.10 = **0.01 USDG**. The buyer pays **0.11 USDG**, its maximum loss on the option; network gas is extra. At the launch 0% primary premium fee, the resting writer receives **0.10 USDG** premium plus a possible default rebate of **0.005 USDG** from the taker fee. If this fill mints the option, the writer also pays collateral rent in Stock Tokens for a call or USDG for a put. That rent is separate from the buyer's 0.11 USDG cost. A resale seller would pay no resale fee at the planned setting.

**One-share ticket.** If the total premium across all filled asks is 2 USDG in one `take` call, the taker fee is the smaller of 0.10 and 10% × 2 = **0.10 USDG**. The buyer pays **2.10 USDG**, its maximum loss on the option; network gas is extra. A writer whose primary ask supplies the whole fill receives **2 USDG** premium at the launch 0% primary fee, plus a possible **0.05 USDG** default maker rebate. The writer separately needs enough free collateral for the mint and its rent. Several makers split the fee and rebates according to their filled premium; a second `take` call incurs a second taker fee.

**In-the-money call.** For an illustrative one-share call with strike 200 USDG and final price 220 USDG, gross intrinsic value is about 20 USDG, paid from locked Stock Token collateral. At the default 0.25% exercise rate, the fee is 0.0025 Stock Token, worth about **0.55 USDG at that final price**. The long's net in-kind value is about **19.45 USDG** before any conversion. A routed USDG payout also bears the pool's swap fee and price impact. The protocol's planned launch conversion floor allows a 30 bps base shortfall plus that route's pool fee, capped at 300 bps total; a failed conversion pays Stock Tokens instead. Actual token rounding, conversion, and the position's purchase cost change its realised result.

Historical v1 charged a single 5% fee on the sale's ask through Seaport. The live v7 shared market has collateral rent and the separate book, taker, rebate, and settlement charges above. An ask quote is **not** the buyer's all-in cost; a card and ticket include the taker fee, while a scenario payout is net of the exercise fee. Writer rent does not increase buyer cost by itself; a maker may independently choose a different ask.

## Related

* [Payoff cards](../buying/payoff-cards.md)
* [Order book](../market/order-book.md)
* [Accounting](../protocol/accounting.md)
* [Risks](../resources/risks.md)

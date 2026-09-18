# Accounting

Every long and short is funded when minted. This page shows interface v7 collateral-rent rules alongside locked collateral, fees and payouts.

{% hint style="warning" %}
Stonkhouse v2 is unaudited. The chain-4663 contracts first deployed for the dev launch are the live public contract set. Only NVDA is registered; other markets remain planned. Operational services and market liquidity may be unavailable. Stock Tokens carry market and issuer risks. Buyers can lose their full cost; writers can lose collateral. Stonkhouse is not available to US persons. Read [Risks](../resources/risks.md) before using the product.
{% endhint %}

Where the prose and the code disagree, the code is the specification. The settlement examples below are tested by `V2DocsNumbersTest`; their settlement maths is unchanged by v7 rent. Rent is charged at mint, refunded before expiry and accrued at settlement. The final reviewed revision, production registry rates, consumer projections and deployment still need verification. USDG has six decimals; prices and strikes are USDG base units per whole share. One option unit is 0.01 share.

## Where value lives

| Balance | Holder |
|---|---|
| Deposited free USDG or Stock Tokens, locked collateral, rent held until close or settlement, accrued exercise and rent fees | `Clearinghouse` |
| Bid USDG, resale long tokens and failed USDG payments in `owed` | `OrderBook` |
| Treasury bounty and reward budgets | `KeeperRewards` and `RewardsDistributor` |
| Market-making inventory | `MakerVault` |
| Premium on a fill | Paid directly to makers and the fee recipient; it does not enter the Clearinghouse. |

A call locks `1e16` Stock Token base units per option unit. A put at strike `K` locks `K / 100` USDG base units per unit. In v7, `mint` also debits collateral rent from the writer's free ledger in the **same asset**. The rent is held separately from locked collateral, so it does not reduce the long or short settlement amounts. `close` burns a matched pair and returns its collateral to the closer's free ledger. Before expiry it also returns the unused rent for those units; at or after expiry there is no rent refund.

Rent is rounded up when minted: `ceil(locked collateral × series fee rate × seconds to expiry / (1,000,000 × 604,800))`. The unused portion returned before expiry is rounded down using the remaining seconds and capped by the rent still held for that series. Each series pins its market's fee rate when first created. The initial charge can exceed the later refund because time passed and the two operations round differently. A short may be transferred; the refund belongs to whoever brings matching long and short units together and closes. Rent left in the series becomes an accrued protocol fee only when `settle` runs. Per asset, the intended accounting identity is: contract balance = free balances + locked collateral + held rent + accrued fees.

## A book trade

For a `take` touching one or more orders, the book uses:

```text
premium_i   = price_i × units_i / 100
premium     = sum(premium_i)
takerFee    = min(takerFeeFlat, floor(premium × takerFeeCapBps / 10,000))
sellerFee_i = floor(premium_i × (primary ? premiumFeeBps : resaleFeeBps) / 10,000)
rebate_i    = floor(takerFeeShare_i × makerRebateBps_i / 10,000)
```

The taker pays the fee once per `take`, even across levels. Each maker receives its premium less seller fee plus its rebate. The fee recipient receives seller fees and the taker fee less rebates. The rebate comes out of the taker fee; it is not an added buyer charge. The launch settings are 0% primary seller fee, 0% resale seller fee, `min(0.10 USDG, 10% of premium)` taker fee and a 50% maker share of the taker fee. A writer separately pays rent when new units are minted, including direct mints and write-on-fill trades. A changed book-fee schedule takes effect 24 hours after the admin announces it; these examples use the proposed settings, not a promise about later fills.

**Micro ticket.** One unit of a 210 call at 12.50 costs 0.125 USDG premium. The taker fee is 0.0125, so the buyer pays **0.1375 USDG**. At the launch 0% primary fee and 50% rebate share, the maker receives **0.13125 USDG** and the book's fee recipient receives **0.00625 USDG**. The maker's 0.01 share of Stock Token collateral locks on the fill, and its rent is debited separately in Stock Tokens. The amount of that rent depends on the series' pinned rate and time remaining.

**One-share ticket.** A single 100-unit take fills 99 units at 12.50 and one at 13.00. Premium totals 12.505 USDG, one flat taker fee is 0.10, and the buyer pays **12.605 USDG**. At the launch 0% primary fee and 50% rebate share, makers receive **12.555 USDG** in total and the book's fee recipient receives **0.05 USDG**. Each maker that mints pays rent separately in its collateral asset. Splitting the take into two calls would incur two taker fees.

## Settlement and redemption

For settlement price `P`, strike `K`, collateral `c` and the exercise fee rate pinned at series creation:

```text
call gross = P > K ? floor(1e16 × (P − K) / P) : 0       Stock Token base units
put gross  = P < K ? floor((K − P) / 100) : 0            USDG base units
fee        = gross == 0 ? 0 : min(floor(c × bps / 10,000), floor(gross × 1,000 / 10,000))
long       = gross − fee
short      = c − gross
long + fee + short = c
```

The call gross is paid in Stock Tokens before any optional conversion to USDG. The short receives the collateral remainder. The fee leaves only the long's side; an out-of-the-money long pays no exercise fee. The Clearinghouse stores the per-unit amounts once, then `redeem` burns a holder's tokens and pays their amount. A failed transfer credits the free ledger. For an in-the-money call long, default USDG conversion must meet the protocol's configured settlement-value conversion floor or the payout falls back to Stock Tokens. The protocol sets the base shortfall bound; it is not a per-holder setting.

```text
value     = floor(owed Stock Token base units × P / 1e18)      USDG base units
routeBps  = min(adapter.routeFeeBps(asset), 100)                0 if the read fails
floorBps  = min(base slippage bps + routeBps, 300)
minOut    = floor(value × (10,000 − floorBps) / 10,000)         USDG base units
```

The adapter reports the route's Uniswap pool fee rounded up to basis points. The route fee is a swap execution cost, not a Stonkhouse protocol charge. A missing route or a failed swap pays in kind.

**In-the-money settlement.** At a tested 221.70 USDG average, a 210 call's one-unit gross is `527,740,189,445,196` Stock Token base units. The 25 bps exercise fee is `25,000,000,000,000`; the long gets `502,740,189,445,196` and the short `9,472,259,810,554,804`. Those three amounts sum to the `1e16` locked. For 100 units, the long's payout is worth 11.145749 USDG at settlement. With the planned 30 bps launch base and an NVDA 0.05% pool route (5 bps), the effective bound is 35 bps and `minOut` is **11.106738 USDG**. A 0.30% route gives 60 bps and 11.078874 USDG; a 1% route gives 130 bps and 11.000854 USDG. Below the applicable floor, the holder receives Stock Tokens instead. The short's 100-unit remainder is worth 210 USDG at that price.

`V2DocsNumbersTest` also tests an explicitly configured **100 bps** base with a mock adapter that reports zero route fee. Its minimum for the same 11.145749 USDG value is **11.034291 USDG**. That is a test vector, not the planned launch setting. A successful real swap can return more than its minimum.

The indexer's position history reports redemption in USDG-equivalent value for comparisons with purchase cost and resale proceeds. If a call paid Stock Tokens in kind, it values those tokens at the series' settlement price; that reported value is not a USDG transfer and a later sale may receive a different price. A position sold partly before expiry combines actual USDG resale proceeds with the later redemption value. See [Wins and leaderboard](../market/wins-and-leaderboard.md).

For a 230 put at the same 221.70 price, each unit's `2,300,000` USDG collateral divides into `77,250` for the long, `5,750` exercise fee and `2,217,000` for the short. All three sum exactly to collateral.

## Rounding and fees

| Calculation | Rounding |
|---|---|
| Premium | Exact on the required price grid (multiples of 100 base units). |
| Rent at mint and refund before expiry | Mint charge rounds up; unused-rent refund rounds down in the collateral asset. |
| Seller fee, capped taker fee, rebates | Floor. The last fill takes any remainder of the taker-fee share, so shares sum to the fee. |
| Call and put gross | Floor. `long + fee + short` still equals collateral exactly because long and short are differences. |
| Exercise fee | Both rate and 10%-of-gross cap floor. A very small gross can pay zero. |
| USDG conversion value and minimum output | Floor; the Clearinghouse checks the actual recipient balance change. |

The v7 compiled market-rent ceiling is 5,000 parts per million of locked collateral per seven days remaining; each market's final registry and deployed rate still require verification. Admin-set book-fee ceilings remain 10% for premium and resale fees, 2% for the exercise fee rate (also at most 10% of gross), 1 USDG for the flat taker fee, 10% for its premium cap, and 3% for the combined conversion shortfall. A book-fee change is announced 24 hours before it takes effect; a resting order uses the fees effective when taken. Market rent changes reach only new series. No protocol fee is charged on deposits, withdrawals, transfers, order placement or cancellation, or redemption itself. A mint pays rent; close may return unused rent before expiry; settlement moves remaining rent to accrued fees. Keeper bounties come from treasury funds. A Uniswap conversion has no protocol fee, but its pool fee and price impact can reduce the USDG received within the conversion floor.

## Related

* [Fees](../product/fees.md)
* [Series and tokens](series-and-tokens.md)
* [Oracle and settlement](oracle-and-settlement.md)
* [Roles](roles.md)

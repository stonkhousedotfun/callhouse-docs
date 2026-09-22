# Accounting

Every long and short is funded when it is minted by a fill. This page shows locked collateral, fees, payouts and the collateral-rent dial the contracts keep at zero.

{% hint style="warning" %}
Stonkhouse v2 is unaudited. Interface v8 is deployed on Robinhood Chain 4663 from block 69,512,673 (22 September 2026); the launch markets are NVDA and SPCX. Registered markets can change; check the current app and on-chain status before trading. Operational services and market liquidity may be unavailable. Stock Tokens carry market and issuer risks. Buyers can lose their full cost; writers can lose collateral. Stonkhouse is not available to US persons. Read [Risks](../resources/risks.md) before using the product.
{% endhint %}

Where the prose and the code disagree, the code is the specification. The examples below are tested by `V2DocsNumbersTest`, and their numbers are that test's. Collateral rent is a compiled mechanism with its registered rate at 0 ppm, so no example here charges any; where rent appears it describes what a non-zero rate would do. The registered rates on this page were read from the current contracts on Robinhood Chain 4663 on 22 September 2026, at block 69,689,857; the legacy contracts carry their own rates and are not described here. USDG has six decimals; prices and strikes are USDG base units per whole share. One option unit is 0.01 share.

## Where value lives

| Balance | Holder |
|---|---|
| Deposited free USDG or Stock Tokens, locked collateral, any rent held until close or settlement, accrued exercise and rent fees | `Clearinghouse` |
| Bid USDG, resale long tokens and failed USDG payments in `owed` | `OrderBook` |
| Treasury bounty and reward budgets | `KeeperRewards` and `RewardsDistributor` |
| Market-making inventory | `MakerVault` |
| Premium on a fill | Paid directly to makers and the fee recipient, which is the `FeeSplitter`; it does not enter the Clearinghouse. |
| Protocol fees pulled from the book and the Clearinghouse, and the buyback reserve a distribution sets aside | `FeeSplitter`. Each distribution sends the treasury share to the Treasury Safe and keeps the rest in the splitter; a separate `buyback` call spends that reserve. [Where fees go](../product/where-fees-go.md) describes the mechanism and what has and has not run on chain. |
| Depositor USDG and Stock Tokens the house quotes with, queued deposits and unclaimed withdrawals | A market's `HouseVault`, one per market. Its own free and locked balances sit in the `Clearinghouse` like any other account's. |
| Earn deposits | `EarnVault`. Its order escrow sits in the `OrderBook` and its collateral in the `Clearinghouse` like any other account's. |

A call locks `1e16` Stock Token base units per option unit. A put at strike `K` locks `K / 100` USDG base units per unit. Units are minted only by a fill, and at a market's registered 0 ppm rate the mint debits collateral and nothing else. Were the rate non-zero, the mint would also debit rent from the writer's free ledger in the **same asset**, held separately from locked collateral so that it does not reduce the long or short settlement amounts. `close` burns a matched pair and returns its collateral to the closer's free ledger. Before expiry it also returns the unused rent for those units; at or after expiry there is no rent refund.

Rent, when a market's rate is non-zero, is rounded up at the mint: `ceil(locked collateral × series fee rate × seconds to expiry / (1,000,000 × 604,800))`. The unused portion returned before expiry is rounded down using the remaining seconds and capped by the rent still held for that series. Each series pins its market's fee rate when first created. The initial charge can exceed the later refund because time passed and the two operations round differently. A short may be transferred; the refund belongs to whoever brings matching long and short units together and closes. Rent left in the series becomes an accrued protocol fee only when `settle` runs. Per asset, the intended accounting identity is: contract balance = free balances + locked collateral + held rent + accrued fees.

## A book trade

For a `take` touching one or more orders, the book uses:

```text
premium_i   = price_i × units_i / 100
premium     = sum(premium_i)
takerBase   = min(takerFeeFlat, floor(premium × takerFeeCapBps / 10,000))
takerFee    = takerBase − floor(takerBase × discountBps / 10,000)
sellerFee_i = floor(premium_i × (primary ? premiumFeeBps : resaleFeeBps) / 10,000)
rebate_i    = floor(takerFeeShare_i × makerRebateBps_i / 10,000)
```

The taker pays the fee once per `take`, even across levels. Each maker receives its premium less seller fee plus its rebate. The fee recipient receives seller fees and the taker fee less rebates. The rebate comes out of the taker fee; it is not an added buyer charge. The registered settings are a 5% primary seller fee, a 0% resale seller fee, a `min(0.10 USDG, 10% of premium)` taker fee and a 50% maker share of the taker fee. New units are minted only by a fill, and at the registered 0 ppm rate that mint charges no rent. A changed book-fee schedule takes effect 48 hours after it is announced on chain; these examples use the registered settings, not a promise about later fills. `discountBps` is the taker's discount from the book's optional fee-discount module, read once per `take` and once per `quoteTake`, and the contracts cap it at 5,000, so a module can never remove more than half the taker fee. No module is registered on the current book — `OrderBook.discountModule()` returns the zero address — so `discountBps` is 0 and every example on this page charges the undiscounted fee. Registering one is a fee-manager change that waits out the access manager's 48-hour lane. A discount reduces only the taker fee, and with it the maker rebates and the fee recipient's share; the premium and the seller fee are untouched.

**Micro ticket.** One unit of a 210 call at 12.50 costs 0.125 USDG premium. The taker fee is 0.0125, so the buyer pays **0.1375 USDG**. At the 5% primary fee and 50% rebate share, the maker pays a 0.00625 seller fee and earns a 0.00625 rebate, so it receives **0.125 USDG** and the `FeeSplitter` receives **0.0125 USDG**. The two cancel only at this size, because the rebate is a share of the taker fee and the seller fee is a share of the premium. The maker's 0.01 share of Stock Token collateral locks on the fill.

**One-share ticket.** A single 100-unit take fills 99 units at 12.50 and one at 13.00. Premium totals 12.505 USDG, one flat taker fee is 0.10, and the buyer pays **12.605 USDG**. At the 5% primary fee and 50% rebate share the 99-unit maker receives **11.80573 USDG** and the one-unit maker **0.12402 USDG**, so makers receive **11.92975 USDG** in total and the `FeeSplitter` receives **0.67525 USDG**. Splitting the take into two calls would incur two taker fees.

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

The call gross is paid in Stock Tokens before any optional conversion to USDG. The short receives the collateral remainder. The fee leaves only the long's side; an out-of-the-money long pays no exercise fee. The Clearinghouse stores the per-unit amounts once, then `redeem` burns a holder's tokens and pays their amount. A failed transfer credits the free ledger. For an in-the-money call long, default USDG conversion must meet the protocol's conversion floor or the payout falls back to Stock Tokens. That floor is not valued at the settlement price alone: it uses the higher of the settlement price and the oracle's current spot whenever the oracle can supply one. Without one, only the holder, its operator, or any caller within 30 minutes of expiry converts at the settlement price, and a later third-party redemption pays in kind. The protocol sets the base shortfall bound; it is not a per-holder setting.

```text
F         = max(P, spot)   when the series oracle returns an ok spot: the first source's last print,
                           accepted while it is at most 30 minutes old, or older while a second
                           source agrees with it inside the market's deviation band (150 bps on both
                           launch markets), or, with no usable second source, while it is inside the
                           market's spot age (25 hours on both launch markets). A paused token or an
                           unreadable source counts as no spot.
          = P              with no ok spot, when the caller is the holder or its operator, or when
                           now is at most 30 minutes past expiry
          = no conversion  otherwise; the payout is Stock Tokens in kind
value     = floor(owed Stock Token base units × F / 1e18)      USDG base units
routeBps  = min(adapter.routeFeeBps(asset), 100)               0 if the read fails
floorBps  = min(base slippage bps + routeBps, 300)
minOut    = floor(value × (10,000 − floorBps) / 10,000)        USDG base units
```

The adapter is the `PayoutRouter`. For a Uniswap v3 route it reports the pool's fee tier rounded up to whole basis points; for a Uniswap v4 route it reports the pool's own fee plus its protocol fee in the selling direction, rounded up the same way. An answer above 100 bps counts as 100. The route fee is a swap execution cost, not a Stonkhouse protocol charge. A missing route or a failed swap pays in kind.

**In-the-money settlement.** At a tested 221.70 USDG average, a 210 call's one-unit gross is `527,740,189,445,196` Stock Token base units. The 25 bps exercise fee is `25,000,000,000,000`; the long gets `502,740,189,445,196` and the short `9,472,259,810,554,804`. Those three amounts sum to the `1e16` locked. For 100 units, the long's payout is worth 11.145749 USDG at that settlement price, but the floor is not valued there. In the same test the feed's last print is 222.40, seventeen minutes old and above the settlement average, so `F` is 222.40 and the value the floor works from is 11.180941 USDG. With the deployed 30 bps base — `maxPayoutSlippageBps()` reads 30 on the Clearinghouse — and NVDA's Uniswap v4 payout route, which the router reports at 5 bps, the effective bound is 35 bps and `minOut` is **11.141807 USDG**. SPCX's route is a 1% v4 pool and reports the 100 bps maximum, so its bound is 130 bps and its minimum 11.035588 USDG; a route reporting 30 bps would give 60 bps and 11.113855 USDG. Below the applicable floor, the holder receives Stock Tokens instead. The short's 100-unit remainder is worth 210 USDG at that price.

`V2DocsNumbersTest` also tests an explicitly configured **100 bps** base with a mock adapter that reports no route fee. Its asserted minimum for that redemption is **11.069131 USDG**, taken from the same 11.180941 USDG spot valuation rather than from the settlement-price figure. That one is the test's own assertion; the 35, 60 and 130 bps minimums above are the same arithmetic at the same value. A 100 bps base is a test vector, not the deployed base, and a successful real swap can return more than its minimum.

The indexer's position history reports redemption in USDG-equivalent value for comparisons with purchase cost and resale proceeds. If a call paid Stock Tokens in kind, it values those tokens at the series' settlement price; that reported value is not a USDG transfer and a later sale may receive a different price. A position sold partly before expiry combines actual USDG resale proceeds with the later redemption value. See [Wins and leaderboard](../market/wins-and-leaderboard.md).

For a 230 put at the same 221.70 price, each unit's `2,300,000` USDG collateral divides into `77,250` for the long, `5,750` exercise fee and `2,217,000` for the short. All three sum exactly to collateral.

## Rounding and fees

| Calculation | Rounding |
|---|---|
| Premium | Exact on the required price grid (multiples of 100 base units). |
| Rent at mint and refund before expiry, at a non-zero rate | Mint charge rounds up; unused-rent refund rounds down in the collateral asset. |
| Seller fee, capped taker fee, rebates | Floor. The last fill takes any remainder of the taker-fee share, so shares sum to the fee. |
| Call and put gross | Floor. `long + fee + short` still equals collateral exactly because long and short are differences. |
| Exercise fee | Both rate and 10%-of-gross cap floor. A very small gross can pay zero. |
| USDG conversion value and minimum output | Floor; the Clearinghouse checks the actual recipient balance change. |

The compiled market-rent ceiling is 5,000 parts per million of locked collateral per seven days remaining, and every market registered on the current contracts sets the rate itself to 0: NVDA and SPCX both read 0 ppm on chain on 22 September 2026, and the default a new registration copies is 0 as well. Book-fee ceilings remain 10% for premium and resale fees, 2% for the exercise fee rate (also at most 10% of gross), 1 USDG for the flat taker fee, 10% for its premium cap, and 3% for the combined conversion shortfall. A book-fee change is announced 48 hours before it takes effect; a resting order uses the fees effective when taken, and a taker can cap what it will pay with `TakeParams.maxTotalFee`. A change to a market's exercise fee or rent rate waits 72 hours and then reaches only new series. No protocol fee is charged on deposits, withdrawals, transfers, order placement or cancellation, or redemption itself. Keeper bounties come from treasury funds. A Uniswap conversion has no protocol fee, but its pool fee and price impact can reduce the USDG received within the conversion floor.

## Related

* [Fees](../product/fees.md)
* [Where fees go](../product/where-fees-go.md)
* [Series and tokens](series-and-tokens.md)
* [Oracle and settlement](oracle-and-settlement.md)
* [Roles](roles.md)

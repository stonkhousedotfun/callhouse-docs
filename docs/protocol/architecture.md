# Architecture

Follow a v2 contract from a shared series to a payout. The contracts hold your collateral and option tokens; the indexer, app and bots read or call them but hold no user funds.

{% hint style="warning" %}
Stonkhouse v2 is unaudited. Interface v8 is deployed on Robinhood Chain 4663 from block 69,512,673 (22 September 2026); the launch markets are NVDA and SPCX. Registered markets can change; check the current app and on-chain status before trading. Operational services and market liquidity may be unavailable. Stock Tokens carry market and issuer risks. Buyers can lose their full cost; writers can lose collateral. Stonkhouse is not available to US persons. Read [Risks](../resources/risks.md) before using the product.
{% endhint %}

{% hint style="danger" %}
One `AccessManager` guards every privileged call on every contract below. Every delayed role sits with one 2-of-3 Admin Safe; a 2-of-3 Treasury Safe receives the protocol's money and holds no role at all. All three signing keys of each Safe are the owner's, so the threshold protects against one stolen key rather than giving independent custody. The guardian, pricer, quoter and buyback roles are hot keys with no waiting period at all, the Admin Safe also holds the guardian and quoter roles with no delay, and the operations role that grants them has none either. Read [Roles](roles.md) before you rely on any of these controls.
{% endhint %}

Where the prose and the code disagree, the code is the specification. Contract behaviour below follows the public `callhouse-contracts/src/v2/` source, and the deployed set was built from release `70dd0c7`.

## Components

```text
buyer or writer ── OrderBook ── Clearinghouse ── collateral and ERC-1155 tokens
      │                 │               │
      │                 │               ├── ExpiryCalendar
      │                 │               ├── SettlementOracle ── Chainlink / Uniswap v3 pool
      │                 │               └── PayoutRouter ── Uniswap v3 or v4 route, one per Stock Token
      │                 └── MakerRegistry
      └── AutoRoller ── OrderBook

depositor ── HouseVault, one per market ── OrderBook and Clearinghouse
      └── EarnVault ── OrderBook

AccessManager ── every privileged call on every contract above

book and exercise fees, and the vaults' fee shares ── FeeSplitter ── Treasury Safe
                                                          └── buyback reserve ── V4BuybackExecutor ── Uniswap v3, then Uniswap v4 ── burn

keepers ── snapshot / finalize / settle / prune / redeem / roll / cancel stale / distribute
             └── KeeperRewards pays eligible calls from treasury USDG
buyback key ── FeeSplitter.buyback, which is role-gated and not a keeper call
```

| Contract | What it holds or does |
|---|---|
| `AccessManager` | Maps each privileged function of each contract to a role, and records who holds that role and how long they wait between scheduling a call and executing it. It holds no tokens. See [Roles](roles.md). |
| `Clearinghouse` | Holds deposited USDG and Stock Tokens, free balances, locked collateral, any rent held until close or settlement, and accrued exercise and rent fees. Creates series and mints transferable long and short ERC-1155 tokens, and only an allowlisted minter may mint. Settles and redeems them. |
| `OrderBook` | Holds USDG backing bids, longs backing resale asks and failed USDG payments in `owed`. A write-on-fill ask locks collateral only when filled. |
| `SettlementOracle` | Pins settlement sources and rules when the first series of an expiry is created, then stores one price and status per underlying and expiry. It holds no tokens. Chainlink round history and a recorded Uniswap v3 window are its enabled sources. |
| `ExpiryCalendar` | Validates 16:00 New York session-day expiries and stores holidays and special expiries. |
| `AutoRoller` | Stores each writer's strategy and current order. It holds no collateral. |
| `PayoutRouter` | Holds one route to USDG per Stock Token, over a Uniswap v3 pool or a pinned hookless Uniswap v4 pool, and converts an eligible in-the-money call payout through it. Both launch markets were registered with Uniswap v4 routes, so a market's payout route is not its settlement pool. The `FeeSplitter` converts Stock Token fees through the same router. It holds nothing between calls; the Clearinghouse measures the USDG that reaches its own balance against the conversion floor before it pays the holder. It replaces the interface-7 `UniV3PayoutAdapter`. |
| `KeeperRewards` | Holds treasury USDG for bounded bounties. Lifecycle calls still work if it cannot pay, and it held no USDG at the 22 September 2026 check, so it pays nothing until the treasury funds it. |
| `MakerVault`, `MakerRegistry`, `RewardsDistributor` | Hold treasury market-making inventory, rebate tiers and weekly reward funds or roots. They do not hold user collateral. |
| `FeeSplitter` | The fee recipient of the `OrderBook` and the `Clearinghouse`, and the destination of the vaults' fee shares. On `distribute`, which anyone may call, it sells Stock Token fees for USDG through the `PayoutRouter` under an oracle floor, sends the treasury share to the Treasury Safe in the same call and keeps the rest, half at launch, as a buyback reserve. It holds undistributed fees and that reserve; no user balance sits in it. See [Where fees go](../product/where-fees-go.md). |
| `V4BuybackExecutor` | Spends a piece of that reserve when the buyback key calls `FeeSplitter.buyback`: USDG to WETH on a Uniswap v3 pool, then ETH to STONKHOUSE on one pinned Uniswap v4 pool, after which the splitter burns what it bought. Only the splitter may call it, its route is fixed at deployment and it holds nothing between calls. |
| `HouseVaultFactory` | Deploys one `HouseVault` per market under the listing role and keeps the index of them. It holds nothing. A new vault cannot quote until the admin role maps its functions, which waits 48 hours; every depositor path works from the moment it exists. |
| `HouseVault` | The user-funded market maker, one per market and deployed for NVDA and SPCX. Holds depositors' USDG and Stock Tokens against ERC-20 shares, quotes on the book through the quoter key inside on-chain limits, and prices deposits and withdrawals only at a weekly epoch boundary. No role can send its assets to an address of its choosing: a shareholder's own claim and the performance fee to the `FeeSplitter` are the only ways anything leaves. Neither launch vault had its protocol accounts confirmed at the 22 September 2026 check, so neither takes an order yet. |
| `EarnVault` | Holds depositors' USDG against ERC-20 shares, can park the idle balance in a configured venue and rest write-on-fill asks on the book as the maker of record, with the book pulling assets back just in time. Its fee is charged on realised gain and goes to the `FeeSplitter`. At the 22 September 2026 check no venue adapter is set and book funding is off. |

`DataStreamsSource` is deployed but configured for no market, pending owner access. `Hedger`, the lender `RewardsDistributor` and `StockVenueAdapter` are in the source and are not deployed. Pyth Pro is outside v2.0. The app, indexer, pricing service and cranker are off-chain readers and callers, not custodians.

## Life of a contract

Let `E` be expiry at 16:00 New York on an NYSE session day. All times below are compiled or checked by `ExpiryCalendar`.

| When | What happens |
|---|---|
| From 45 days to 1 hour before `E` | Anyone may create a valid series. Its oracle, exercise fee and collateral-rent rate are pinned; the first series for its underlying and expiry also pins the settlement sources and rules. A failed source pin prevents that first creation or adoption after Clearinghouse migration; later series on the same pinned expiry reuse the settlement pin. |
| Until `E − 30 minutes` | You may deposit and post a write-on-fill ask; the book mints the long and short pair when a buyer fills it. The book also trades existing longs. |
| From `E − 30 minutes` to `E` | No new units may be minted. Bids and resale asks can still fill. |
| At `E` | Book trading ends. A holder of both sides may still `close` until settlement. |
| `E` to `E + 10 minutes` | Anyone may snapshot the pool's exact final 30-minute window. |
| From `E + 2 minutes` | Anyone may ask the oracle to finalise. Corroborated sources finalise at once; one source or disagreement starts a delay. |
| After the price is final | Anyone may settle each series, prune escrowed orders and redeem eligible holders through separate transactions. A failed transfer becomes a free-ledger credit. |

The `LifecycleTest` contract in `callhouse-contracts/test/v2/` runs this path for calls and puts, including in- and out-of-the-money outcomes.

## External trust

These examples of external controls were checked on chain 4663 on 22 September 2026, against the current deployment. Role holders, token controls and pool conditions can change after that observation; verify their current state before relying on them.

| Party | Power or dependency | Protection and limit |
|---|---|---|
| Chainlink feed owner | A 4-of-9 Safe (`0xeE27D5Ae494300902D90454e8630A3F1C68c9C52`) owns both launch feed proxies and can switch the NVDA or SPCX feed aggregator. | The source rejects stale, malformed and large-jump rounds. A usable pool can corroborate; otherwise a candidate waits. |
| Uniswap pools | Traders can move a pool's price and liquidity can leave. The settlement pools are NVDA/USDG `0xd4EB21209C4D6093f80B5b84f5C45cc093EA14a3` and SPCX/USDG `0xc61284332117c3FB23A2A56cceFFD07F7aF60029`. Each market's payout route is a separate pool, a Uniswap v4 pool for both at that check, and not the settlement pool. | A minimum-liquidity gate applies; disagreement waits for a veto window. A separate conversion floor includes the payout route's pool fee. |
| Stock Token issuer | Can pause, blocklist, burn, change multiplier or upgrade token logic. | A contract cannot force the issuer to reverse those actions. Withdrawals and payouts can wait in the ledger while transfers fail. |
| USDG issuer | Can pause, freeze, wipe or burn USDG. | Put collateral, bids, owed balances and payouts depend on USDG remaining transferable and backed. |
| Robinhood Chain sequencer | Orders or censors transactions; no on-chain uptime feed is available. | A missed snapshot leaves a single-source candidate; an outage can delay every user action. |

## Things that can look wrong

- **An in-the-money call can pay Stock Tokens.** USDG conversion is attempted by default. The protocol sets a base shortfall bound and adds the route's pool fee, subject to a total ceiling. A failed swap or a swap below that floor pays in kind; you can also choose in kind.
- **A single-source price waits.** The candidate waits for the market's pinned uncorroborated delay. This gives the guardian time to veto; no settlement occurs while the candidate is pending.
- **The UTC close shifts.** 16:00 New York is 20:00 UTC in daylight saving time and 21:00 UTC in standard time. The series expires at the local session close.
- **Premium is not in the Clearinghouse.** The book pays the seller and fee recipient during a fill. The Clearinghouse holds collateral and exercise fees, and holds mint rent, if a market charges any, until a pre-expiry close refunds part of it or settlement accrues the rest.

## Related

* [Series and tokens](series-and-tokens.md)
* [Roles](roles.md)
* [Oracle and settlement](oracle-and-settlement.md)
* [Accounting](accounting.md)
* [Security](security.md)

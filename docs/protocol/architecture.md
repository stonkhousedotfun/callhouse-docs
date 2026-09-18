# Architecture

Follow a v2 contract from a shared series to a payout. The contracts hold your collateral and option tokens; the indexer, app and bots read or call them but hold no user funds.

{% hint style="warning" %}
Stonkhouse v2 is unaudited. The chain-4663 contracts first deployed for the dev launch are the live public contract set. Only NVDA is registered; other markets remain planned. Operational services and market liquidity may be unavailable. Stock Tokens carry market and issuer risks. Buyers can lose their full cost; writers can lose collateral. Stonkhouse is not available to US persons. Read [Risks](../resources/risks.md) before using the product.
{% endhint %}

Where the prose and the code disagree, the code is the specification. Contract behaviour below follows the public `callhouse-contracts/src/v2/` source.

## Components

```text
buyer or writer ── OrderBook ── Clearinghouse ── collateral and ERC-1155 tokens
      │                 │               │
      │                 │               ├── ExpiryCalendar
      │                 │               ├── SettlementOracle ── Chainlink / Uniswap v3
      │                 │               └── PayoutAdapter ── Uniswap v3 router
      │                 └── MakerRegistry
      └── AutoRoller ── OrderBook

keepers ── snapshot / finalize / settle / prune / redeem / roll
             └── KeeperRewards pays eligible calls from treasury USDG
```

| Contract | What it holds or does |
|---|---|
| `Clearinghouse` | Holds deposited USDG and Stock Tokens, free balances, locked collateral, rent held until close or settlement, and accrued exercise and rent fees. Creates series and mints transferable long and short ERC-1155 tokens. Settles and redeems them. |
| `OrderBook` | Holds USDG backing bids, longs backing resale asks and failed USDG payments in `owed`. A write-on-fill ask locks collateral only when filled. |
| `SettlementOracle` | Pins settlement sources and rules when the first series of an expiry is created, then stores one price and status per underlying and expiry. It holds no tokens. Chainlink round history and a recorded Uniswap v3 window are its enabled sources. |
| `ExpiryCalendar` | Validates 16:00 New York session-day expiries and stores holidays and special expiries. |
| `AutoRoller` | Stores each writer's strategy and current order. It holds no collateral. |
| `UniV3PayoutAdapter` | Converts an eligible in-the-money call payout into USDG. It holds nothing between calls; the Clearinghouse checks what the holder received. |
| `KeeperRewards` | Holds treasury USDG for bounded bounties. Lifecycle calls still work if it cannot pay. |
| `MakerVault`, `MakerRegistry`, `RewardsDistributor` | Hold treasury market-making inventory, rebate tiers and weekly reward funds or roots. They do not hold user collateral. |

`DataStreamsSource` is built but disabled for every market pending owner access. Pyth Pro is outside v2.0. The app, indexer, pricing service and cranker are off-chain readers and callers, not custodians.

## Life of a contract

Let `E` be expiry at 16:00 New York on an NYSE session day. All times below are compiled or checked by `ExpiryCalendar`.

| When | What happens |
|---|---|
| From 45 days to 1 hour before `E` | Anyone may create a valid series. Its oracle, exercise fee and deployed v7 rent rate are pinned; the first series for its underlying and expiry also pins the settlement sources and rules. A failed source pin prevents that first creation or adoption after Clearinghouse migration; later series on the same pinned expiry reuse the settlement pin. |
| Until `E − 30 minutes` | You may deposit and mint a long and short pair, or post a write-on-fill ask. The book also trades existing longs. |
| From `E − 30 minutes` to `E` | No new units may be minted. Bids and resale asks can still fill. |
| At `E` | Book trading ends. A holder of both sides may still `close` until settlement. |
| `E` to `E + 10 minutes` | Anyone may snapshot the pool's exact final 30-minute window. |
| From `E + 2 minutes` | Anyone may ask the oracle to finalise. Corroborated sources finalise at once; one source or disagreement starts a delay. |
| After the price is final | Anyone may settle each series, prune escrowed orders and redeem eligible holders through separate transactions. A failed transfer becomes a free-ledger credit. |

The `LifecycleTest` contract in `callhouse-contracts/test/v2/` runs this path for calls and puts, including in- and out-of-the-money outcomes.

## External trust

These examples of external controls were checked on chain 4663 on 17 September 2026. Role holders, token controls and pool conditions can change after that observation; verify their current state before relying on them.

| Party | Power or dependency | Protection and limit |
|---|---|---|
| Chainlink feed owner | A 4-of-9 Safe (`0xeE27D5Ae494300902D90454e8630A3F1C68c9C52`) can switch the NVDA or TSLA feed aggregator. | The source rejects stale, malformed and large-jump rounds. A usable pool can corroborate; otherwise a candidate waits. |
| Uniswap v3 pool | Traders can move its price and liquidity can leave. The observed NVDA/USDG pool is `0xd4EB21209C4D6093f80B5b84f5C45cc093EA14a3`. | A minimum-liquidity gate applies; disagreement waits for a veto window. A separate conversion floor includes the payout route's pool fee. |
| Stock Token issuer | Can pause, blocklist, burn, change multiplier or upgrade token logic. | A contract cannot force the issuer to reverse those actions. Withdrawals and payouts can wait in the ledger while transfers fail. |
| USDG issuer | Can pause, freeze, wipe or burn USDG. | Put collateral, bids, owed balances and payouts depend on USDG remaining transferable and backed. |
| Robinhood Chain sequencer | Orders or censors transactions; no on-chain uptime feed is available. | A missed snapshot leaves a single-source candidate; an outage can delay every user action. |

## Things that can look wrong

- **An in-the-money call can pay Stock Tokens.** USDG conversion is attempted by default. The protocol sets a base shortfall bound and adds the route's pool fee, subject to a total ceiling. A failed swap or a swap below that floor pays in kind; you can also choose in kind.
- **A single-source price waits.** The default uncorroborated delay is six hours. It gives the guardian time to veto; no settlement occurs while the candidate is pending.
- **The UTC close shifts.** 16:00 New York is 20:00 UTC in daylight saving time and 21:00 UTC in standard time. The series expires at the local session close.
- **Premium is not in the Clearinghouse.** The book pays the seller and fee recipient during a fill. The Clearinghouse holds collateral and exercise fees; deployed v7 also holds mint rent until a pre-expiry close refunds part of it or settlement accrues the rest.

## Related

* [Series and tokens](series-and-tokens.md)
* [Oracle and settlement](oracle-and-settlement.md)
* [Accounting](accounting.md)
* [Security](security.md)

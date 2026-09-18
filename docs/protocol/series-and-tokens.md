# Series and tokens

Each v2 series has one expiry, strike and type. Every writer and buyer of that series shares the same long and short token IDs.

{% hint style="warning" %}
Stonkhouse v2 is unaudited. The chain-4663 contracts first deployed for the dev launch are the live public contract set. Only NVDA is registered; other markets remain planned. Operational services and market liquidity may be unavailable. Stock Tokens carry market and issuer risks. Buyers can lose their full cost; writers can lose collateral. Stonkhouse is not available to US persons. Read [Risks](../resources/risks.md) before using the product.
{% endhint %}

Where the prose and the code disagree, the code is the specification. See `callhouse-contracts/src/v2/interfaces/V2Ids.sol`, `Clearinghouse.sol` and `docs/V2-ARCHITECTURE.md` §1.3.

## Identity and size

A series is `(underlying, isPut, strike, expiry)`. The underlying is a registered 18-decimal Stock Token. Strike and order prices are USDG base units (six decimals) per whole share. Expiry is a Unix timestamp at 16:00 New York on a session day.

```text
longId  = uint256(keccak256(abi.encode(underlying, isPut, strike, expiry))) & ~1
shortId = longId | 1
```

The low bit is zero for the long and one for the short. `createSeries` checks the stored tuple if an ID already exists and rejects a collision. `InterfaceIdsTest` checks the formula against the shared ID fixtures.

| Size | ERC-1155 units | Call collateral | Put collateral at strike 230 USDG |
|---|---:|---:|---:|
| 0.01 share | 1 | `1e16` Stock Token base units | 2.30 USDG |
| 0.1 share | 10 | `1e17` base units | 23 USDG |
| 1 share | 100 | `1e18` base units | 230 USDG |

The call locks `1e16` Stock Token base units per unit. The put locks `strike / 100` USDG base units per unit. Both are fully funded when minted. In the deployed v7 design, the writer also needs free collateral for the mint's time-based rent. That charge stays outside the locked amount used to calculate payouts.

## What each side owns

- **Long.** A transferable claim to the series' settlement payout. Longs from different writers are fungible.
- **Short.** A transferable claim to the collateral left after the long's gross payout. It carries no later cash call because all collateral is locked at mint. Its per-unit value after settlement is `collateralPerUnit − grossPayoutPerUnit`.

Both sides are ordinary ERC-1155 tokens and remain transferable under protocol pauses. The OrderBook trades longs. You can transfer shorts directly. The admin can change the metadata base URI, so do not use a wallet label as proof of the series tuple.

## Mint, close and redeem

`mint` moves collateral and the deployed v7 rent from a writer's free ledger and mints one long and one short per unit. A write-on-fill ask does this inside the fill; merely listing it locks no collateral and charges no rent. The series pins its market rent rate when created. Before settlement, if you hold both sides, `close` burns equal units and returns their full locked collateral to your free ledger. Closing **before expiry** also returns the unused rent for those units to the closer. You can close after expiry until the series settles, but that late close gets no rent refund. At settlement, any rent still held becomes an accrued protocol fee.

At settlement the oracle's shared price fixes long, fee and short amounts per unit. `redeem` burns your balance and pays the resulting amount; anyone may call it for a holder who has not opted out of third-party redemption. A short can be worth the whole collateral on an out-of-the-money call. An in-the-money covered-call short retains Stock Tokens worth roughly the strike at the settlement price, subject to base-unit rounding.

## Related

* [Deposits and collateral](../writing/deposits-and-collateral.md)
* [Oracle and settlement](oracle-and-settlement.md)
* [Accounting](accounting.md)
* [Order book](../market/order-book.md)

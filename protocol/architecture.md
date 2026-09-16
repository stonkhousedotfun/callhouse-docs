# Architecture

Stonkhouse is an isolated-account covered-call product on Robinhood Chain (chain id 4663). The factory clones one account per user. Each account holds **that** user's NVDA, lists its own 1-lot Seaport orders, and writes into Valorem only inside a buyer's fill. Premium is paid to the owner's wallet on the fill. Off-chain services support it: a keeper, an indexer, and a web app. None of them holds or can move depositor funds.

This page covers the components, the Seaport zone hooks, and the behaviours integrators most often misread. Money maths is on [Accounting](accounting.md), permissions are on [Roles and admin powers](roles.md), and addresses are on [Contracts and addresses](addresses.md).

{% hint style="warning" %}
The factory is live on Robinhood Chain (deployed 2026-09-15) and has had no external audit. Admin is one hot key with no timelock.
{% endhint %}

Source paths refer to the `callhouse-contracts` repository (`src/solo/`, `src/Policy.sol`, `src/lib/`) unless marked as the app repository. Where the prose and the code disagree, the code is the specification.

{% hint style="info" %}
**History.** The first live product was a pooled ERC-20 vault (`src/Vault.sol`, symbol `cNVDA`) at `0x88a98931E3682137E7e4D3426f623247f4A4ecbb`. It is closed. Collect leftover redemptions at `app.stonkhouse.fun/collect`. Earlier still, designs listed through Overcall. The live factory does none of that.
{% endhint %}

## Components

```
  owner wallet
   NVDA in / idle NVDA out / premium USDG in on fill / strike USDG claimed
        |
        v
+------------------------------------------------------------------+
| WriterAccount  (clone of src/solo/Account.sol)                   |
|   holds that user's NVDA                                         |
|   is the Seaport offerer AND zone of its own 1-lot orders        |
|   write-on-fill: 1 NVDA per authorizeOrder                       |
+-----+-------------------------+-----------------------+----------+
      |                         ^                       |
      | write (inside a fill),  | authorizeOrder /      | reads spot
      | redeem the claim        | validateOrder         | (list, fill)
      v                         | (Seaport calls these) v
 Valorem Clear              Seaport 1.6            Chainlink RHNVDA/USD
 (collateral, option        (validate, cancel,     AggregatorProxy
  ERC-1155, claim NFT)       counter; buyers fill)

 factory (src/solo/AccountFactory.sol)
   clones, week, policy, roles, pending[] / live[]
```

### Factory and account

`AccountFactory` is AccessControl. It deploys one `WriterAccount` implementation, locks it, and clones it per `createAccount`. Immutables (asset, USDG, Clear, Seaport, feed, conduit key, factory) live on the implementation. Each clone stores `owner` and a unique `index` starting at 1.

`Policy` is compiled into the account bytecode as a library of pure checks. `ValoremLib` is a linked public library, reached by `DELEGATECALL`, so `address(this)` inside it is the clone.

### External contracts

| Contract | Role | Trust notes |
|---|---|---|
| Valorem Clear | Holds written collateral, mints the option ERC-1155 and the claim NFT, settles exercise | Each account is the writer and keeps its own claim NFT. Assignment is per option type. Types are unique per account because expiry includes `index`. The Clear has no owner, no pause and no proxy; `feeTo` holds the 15 bps engine fee switch |
| Seaport 1.6 | Marketplace. Each account is offerer and zone of its lots | Orders are `FULL_RESTRICTED`, 1 contract, validated on chain. Seaport calls `authorizeOrder` before transfers and `validateOrder` after |
| Chainlink RHNVDA/USD | Spot for the OTM band and premium floor at `list` and at every fill | Display plus a gate. Settlement never reads a price |

### Off-chain services

**Keeper.** Hot EOA with `KEEPER_ROLE`. Sets the factory week (strike, timestamps, ask), calls `listFor` on pending writers, and does not hold tokens. Factory weeks are priced from spot (5% OTM, 0.40% ask floored at 1 USDG), not Cboe vol mode.

**Indexer.** Reads events. Holds no keys.

**Web app.** `app.stonkhouse.fun`. `/account` deposits, offers, settles, collects. `/book` buys and exercises. Connect lists only MetaMask and Phantom.

**Alerts.** Logged by the keeper, not delivered to any channel.

## Write on fill

`list` posts N validated 1-lot orders and reserves N NVDA. It writes nothing.

On fill, `authorizeOrder`:

1. checks the order is a live listing of this account, offer is 1 option token, consideration USDG totals the pinned ask, first recipient is `owner`
2. drops that order from `liveListing`, reduces `reserved` by 1 lot
3. `ValoremLib.writeOnFill` writes 1 NVDA
4. `validateOrder` reverts if any option token stayed in the account

Premium never enters the clone: Seaport pays the owner and the fee recipient directly.

## Unique option types

```
expiryTs = factory.week.baseExpiryTs + account.index
```

Same strike and exercise for the week; expiry offset so Valorem buckets cannot mix Stonkhouse writers.

## Settle

After `listedExpiryTs`, anyone may `settle()`. Leftover orders are cancelled via `incrementCounter`, reserved NVDA unlocks, and a written claim is redeemed if Valorem allows. If redeem fails, the listing is still cleared; call `settle` again later.

## Things that look wrong but are not

1. **Premium does not show in the account.** It went to the owner's wallet on the fill. The account's USDG is strike proceeds (and anything else sent there).
2. **Idle NVDA is not for sale.** Only `requestedLots` that were listed can fill or assign.
3. **A later `setWeek` cannot move a listed account.** Terms are pinned on `list`.
4. **Anyone can `settle` after expiry.** That is how a stopped keeper cannot trap reserved NVDA.
5. **The implementation is a clone target, not a wallet.** `lockImplementation` ran in the factory constructor.

## Related

* [Accounting](accounting.md)
* [Roles and admin powers](roles.md)
* [The weekly cycle](../product/weekly-cycle.md)

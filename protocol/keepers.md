# Keepers

Anyone may advance the v2 lifecycle with an ordinary funded account. A lifecycle keeper holds no protocol role and cannot move another holder's payout to itself. One flywheel step is the exception: the buyback needs the `BUYBACK` role, so it is not a call anyone can make.

{% hint style="warning" %}
Stonkhouse v2 is unaudited. Interface v8 is deployed on Robinhood Chain 4663 from block 69,512,673 (22 September 2026); the launch markets are NVDA and SPCX. Registered markets can change; check the current app and on-chain status before trading. Operational services and market liquidity may be unavailable. Stock Tokens carry market and issuer risks. Buyers can lose their full cost; writers can lose collateral. Stonkhouse is not available to US persons. Read [Risks](../resources/risks.md) before using the product.
{% endhint %}

Where the prose and the code disagree, the code is the specification. See `callhouse/keeper/src/v2/cranker/` and the public v2 contract source.

## Calls anyone can make

| Call | Work and repeat behaviour | Bounty |
|---|---|---|
| `Clearinghouse.createSeries` | Creates a valid missing series; returns the existing ID on repeat. | None |
| `SettlementOracle.snapshot` | Records each available source. A repeat returns zero new recordings. The pool must be recorded in the first 10 minutes after expiry. | SNAPSHOT when a source first records and the expiry has open interest. |
| `SettlementOracle.finalize` | Captures or advances the shared expiry price; a pending or held expiry returns `(false, 0)`. Already-final returns the same result. | FINALIZE for an advance with open interest, except when the Clearinghouse calls it. |
| `Clearinghouse.settle` | Stores one series' long, fee and short amounts after the oracle finalises, and accrues any rent still held. Repeat returns false. | SETTLE if the series has long supply. |
| `OrderBook.prune` | Cancels expired orders and returns bid USDG or escrowed resale longs; skips live, filled and cancelled orders. | None |
| `Clearinghouse.redeem` or `redeemBatch` | Burns and pays a holder's balance after settlement. A zero balance is a no-op; a batch skips holders that opt out of third-party redemption. | REDEEM per non-zero payout worth at least `minRedeemPayout` (1 USDG at deployment). |
| `AutoRoller.roll` | Closes an old position and, if a strategy is active and the session is open, places its next ask; repeat with nothing to advance returns false. | ROLL if enough units are placed; internal SETTLE and REDEEM bounties pass to the caller. |
| `AutoRoller.cancelStale` | Cancels the unfilled tracked auto-roll ask after a fresh oracle spot reaches its strike; returns false if no eligible ask or spot exists. Anyone may call it, even when new trading is paused. | CANCEL_STALE bounty only when enough unfilled units are cancelled. |
| `Clearinghouse.sweepFees` | Sends accrued exercise fees and settled rent to the fee recipient, which is the `FeeSplitter`; no-op with none. | None |
| `FeeSplitter.claimOrderBookFees` | Pulls the splitter's own `owed` USDG out of the OrderBook; returns zero when nothing is owed or no book is configured. | None |
| `FeeSplitter.distribute` | Converts one asset the splitter holds into USDG where a route exists, then divides it between buying back the token and the treasury; a paused splitter reverts and a dust balance is skipped with an event rather than a revert. | DISTRIBUTE |
| `HouseVault.rollEpoch` | Closes a house vault's epoch once every series it touched is settled and that expiry's price is final, pays the performance fee to the `FeeSplitter` and prices the queued deposits and withdrawals. It refuses while the vault still holds an option or has a live order. | None |

When treasury USDG funds `KeeperRewards`, the protocol may pay bounties bounded to at most 1 USDG per action and by its funded balance and rolling daily cap. The bounty actions are SNAPSHOT, FINALIZE, SETTLE, REDEEM, ROLL, CANCEL_STALE, DISTRIBUTE and BUYBACK. `KeeperRewards` deploys with a daily cap of zero; the deployment then sets a rolling daily cap of 100 USDG and per-action bounties of 0.05 USDG for SNAPSHOT, FINALIZE, SETTLE and ROLL, 0.02 USDG for REDEEM and CANCEL_STALE, and 0 for DISTRIBUTE and BUYBACK. The live contract carries those values and holds no USDG, so it pays nothing until the treasury funds it; its balance was zero on 22 September 2026. The fee role can change the cap and the bounties after its 48-hour wait. A failed or empty bounty never blocks settlement. Bounties are sized near gas cost, not promised income.

## An expiry's cadence

1. At about `E + 60 seconds`, call `snapshot` while the pool's window can still be recorded.
2. From `E + 120 seconds`, call `finalize`. If it returns Pending, read `candidate.finalizableAt` and retry then.
3. Call `settle` for every series of that expiry.
4. Prune expired bids and resale asks before redeeming holders. The OrderBook's escrow opts out of third-party redemption, so its longs must return to makers first.
5. Call `redeemBatch` over long and short holders; revisit failed or opted-out holders only when they permit it.

The v2 cranker software can create expiry ladders, roll enabled writer strategies, sweep fees, send a house vault's `rollEpoch` when its epoch boundary is due and, when the flywheel step is switched on and a fee splitter is configured, claim and distribute fees. It checks eligible stale auto-roll asks before other work on each tick; this still cannot prevent a buyer from filling first. During a session's first 30 minutes, a roll needs an oracle spot printed in that session. Afterwards, a still-fresh pre-open spot can suffice if the oracle accepts it. Fixed transaction gas limits for source calls need review: an overly tight gas estimate can let the outer oracle call succeed while an inner source runs out of gas. **This page does not promise that a cranker is running against any contract set, now or later. Even a cranker that creates series is not evidence that snapshot, price finalisation, settlement or redemption ran for a particular expiry: read the on-chain state of the expiry you care about, and use the permissionless calls yourself if nothing has advanced it.**

## Run your own cranker

The `callhouse/keeper/Dockerfile` builds one image for v1 and v2 modes. These instructions describe an independent operator-run process, not a guarantee of any service's health. The v2 cranker reads `V2_MODE=cranker`, the chain RPC, the deployment registry and an ordinary `CRANKER_PK`. Obtain a funded key for chain 4663; it needs gas funds and no protocol role. Only the buyback step is different: it needs the `BUYBACK` role, which an independent cranker does not hold. Keep the key in a local, untracked environment file, not in an image or command history. The image bakes in the registry committed in the revision you build, `ops/markets/tier1.json`. At the current revision that registry declares `v2.interfaceVersion` 8 and names the current contracts, the ones the [Addresses](addresses.md) page lists, so this recipe cranks the current set. A registry declaring any other interface version is refused at boot, including the legacy registry `ops/markets/v7-legacy.json`; cranking the legacy contracts means building the revision that shipped them, which this page does not cover. A local fork needs either its own registry at the same interface version, baked in with the `V2_REGISTRY_FILE` build argument and `V2_REGISTRY_PATH` set to match, or explicit `V2_*` addresses together with `V2_CONTRACTS_FROM_ENV=1`.

```sh
# From the callhouse repository root, after placing your private values in keeper-v2.env:
docker build -f keeper/Dockerfile -t stonkhouse-keeper .
docker run --rm --env-file keeper-v2.env \
  -v stonkhouse-cranker-db:/data -p 8792:8792 stonkhouse-keeper
```

Your environment file supplies `V2_MODE=cranker`, `RH_RPC`, `CRANKER_PK`, `V2_REGISTRY_PATH=/app/ops/markets/tier1.json`, `CRANKER_PORT=8792` and `CHAIN_ID=4663`. That path is the baked registry; do not mount another copy over it. Set `RH_RPC_2` for a backup read endpoint and `INDEXER_URL` for the v2 indexer; without the indexer, the cranker scans logs. The cranker needs the `clearinghouse`, `orderBook`, `settlementOracle` and `expiryCalendar` addresses and takes them from the baked registry. `V2_CLEARINGHOUSE`, `V2_ORDER_BOOK`, `V2_SETTLEMENT_ORACLE` and `V2_EXPIRY_CALENDAR` are read when you set them, but a value that disagrees with the registry is refused at boot unless you also set `V2_CONTRACTS_FROM_ENV=1`. That switch is for a fork or a deliberate override at the same interface version; it is not a way to point this image at an earlier interface version's contracts, which it cannot call correctly. `autoRoller` is optional; roll work is skipped without it. The flywheel step has its own switch: it is off unless you set `CRANKER_FLYWHEEL_ENABLED=1`, and `CRANKER_BUYBACK_DRY_RUN=1` probes the buyback without sending it. `feeSplitter` is optional in the same way as `autoRoller`: with the step off, or with `V2_FEE_SPLITTER` empty, the cranker runs every other step and skips claiming, distributing and buying back. With the step on, an independent cranker still claims and distributes but cannot buy back, because the buyback needs the `BUYBACK` role; it reports `refused: no BUYBACK role` instead. The ladder step creates series only for markets the registry marks `live`; the snapshot, finalise, settle, prune and redeem steps follow the series that already exist on chain from the registry's `deployBlock`, whatever the registry's per-market status says. Mount a persistent database volume so restarts retain the transaction journal.

The bot's `/health` and `/state` endpoints report readiness and progress. Use `pnpm --filter @callhouse/keeper v2:dryrun` to preview decisions before live sending. See `callhouse/ops/v2-env.mjs` for the rendered variable names and `callhouse/keeper/src/v2/config.ts` for validation.

## Related

* [Architecture](architecture.md)
* [Oracle and settlement](oracle-and-settlement.md)
* [Roles](roles.md)
* [Security](security.md)

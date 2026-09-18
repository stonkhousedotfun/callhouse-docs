# Keepers

Anyone may advance the v2 lifecycle with an ordinary funded account. A keeper holds no protocol role and cannot move another holder's payout to itself.

{% hint style="warning" %}
Stonkhouse v2 is unaudited. The chain-4663 contracts first deployed for the dev launch are the live public contract set. Only NVDA is registered; other markets remain planned. Operational services and market liquidity may be unavailable. Stock Tokens carry market and issuer risks. Buyers can lose their full cost; writers can lose collateral. Stonkhouse is not available to US persons. Read [Risks](../resources/risks.md) before using the product.
{% endhint %}

Where the prose and the code disagree, the code is the specification. See `callhouse/keeper/src/v2/cranker/` and the public v2 contract source.

## Calls anyone can make

| Call | Work and repeat behaviour | Bounty |
|---|---|---|
| `Clearinghouse.createSeries` | Creates a valid missing series; returns the existing ID on repeat. | None |
| `SettlementOracle.snapshot` | Records each available source. A repeat returns zero new recordings. The pool must be recorded in the first 10 minutes after expiry. | SNAPSHOT when a source first records and the expiry has open interest. |
| `SettlementOracle.finalize` | Captures or advances the shared expiry price; a pending or held expiry returns `(false, 0)`. Already-final returns the same result. | FINALIZE for an advance with open interest, except when the Clearinghouse calls it. |
| `Clearinghouse.settle` | Stores one series' long, fee and short amounts after the oracle finalises; deployed v7 also accrues any rent still held. Repeat returns false. | SETTLE if the series has long supply. |
| `OrderBook.prune` | Cancels expired orders and returns bid USDG or escrowed resale longs; skips live, filled and cancelled orders. | None |
| `Clearinghouse.redeem` or `redeemBatch` | Burns and pays a holder's balance after settlement. A zero balance is a no-op; a batch skips holders that opt out of third-party redemption. | REDEEM per non-zero payout worth at least `minRedeemPayout` (1 USDG at deployment). |
| `AutoRoller.roll` | Closes an old position and, if a strategy is active and the session is open, places its next ask; repeat with nothing to advance returns false. | ROLL if enough units are placed; internal SETTLE and REDEEM bounties pass to the caller. |
| `AutoRoller.cancelStale` | Cancels the unfilled tracked auto-roll ask after a fresh oracle spot reaches its strike; returns false if no eligible ask or spot exists. Anyone may call it, even when new trading is paused. | CANCEL_STALE bounty only when enough unfilled units are cancelled. |
| `Clearinghouse.sweepFees` | Sends accrued exercise fees and settled rent to the fee recipient; no-op with none. | None |

When treasury USDG funds `KeeperRewards`, the protocol may pay bounties bounded to at most 1 USDG per action and by its funded balance and rolling daily cap. At the recorded dev launch, that budget was empty. A failed or empty bounty never blocks settlement. Bounties are sized near gas cost, not promised income.

## An expiry's cadence

1. At about `E + 60 seconds`, call `snapshot` while the pool's window can still be recorded.
2. From `E + 120 seconds`, call `finalize`. If it returns Pending, read `candidate.finalizableAt` and retry then.
3. Call `settle` for every series of that expiry.
4. Prune expired bids and resale asks before redeeming holders. The OrderBook's escrow opts out of third-party redemption, so its longs must return to makers first.
5. Call `redeemBatch` over long and short holders; revisit failed or opted-out holders only when they permit it.

The v2 cranker software can create expiry ladders, roll enabled writer strategies and sweep fees. Its deployed v7 flow checks eligible stale auto-roll asks before other work on each tick; this still cannot prevent a buyer from filling first. During a session's first 30 minutes, a roll needs an oracle spot printed in that session. Afterwards, a still-fresh pre-open spot can suffice if the oracle accepts it. Fixed transaction gas limits for source calls need review: an overly tight gas estimate can let the outer oracle call succeed while an inner source runs out of gas. **The production cranker came online at 05:49 UTC on 18 September 2026 and created 18 NVDA series in [transaction `0x522d…1ff9`](https://robinhoodchain.blockscout.com/tx/0x522d2900ba8ef536b95a55844948a19594d137618faf796fe9d34f10ea0e1ff9), block 65987622. This proves series creation, not automated snapshot, price finalisation, settlement or redemption. Monitor the 18 September 20:00 UTC expiry and use permissionless calls if the bot does not advance it.**

## Run your own cranker

The `callhouse/keeper/Dockerfile` builds one image for v1 and v2 modes. The production cranker was online at the 18 September 2026 05:49 UTC check; these instructions describe an independent operator-run process, not a guarantee of future service health. The v2 cranker reads `V2_MODE=cranker`, the chain RPC, the deployment registry and an ordinary `CRANKER_PK`. Obtain a funded key for chain 4663; it needs gas funds but no `KEEPER_ROLE`. Keep the key in a local, untracked environment file, not in an image or command history. The published [Addresses](addresses.md) identify the live contracts; a local fork still needs its own registry or explicit `V2_*` addresses.

```sh
# From the callhouse repository root, after placing your private values in keeper-v2.env:
docker build -f keeper/Dockerfile -t stonkhouse-keeper .
docker run --rm --env-file keeper-v2.env \
  -v stonkhouse-cranker-db:/data -p 8792:8792 stonkhouse-keeper
```

Your environment file supplies `V2_MODE=cranker`, `RH_RPC`, `CRANKER_PK`, `V2_REGISTRY_PATH=/app/ops/markets/tier1.json`, `CRANKER_PORT=8792` and `CHAIN_ID=4663`. The image bundles that registry. Set `RH_RPC_2` for a backup read endpoint and `INDEXER_URL` for the v2 indexer; without the indexer, the cranker scans logs. The registry must contain live `clearinghouse`, `orderBook`, `settlementOracle` and `expiryCalendar` addresses, or supply their `V2_CLEARINGHOUSE`, `V2_ORDER_BOOK`, `V2_SETTLEMENT_ORACLE` and `V2_EXPIRY_CALENDAR` overrides. `autoRoller` is optional; roll work is skipped without it. Mount a persistent database volume so restarts retain the transaction journal.

The bot's `/health` and `/state` endpoints report readiness and progress. Use `pnpm --filter @callhouse/keeper v2:dryrun` to preview decisions before live sending. See `callhouse/ops/v2-env.mjs` for the rendered variable names and `callhouse/keeper/src/v2/config.ts` for validation.

## Related

* [Architecture](architecture.md)
* [Oracle and settlement](oracle-and-settlement.md)
* [Roles](roles.md)
* [Security](security.md)

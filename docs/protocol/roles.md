# Roles

Every privileged call on the current contracts goes through one `AccessManager`, which gives each role its own waiting period between scheduling a change and executing it. The eleven lanes below are live on Robinhood Chain 4663 today. You can still close, cancel, withdraw and redeem under the protocol's pause switches, subject to external token behaviour. The legacy interface-7 contracts have no `AccessManager`: each one carries its own admin role on a single key with no waiting period, and they are still on chain, so treat their roles as a separate set — see [Addresses](addresses.md).

{% hint style="warning" %}
Stonkhouse v2 is unaudited. Interface v8 is deployed on Robinhood Chain 4663 from block 69,512,673 (22 September 2026); the launch markets are NVDA and SPCX. Registered markets can change; check the current app and on-chain status before trading. Operational services and market liquidity may be unavailable. Stock Tokens carry market and issuer risks. Buyers can lose their full cost; writers can lose collateral. Stonkhouse is not available to US persons. Read [Risks](../resources/risks.md) before using the product.
{% endhint %}

{% hint style="danger" %}
Every delayed role is held by one 2-of-3 **Admin Safe**. A second 2-of-3 **Treasury Safe** receives the protocol's money and holds no role at all. **All three signing keys of each Safe are the owner's**, so the 2-of-3 threshold is a protection against a single key being stolen, not independent custody by separate parties. Four roles are deliberately instant and sit on hot keys: the guardian, which pauses, vetoes, cancels scheduled changes and sets house-vault limits; the pricer; the quoter; and the buyback role, held by the protocol's lifecycle cranker key. The Admin Safe also holds the guardian and quoter roles with no delay, so it can brake and close vault positions without waiting, and it holds the operations role that grants and revokes the hot keys, also with no delay. A compromised hot key can therefore be rotated within a block, and two of the owner's three keys can grant a new one just as fast.

What a delay does and does not buy you: a change is visible on chain for its waiting period before it can be executed, and the guardian can cancel a scheduled fee, configuration, treasury or listing change inside that window. The guardian **cannot** cancel a scheduled role or mapping change; those belong to the admin role, which waits 48 hours and is the one lane with no external brake. The deploy refuses to hand the admin role to anything that is not a canonical Safe with a threshold of at least two across at least three owners, no enabled module and no transaction guard, and it checks that the Safe holds the admin role at the expected 48-hour delay with no pending change to that delay. The launch verifier reads both Safes the same way. The protocol contracts never read a Safe again after that hand-over, so treat 2-of-3 as an operational arrangement rather than something they enforce. Check current role grants on chain rather than relying on any published record.

The first series pins that expiry's settlement configuration, and each series pins its own exercise fee and rent rate when created, so a later configuration change cannot reach it. A stuck expiry can still be resolved by the configuration role from 48 hours after expiry, and after seven days a held expiry with exactly one recorded usable price can be resolved within 0.8× to 1.25× that price. Treat compromise or misuse of any key as a risk to new positions and unresolved payouts. No caller is exempt from a vault's outflow cap, the Safes included. The maker vault's treasury lane is not counted against it because those withdrawals can only pay the Treasury Safe.
{% endhint %}

Where the prose and the code disagree, the code is the specification. The tables below describe the role lanes, their compiled waiting periods and who holds each one today. Holders can change: read them from the `AccessManager` on chain, and take the addresses from [Addresses](addresses.md).

## Role lanes and their delays

| Role | Id | Waiting period | Granted and revoked by | Cancelled by | What it can do |
|---|---|---|---|---|---|
| `ADMIN` | `0` | 48 hours | `ADMIN` | the Admin Safe alone | Grant and revoke every other role, and change which role guards which function. No other role can cancel a scheduled change in this lane. |
| `FEE_MANAGER` | `1` | 48 hours | `ADMIN` | `GUARDIAN` or the Admin Safe | Schedule book fees (`OrderBook.setFeeParams`), the maker registry and the fee-discount module, keeper bounty amounts and the daily cap, maker rebate tiers, and the fee splitter's burn share, buyback cap and conversion slippage. |
| `MARKET_FEE_MANAGER` | `2` | 72 hours | `ADMIN` | `GUARDIAN` or the Admin Safe | Change a market's exercise fee and collateral-rent rate (`setMarketFees`, `setDefaultMarketFees`) for series created afterwards. |
| `CONFIG_ADMIN` | `3` | 24 hours | `ADMIN` | `GUARDIAN` or the Admin Safe | Change oracles and price sources, the calendar, the minter allowlist, the payout adapter and its routes, the keeper-rewards contract, who may request a bounty, a house vault's protocol accounts and oracle, the earn vault's funding switches, and `adminResolve` for a stuck expiry. |
| `TREASURY_ADMIN` | `4` | 24 hours | `ADMIN` | `GUARDIAN` or the Admin Safe | Move and bound treasury money: fee recipients, maker-vault limits and withdrawals to the Treasury Safe, a house vault's performance fee, the earn vault's skim share and adapter, reward roots, and the splitter's treasury, router, executor, oracle and token wiring. |
| `LISTING` | `5` | 1 hour | `ADMIN` | `GUARDIAN` or the Admin Safe | Register and list or unlist markets, set the redemption threshold and token metadata, holidays and special expiries, the minimum roll size, and create house vaults. |
| `OPS_ADMIN` | `6` | none | `ADMIN` | — | Grant and revoke the guardian, pricer, quoter and buyback keys. Hot-key rotation is instant on purpose. |
| `GUARDIAN` | `7` | none | `OPS_ADMIN` | — | Pause and veto, set a house vault's quoting limits with no delay by design, and cancel a scheduled change in the fee, market-fee, configuration, treasury or listing lanes. |
| `PRICER` | `8` | none | `OPS_ADMIN` | — | Reprice a smart-pricing auto-roll ask inside that writer's own band. |
| `QUOTER` | `9` | none | `OPS_ADMIN` | — | Trade the maker, house and earn vault inventory within the vaults' guards. |
| `BUYBACK` | `10` | none | `OPS_ADMIN` | — | Call the fee splitter's buyback, under its per-call cap and cooldown. |

A waiting period is the time between scheduling a call and being allowed to execute it, so a lane with no waiting period has nothing scheduled to cancel. For book fees there are two waits in series: the 48-hour fee lane before the change can be sent at all, and then the compiled 48-hour on-chain notice before it affects a fill.

The ids are the `AccessManager`'s own `uint64` labels. These contracts have no per-contract `hasRole(bytes32,address)` function; that call reverts, and the legacy set is the one that answers it.

## Who holds the lanes

| Holder | Roles held | What that means |
|---|---|---|
| 2-of-3 Admin Safe | `ADMIN`, `FEE_MANAGER`, `MARKET_FEE_MANAGER`, `CONFIG_ADMIN`, `TREASURY_ADMIN`, `LISTING` and `OPS_ADMIN`, plus `GUARDIAN` and `QUOTER` at no delay | Every delayed lane sits here, and so does an instant brake. All three of its signing keys are the owner's. |
| 2-of-3 Treasury Safe | None | It is the payee, not an operator: the splitter, keeper rewards, the maker vault and the rewards distributor can only pay it. It cannot call a restricted function. All three of its signing keys are the owner's. |
| Guardian hot key | `GUARDIAN` | Pauses, vetoes, cancels a scheduled change and sets house-vault limits, all with no delay. |
| Pricer hot key | `PRICER` | Reprices a smart-pricing auto-roll ask inside that writer's band. |
| Quoter hot key | `QUOTER` | Quotes and trades vault inventory inside the vaults' guards. |
| Cranker hot key | `BUYBACK` | Runs the fee splitter's buyback under its cap and cooldown. |
| Deploying key | None | The deploy renounced the admin role after handing it to the Admin Safe, so the key that created these contracts can no longer call any of them. |

The addresses are on [Addresses](addresses.md). Read the holders from the `AccessManager` on chain before you rely on them.

## What those powers reach

| Function or group | Effect | Bound |
|---|---|---|
| Oracle `setMarket`, source `setFeed` and `setPool` | Change spot and the configuration pinned by future series. The first series of an expiry pins its source list, limits and each source's feed or pool unless a matching pin already exists; later changes cannot re-point its settlement. | At most eight sources, deviation at most 1000 bps, candidate delay 30 minutes to 24 hours, source freshness and jump bounds. An empty list or failed source pin blocks the first pin; a mismatched pre-pin or failed source check blocks adoption after Clearinghouse migration. Later series on the same pinned expiry reuse its pin. |
| Oracle `adminResolve` | Finalise a stuck expiry. | Only from expiry + 48 hours; inside the recorded price band plus pinned deviation, or any positive price if none was usable. From expiry + seven days, a Held expiry with exactly one recorded usable price `p` instead permits an inclusive band from `0.8p` to `1.25p`, with both bounds rounded down in contract base units. Pending expiries and those with two or more usable prices keep their narrower band. Never after finalisation. |
| `Clearinghouse.registerMarket` and `setMarketListing` (listing), `setMarketFees` (market fees), `setMarketOracle` and `setCalendar` (configuration) | Register, list or unlist markets; change the tick, oracle, exercise fee, collateral-rent rate or calendar for new series. A new oracle can misprice or strand new collateral. | 18-decimal underlying; tick a non-zero multiple of 100; exercise fee at most 200 bps; oracle and calendar must have code. Rent ceiling is 5,000 parts per million of collateral per seven days remaining, and both launch markets are registered at 0 today. Existing series keep their oracle, expiry and pinned fees. |
| `Clearinghouse.setPayoutAdapter` and `setMinter` (configuration), `setFeeRecipient` (treasury), `setMinRedeemPayout` and `setBaseUri` (listing) | Change the adapter and its base conversion bound, which contracts may mint, the exercise-fee destination, the redemption threshold or token metadata. The route is not pinned per series. | The base bound plus the adapter's route fee is capped at 300 bps total; the route fee contribution is capped at 100 bps. Actual USDG receipt is checked; a failed conversion pays Stock Tokens in kind. |
| `OrderBook.setFeeParams` | Announce new book fees that take effect after 48 hours, including for resting orders. Scheduling again before activation replaces the pending values and restarts the delay; scheduling current fees cancels them. | Primary and resale fee at most 1000 bps; taker flat fee at most 1 USDG and cap at most 1000 bps of premium; rebates cannot exceed that take's taker fee. A take mined after activation pays the new fees unless its `TakeParams.maxTotalFee` refuses them, in which case it reverts. |
| `OrderBook.setFeeRecipient`, `setMakerRegistry` | Change where effective fees or rebates go. | Rebates never exceed that take's taker fee. |
| Calendar holiday and special-expiry setters | Change which future timestamps are valid. | Existing series keep their expiry. An unseeded holiday is treated as a session day. |
| `FeeSplitter` burn share, buyback cap and slippage; `buyback` | Change how a distribution divides between buying back the token and the treasury, and run a buy. | The burn share is a share of the distribution; a single buy is capped by the configured per-call cap under a compiled 1,000 USDG ceiling, with a compiled five-minute cooldown between buys. |
| `KeeperRewards` caller, bounty, cap and funding setters | Change who can request treasury bounties and their amounts; return that budget to the treasury. | Each bounty at most 1 USDG. `defund` pays the treasury, not the caller. No bounty failure blocks a lifecycle call. |
| `AutoRoller` minimum-roll setter; grant the pricer key | Change automation economics and who may reprice smart-pricing asks. | `reprice` refuses an in-the-money tracked ask; price remains inside each writer's chosen band and size and expiry stay fixed. |
| Payout route; maker vault limits, withdrawals and treasury controls; maker rebate tiers; weekly reward roots | Change the conversion pool, and the treasury's own market-making or reward allocation. | Clearinghouse conversion floor, vault quote and exposure guards, a refillable net USDG outflow cap, the rebate bound and one root per reward epoch. The maker vault's funds are treasury funds and its withdrawals can only pay the Treasury Safe. The treasury role sets its limits after 24 hours; the guardian clears a payout route with no delay. No caller is exempt from the outflow cap. |
| House vault limits, protocol accounts, oracle and performance fee | Change a house vault's guard rails, which accounts it treats as protocol accounts, its oracle, and the share of profit it keeps. A house vault's money belongs to its depositors, not to the treasury. | The guardian sets the limits — per-series units, total notional, ask tolerance, bid cap, order lifetime and the net USDG outflow cap — with no delay, on the owner's ruling, so you get no on-chain notice before they change. Live orders are untouched. The performance fee waits in the 24-hour treasury lane; protocol accounts and the oracle wait in the 24-hour configuration lane. No caller is exempt from the outflow cap. |
| Earn vault skim, adapter, funding switches and venue sweeps | Change the yield venue and the skim share, decide whether book fills may draw the vault's funds, and move assets between the vault and its venue. | The skim share and the adapter wait in the 24-hour treasury lane, the funding switches in the 24-hour configuration lane. The quoter key moves funds to and from the venue with no delay and cannot name an outside recipient. The vault is deployed with no adapter, a zero skim and funding disabled. |
| Role grants, revocations and function-to-role mappings | Replace role holders and change which role guards which function. | Role holders can exercise only the contract powers listed here. Changes in this lane wait 48 hours and the guardian cannot cancel them; the operations role's grants of the hot-key roles are instant. A newly created house vault starts with no mappings at all, so every restricted call on it falls to the admin role until this lane grants them. |

## Guardian and bot powers

| Role | Function | Effect and bound |
|---|---|---|
| `GUARDIAN` | `setCreatePaused`, `setMintPaused`, `setTradingPaused`, `FeeSplitter.setPaused`, `HouseVault.setQuotingPaused` | Stops new series, units, book activity, fee distribution or house-vault quoting. Cancels, prunes, close, withdrawals and redemptions still run. |
| `GUARDIAN` | Oracle `veto` and `unveto` | Holds an uncorroborated expiry before finalisation or restarts its delay. A corroborated pair can finalise even while held. |
| `GUARDIAN` | `HouseVault.setLimits` | Sets a house vault's guard rails — per-series units, total notional, ask tolerance, bid cap, order lifetime and the net USDG outflow cap — with no delay. Live orders are untouched. |
| `GUARDIAN` | `PayoutRouter.clearRoute`; cancel a scheduled operation | Clears a payout route immediately, and cancels a pending fee, market-fee, configuration, treasury or listing change during its waiting period. It cannot cancel a pending role or mapping change. |
| `PRICER` | `AutoRoller.reprice` | Replaces only a smart-pricing writer's ask, inside that writer's own price band; it refuses when spot is at or past the strike. |
| `QUOTER` | `MakerVault`, `HouseVault` and `EarnVault` quote and trade calls | Trades vault inventory within per-series, total exposure, bid/ask, live-order and net USDG outflow guards, and moves the earn vault's assets to and from its venue. It cannot name an outside withdrawal recipient. |
| `BUYBACK` | `FeeSplitter.buyback` | Spends the splitter's accumulated USDG on the token under a per-call cap and a five-minute cooldown. It cannot change the cap, the burn share or the venue. |
| No role | Create series; snapshot, finalise, settle, prune, redeem, roll, `AutoRoller.cancelStale`, sweep fees, claim book fees and distribute them | Permissionless lifecycle calls. The caller cannot redirect a holder's collateral or payout. `cancelStale` needs a fresh oracle spot and cancels only the unfilled tracked ask. Sweeping and distributing move fees to their configured destinations, never to the caller. |

## Values no role can change

The compiled v2 constants include one unit = 0.01 share (`1e16` underlying base units), 100 units per share, a 100-base-unit price grid, a 30-minute settlement window, finalisation no earlier than expiry + 120 seconds, a 10-minute pool snapshot grace, admin resolution no earlier than 48 hours, a 48-hour book-fee delay, a five-minute buyback cooldown, and a series tenor of at most 45 days that must be created at least an hour before it expires. The role waiting periods in the first table are compiled too. The protocol fee ceilings, 1 USDG bounty ceiling, 100 bps route-fee contribution ceiling and 300 bps total conversion-shortfall ceiling are compiled. The exact values are compiled into the contracts' constants and pinned by their own tests. Nothing checks this page automatically, so read a value on chain before you act on it.

The contracts also compile in a 30-minute opening grace for auto-roll, a seven-day rent denominator, a 24-hour vault outflow refill window, a 1,000 USDG ceiling on the configured per-call buyback cap and a 50% ceiling on any fee discount a module can grant. Check current configuration and the exact deployed-source revision before relying on these controls.

No protocol role has a function that directly seizes a user's free collateral or ERC-1155 tokens. Role-controlled settings can affect new series, current spot, future book fills and payout conversion; `adminResolve` can still determine a stuck expiry under its rules. Issuer and sequencer powers remain external risks.

## Related

* [Architecture](architecture.md)
* [Oracle and settlement](oracle-and-settlement.md)
* [Accounting](accounting.md)
* [Security](security.md)

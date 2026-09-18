# Roles

The v2 contracts have an admin, a guardian and narrow bot roles. You can still close, cancel, withdraw and redeem under the protocol's pause switches, subject to external token behaviour.

{% hint style="warning" %}
Stonkhouse v2 is unaudited. The chain-4663 contracts first deployed for the dev launch are the live public contract set. Only NVDA is registered; other markets remain planned. Operational services and market liquidity may be unavailable. Stock Tokens carry market and issuer risks. Buyers can lose their full cost; writers can lose collateral. Stonkhouse is not available to US persons. Read [Risks](../resources/risks.md) before using the product.
{% endhint %}

{% hint style="danger" %}
The deployment started with one hot key holding `DEFAULT_ADMIN_ROLE` on the v2 contracts, without a timelock. Check current role grants on chain before relying on this launch record. That key can change spot and configure sources for expiries with no series yet, change future series terms and v7 rent rates, schedule book fees, change payout routes and resolve a stuck expiry after 48 hours. After seven days, it can resolve a Held expiry with exactly one recorded usable price within 0.8× to 1.25× that price. The admin can grant itself the guardian role needed to hold an expiry. The first series pins that expiry's settlement configuration; each series pins its own market rent rate when created. A later source change cannot re-point the expiry. Two agreeing sources pinned before the first series can still finalise a price without a guardian delay. Treat compromise or misuse of the key as a risk to new positions and unresolved payouts. The vault outflow cap exempts admin actions, so the quoting key must not hold this role.
{% endhint %}

Where the prose and the code disagree, the code is the specification. This table condenses the deployed v7 contracts, built from frozen source revision `1b08755`. The initial role plan and source observations are dated 2026-09-17; verify current holders on chain.

## Admin powers

| Function or group | Effect | Bound |
|---|---|---|
| Oracle `setMarket`, source `setFeed` and `setPool` | Change spot and the configuration pinned by future series. The first series of an expiry pins its source list, limits and each source's feed or pool unless a matching pin already exists; later changes cannot re-point its settlement. | At most eight sources, deviation at most 1000 bps, candidate delay 30 minutes to 24 hours, source freshness and jump bounds. An empty list or failed source pin blocks the first pin; a mismatched pre-pin or failed source check blocks adoption after Clearinghouse migration. Later series on the same pinned expiry reuse its pin. |
| Oracle `adminResolve` | Finalise a stuck expiry. | Only from expiry + 48 hours; inside the recorded price band plus pinned deviation, or any positive price if none was usable. From expiry + seven days, a Held expiry with exactly one recorded usable price `p` instead permits an inclusive band from `0.8p` to `1.25p`, with both bounds rounded down in contract base units. Pending expiries and those with two or more usable prices keep their narrower band. Never after finalisation. |
| `Clearinghouse.registerMarket`, `setMarketConfig`, `setCalendar` | Enable or disable markets; change the tick, oracle, exercise fee, mint rent rate or calendar for new series. A new oracle can misprice or strand new collateral. | 18-decimal underlying; tick a non-zero multiple of 100; exercise fee at most 200 bps; oracle and calendar must have code. Rent ceiling is 5,000 parts per million of collateral per seven days remaining. Existing series keep their oracle, expiry and pinned fees. |
| `Clearinghouse.setPayoutAdapter`, `setFeeRecipient`, `setMinRedeemPayout`, `setBaseUri` | Change the adapter and its base conversion bound, exercise-fee destination, bounty threshold or token metadata. The route is not pinned per series. | The base bound plus the adapter's route fee is capped at 300 bps total; the route fee contribution is capped at 100 bps. Actual USDG receipt is checked; a failed conversion pays Stock Tokens in kind. |
| `OrderBook.setFeeParams` | Announce new book fees that take effect after 24 hours, including for resting orders. Scheduling again before activation replaces the pending values and restarts the delay; scheduling current fees cancels them. | Primary and resale fee at most 1000 bps; taker flat fee at most 1 USDG and cap at most 1000 bps of premium; rebates cannot exceed that take's taker fee. `TakeParams` has no fee limit, so a take mined after activation uses the new fees. |
| `OrderBook.setFeeRecipient`, `setMakerRegistry` | Change where effective fees or rebates go. | Rebates never exceed that take's taker fee. |
| Calendar holiday and special-expiry setters | Change which future timestamps are valid. | Existing series keep their expiry. An unseeded holiday is treated as a session day. |
| `KeeperRewards` caller, bounty, cap and funding setters | Change who can request treasury bounties and their amounts; withdraw that budget. | Each bounty at most 1 USDG. No bounty failure blocks a lifecycle call. |
| `AutoRoller` bounty and minimum-roll setters; grant `PRICER_ROLE` | Change automation economics and who may reprice smart-pricing asks. | Deployed v7 `reprice` also refuses an in-the-money tracked ask; price remains inside each writer's chosen band and size and expiry stay fixed. |
| Payout adapter route; maker vault limits and treasury controls; maker rebate tiers; weekly reward roots | Change conversion pool and treasury market-making or reward allocation. | Clearinghouse conversion floor, vault quote/exposure guards and refillable net USDG outflow cap, rebate bound and one root per reward epoch. The vault's funds are treasury funds. The admin can change the outflow limit and is exempt from it. |
| AccessControl role grants and revocations | Replace role holders. | Role holders can exercise only the contract powers listed here; the admin controls those grants. |

## Guardian and bot powers

| Role | Function | Effect and bound |
|---|---|---|
| `GUARDIAN_ROLE` | `setCreatePaused`, `setMintPaused`, `setTradingPaused` | Stops new series, units or book activity. Cancels, prunes, close, withdrawals and redemptions still run. The admin can also control the book's trading pause. |
| `GUARDIAN_ROLE` | Oracle `veto` and `unveto` | Holds an uncorroborated expiry before finalisation or restarts its delay. A corroborated pair can finalise even while held; the admin can also unveto. |
| `PRICER_ROLE` | `AutoRoller.reprice` | Replaces only a smart-pricing writer's ask, inside that writer's own price band; deployed v7 refuses it when spot is at or past the strike. |
| `QUOTER_ROLE` | `MakerVault` quote and trade calls | Trades treasury inventory within per-series, total exposure, bid/ask, live-order and net USDG outflow guards. It cannot name an outside withdrawal recipient. |
| No role | Create series; snapshot, finalise, settle, prune, redeem, roll, `AutoRoller.cancelStale` and sweep fees | Permissionless lifecycle calls. The caller cannot redirect a holder's collateral or payout. `cancelStale` needs a fresh oracle spot and cancels only the unfilled tracked ask. |

## Values no role can change

The compiled v2 constants include one unit = 0.01 share (`1e16` underlying base units), 100 units per share, a 100-base-unit price grid, a 30-minute settlement window, finalisation no earlier than expiry + 120 seconds, a 10-minute pool snapshot grace, admin resolution no earlier than 48 hours, a 24-hour book-fee delay, and a 45-day maximum series tenor. The protocol fee ceilings, 1 USDG bounty ceiling, 100 bps route-fee contribution ceiling and 300 bps total conversion-shortfall ceiling are compiled. The exact values are asserted by `InterfaceIdsTest` and `V2DocsNumbersTest`.

The deployed interface v7 contains a compiled 30-minute opening grace for auto-roll, a seven-day rent denominator and a 24-hour vault outflow refill window. Check current configuration and the exact deployed-source revision before relying on these controls; the current public source tree is not byte-for-byte identical for `UniV3TwapSource`.

No protocol role has a function that directly seizes a user's free collateral or ERC-1155 tokens. Admin-controlled settings can affect new series, current spot, future book fills and payout conversion; `adminResolve` can still determine a stuck expiry under its rules. Issuer and sequencer powers remain external risks.

## Related

* [Architecture](architecture.md)
* [Oracle and settlement](oracle-and-settlement.md)
* [Accounting](accounting.md)
* [Security](security.md)

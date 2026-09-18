# Oracle and settlement

The oracle selects one price for every series of an underlying at an expiry. You can see whether that price is final, waiting through a delay, or held by a guardian veto.

{% hint style="warning" %}
Stonkhouse v2 is unaudited. The chain-4663 contracts first deployed for the dev launch are the live public contract set. Only NVDA is registered; other markets remain planned. Operational services and market liquidity may be unavailable. Stock Tokens carry market and issuer risks. Buyers can lose their full cost; writers can lose collateral. Stonkhouse is not available to US persons. Read [Risks](../resources/risks.md) before using the product.
{% endhint %}

Where the prose and the code disagree, the code is the specification. The settlement design uses a fixed final 30-minute price window, pins an expiry's sources when its first series is created, and delays a result that lacks agreement between sources. The implementation is in `callhouse-contracts/src/v2/oracle/SettlementOracle.sol`.

## The final 30 minutes

For expiry `E`, each source prices the fixed window `[E − 1800 seconds, E]`. It does not use the price at the time a keeper calls `finalize`. One result is shared by calls, puts and every strike for that underlying and expiry. Expiry is 16:00 New York on an NYSE session day.

| Source | How it reads that window | When it can fail |
|---|---|---|
| Chainlink push feed | Walks on-chain rounds backwards, weights each price by its seconds in force and floors the average. No snapshot is needed. | Paused or unreadable Stock Token oracle, stale or non-positive answer, a large round jump, a broken phase, or more than 96 round reads. A push feed can be stale near the strike even while valid. |
| Uniswap v3 pool | A permissionless `record` reads pool cumulatives for exactly the window and stores the mean-tick price once. | Nobody records it in `[E, E + 600 seconds]`, the observation fails, or harmonic-mean liquidity is below the market floor. |
| Chainlink Data Streams | Built and tested, but disabled for every v2.0 market until the owner obtains access and enables it. | No enabled report source exists today. |

Markets with a usable pool list the push feed first and the pool second; a market without one lists the feed alone. If enabled later, Data Streams would be first. Pyth Pro has no v2.0 adapter. The first series for an underlying and expiry pins that expiry's source list, deviation limit, candidate delay and spot age, unless the expiry was already pinned. Each listed source also pins its feed or pool configuration. If a different Clearinghouse had already pinned that expiry, series creation verifies the existing pin against current market configuration and asks every source to confirm its pin; a mismatch reverts. A listed source's pin failure reverts the first series that pins the expiry, or a series adopting its pin after a Clearinghouse migration. Later series through the same Clearinghouse reuse the existing pin without calling the sources again. Later admin changes to those settings affect spot and expiries without a series, but not settlement of the pinned expiry.

Pinning fixes **which sources and rules** an expiry uses. Capture happens later, when `finalize` or `adminResolve` first reads a usable price. A captured good price is not re-read; an unavailable pinned source may be upgraded when it later answers. `SettlementConfigPinned` and the source pin events show the configuration for a live expiry; the market's current settings are not its settlement history.

## Fallback decision

`finalize` may first run at `E + 120 seconds`. Two prices agree when their difference is at most `maxDeviationBps` of the lower price; the default is 150 bps (1.5%). The per-market uncorroborated delay defaults to six hours.

| Sources and state | Result |
|---|---|
| No source is usable | No final price; retry later. |
| At least two usable sources agree | Final immediately at the highest-priority usable source that agrees with another, even if the expiry was held. |
| Only one usable source, or none agree | Announce the highest-priority usable source as a candidate. Status is Pending; `candidate.finalizableAt` is the call time plus the delay. |
| Pending, before `finalizableAt` | No final price. |
| Pending, at or after `finalizableAt` | Final at the candidate price if no pair corroborates and the candidate has not changed. A changed source or disagreement restarts the delay. |
| Held by guardian veto | The uncorroborated path waits. A corroborated pair can still finalise. |
| Already final | The same result is returned without a new event or bounty. |

{% hint style="warning" %}
A delayed or held settlement leaves your long, short and collateral claims in place. You may transfer tokens or close a matched long and short until that series settles. You cannot redeem either side until the price is final and `settle` stores the per-unit amounts. A pause on one expiry does not pause other expiries.
{% endhint %}

The guardian may `veto` any expiry before it is final, even before expiry. The guardian or admin may `unveto`, which restarts the candidate delay. From `E + 48 hours`, the admin may `adminResolve`. If usable prices were captured, the resolution must lie inside their minimum-to-maximum band extended by the pinned deviation. If none of the pinned sources ever answered, any positive price may be set. From `E + seven days`, a **Held** expiry with exactly one recorded usable price `p` instead permits any price in the inclusive band `[0.8p, 1.25p]`, with both bounds rounded down in contract base units. Pending expiries and those with two or more usable prices keep their original band. This is a wider hot-key power: the admin can grant itself the guardian role and hold a single-source expiry before resolving it. An admin cannot add a new agreeing source to an expiry that already has a series, but two agreeing sources pinned before its first series can still cause a corroborated price to finalise without a veto window; see [Roles](roles.md) and [Security](security.md).

## Examples

| Situation | Outcome |
|---|---|
| A pool snapshot is recorded at `E + 60 seconds`; the feed and pool agree at `E + 120 seconds`. | The feed's 30-minute average is final immediately. |
| The keeper calls `finalize` before recording the pool. | The feed becomes a candidate. A pool snapshot inside the grace can later corroborate and finalise it. |
| The pool snapshot is missed. | The feed alone waits through the market delay unless vetoed. |
| The pool was pushed away from the feed. | The feed becomes a candidate marked as disagreement; it waits through the same delay. |
| The issuer pauses its oracle and no pool value was recorded. | No source is usable yet; retry after the pause. |
| Only Chainlink is configured. | Every expiry follows the delayed single-source path. |

These paths are exercised by `SettlementOracleSourcesTest`, `SettlementOracleChainTest` and the v2 fork suite in `callhouse-contracts/test/v2/`. The push feed may print only after about a 0.5% move or its heartbeat. Near a strike, its average can therefore differ from an official closing price even if the contract accepts it.

## Holidays, early closes and UTC

Daily expiry is each NYSE session day. Weekly expiry is the last session day of that ISO week, usually Friday, or Thursday if Friday is closed. The admin-seeded holiday set covers 2026–2028 and must be extended; an unseeded holiday looks like a session day to the contract. A 13:00 early close is still an ordinary session day, so expiry remains 16:00 New York and the feed's last prints may be old. The disabled Data Streams source does not answer on early-close windows.

The on-chain calendar implements US daylight saving time: 16:00 New York is 20:00 UTC under EDT and 21:00 UTC under EST. An admin may whitelist a special exact expiry; it is never classified as weekly or returned to the AutoRoller.

## Related

* [Settlement and payout](../buying/settlement-and-payout.md)
* [Series and tokens](series-and-tokens.md)
* [Roles](roles.md)
* [Security](security.md)

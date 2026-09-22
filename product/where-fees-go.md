# Where fees go

See which fees the protocol keeps, how they reach one contract, and what that contract is designed to do with them.

{% hint style="warning" %}
Stonkhouse v2 is unaudited. Interface v8 is deployed on Robinhood Chain 4663 from block 69,512,673 (22 September 2026); the launch markets are NVDA and SPCX. Registered markets can change; check the current app and on-chain status before trading. Operational services and market liquidity may be unavailable. Stock Tokens carry market and issuer risks. Buyers can lose their full cost; writers can lose collateral. Stonkhouse is not available to US persons. Read [Risks](../resources/risks.md) before using the product.
{% endhint %}

{% hint style="info" %}
This page describes a mechanism that is deployed but has not yet run. The `FeeSplitter` (`0x52a5674FFD2aDe74738d2347ef1366Bdc1881C37`) and its buyback executor (`0xE7Ae90cDCfF293C7434942bEF0aE7C7C59A39565`) are on Robinhood Chain 4663, the executor is pinned to the STONKHOUSE token (`0xc2525b7c68b6d66dE5AABFEDC7B13314F389D5C4`) and its Uniswap v4 pool, and both fee recipients point at the splitter. At block 69,689,857 on 22 September 2026 the splitter had emitted nothing but its own configuration events: no distribution, buyback or burn has been observed on chain, and its buyback reserve is zero. The buyback step is gated separately: it needs the `BUYBACK` role, so a distribution does not trigger one. Nothing here tells you what the token will be worth. Read it as the mechanism the deployed code implements, not as an observed flow.
{% endhint %}

## What the protocol keeps

Three charges reach the protocol, and [Fees](fees.md) gives their rates and worked examples.

| Charge | Paid in | Collected by |
|---|---|---|
| Primary premium fee, 5% of the premium on a first sale | USDG | `OrderBook` |
| Taker fee, less any maker rebate paid out of it | USDG | `OrderBook` |
| Exercise fee, 0.25% of collateral per in-the-money unit | The series' collateral asset, so Stock Tokens for a call and USDG for a put | `Clearinghouse` |

Collateral rent would be a fourth, in the collateral asset, but every market registered on the current contracts sets its rate to 0. A maker rebate is not a protocol charge: it is a share of the taker fee handed back to the resting order.

## How they reach one contract

1. The `OrderBook` credits its fee recipient in the same `owed` ledger it uses for any USDG it cannot push. Anyone can call `FeeSplitter.claimOrderBookFees` to pull that balance across.
2. The `Clearinghouse` accrues exercise fees, and any rent left at settlement, per asset. Anyone can call `Clearinghouse.sweepFees` for an asset to send them to the fee recipient.
3. Both fee recipients are the `FeeSplitter`, so USDG fees and Stock Token fees end up in the same place.

Both calls are permissionless and neither pays the caller anything of the fees themselves.

## What the splitter does with them

`FeeSplitter.distribute` handles one asset at a time, and anyone may call it. A partial sale is also possible: `FeeSplitter.distributeAmount` takes a Stock Token and the number of base units to sell, applies the same floor to that piece, and is equally permissionless. It does not accept USDG, which is never sold, so a USDG balance is only ever split whole.

- A Stock Token balance is sold for USDG first, through the payout router's pinned route for that asset, with a minimum output set from the oracle spot less the configured slippage allowance and the route's own fee. If there is no route, no oracle spot, or the swap would land below that floor, the call records a skip event and changes nothing. **Only USDG is ever divided, and only STONKHOUSE is ever bought or burned.**
- The USDG is then split by a configured share, 50% at launch. That share is added to a buyback reserve inside the splitter; the remainder is transferred to the Treasury Safe in the same call.
- The fee-manager role can change the share, the per-call buyback cap and the slippage allowance, and that change waits 48 hours.

A separate call, `FeeSplitter.buyback`, spends the reserve. It needs the `BUYBACK` role, so it is the one flywheel step that is not permissionless. Each call spends at most the configured per-call cap, 50 USDG at launch under a compiled 1,000 USDG ceiling, and a compiled five-minute cooldown stands between two calls, so the reserve is spent in small pieces rather than one sandwichable transaction. The executor buys STONKHOUSE at the pinned venue and burns what it buys; the splitter checks that the token's total supply fell by exactly the amount reported as burned, and reverts if it did not.

The guardian can pause the splitter, which stops distribution and buybacks while leaving every trading and settlement path alone.

## What this does not include

- **There is no staking, no locked-token programme and no fee vote.** Holding the token does not entitle you to a share of fees, a lower fee, or a say in listings or rates.
- **The treasury half is not a distribution to holders.** It is the owner's operating money, held by a Safe.
- **A burn is not a promise about price.** It removes tokens the protocol bought with money it had already earned; it adds nothing to the protocol's revenue and it does not support a level.
- **Fees are not revenue you receive.** A maker's rebate is the only fee flow that reaches a user, and it is capped by the taker fee of that same trade.

## Related

* [Fees](fees.md)
* [Accounting](../protocol/accounting.md)
* [Roles](../protocol/roles.md)
* [Token Supply and Allocation](../resources/token-supply-and-allocation.md)
* [Risks](../resources/risks.md)

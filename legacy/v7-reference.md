# v7 reference

Find the addresses, recorded fees and run-off rules for the interface-v7 contracts, the first public chain-4663 set.

{% hint style="warning" %}
Stonkhouse v2 is unaudited. Interface v8 is deployed on Robinhood Chain 4663 from block 69,512,673 (22 September 2026); the launch markets are NVDA and SPCX. Registered markets can change; check the current app and on-chain status before trading. Operational services and market liquidity may be unavailable. Stock Tokens carry market and issuer risks. Buyers can lose their full cost; writers can lose collateral. Stonkhouse is not available to US persons. Read [Risks](../resources/risks.md) before using the product.
{% endhint %}

{% hint style="info" %}
This page describes **interface v7 only**, for positions opened on the first public deployment. Its addresses, fees and delays are not the current ones. [Addresses](../protocol/addresses.md) carries the current interface-v8 set.
{% endhint %}

## What interface v7 is

Interface v7 was the first public v2 contract set on Robinhood Chain 4663. Its deployment run starts at block 65,780,341, and NVDA was registered on 18 September 2026 as its only market. Interface v8 superseded it on 22 September 2026.

V8 is a separate deployment at new addresses. Nothing migrated and nothing converts. A v7 series, long token, short position or free balance stays on the v7 contracts and finishes under v7's rules and v7's recorded fees. Do not send a v7 token to a v8 contract, or a v8 token to a v7 contract; neither set recognises the other's positions.

## v7 is still on chain and was not frozen

Read from `https://rpc.mainnet.chain.robinhood.com` at block 69,689,274 on 22 September 2026:

* The v7 Clearinghouse returns `createPaused() == false`.
* Its NVDA market is still enabled, with `mintPaused` false, a 2,500,000 strike tick, a 25-basis-point exercise fee and an 80 ppm rent rate.
* The v7 OrderBook returns `tradingPaused() == false` and fee parameters `(0, 0, 100000, 1000, 5000)`.

The v7 code therefore still accepts series creation, minting and orders. A freeze is an owner action that has not been taken, and this page does not promise that it will be.

What has stopped is registration. Stonkhouse registers nothing new on v7: no new market, and no new expiry from its own keepers. The app keeps the v7 market registry as a frozen, read-only file for the run-off. Series creation on v7 is permissionless, so while the NVDA market stays enabled the contracts do not stop somebody else creating a v7 series; such a series is not a Stonkhouse market and no service supports it. Do not rely on a keeper, pricer or quoter continuing to run against v7, and do not assume a v7 quote or fill is available. Check the chain and the app rather than this page.

{% hint style="danger" %}
The v7 contracts each use OpenZeppelin `AccessControl` with a single externally owned admin account. At block 69,689,274 the deployment admin `0xEb82c3D0F89d47453F94f0C2b2a2752e27a19d9b` still held the default admin role on the v7 Clearinghouse and OrderBook, and the guardian recorded for the deployment is the hot key `0x29741A8d283a253E8Ce10aDfd04C6507438b6F39`. Apart from the OrderBook's 24-hour fee-change notice, a v7 admin call takes effect at once: v7 has no `AccessManager`, no execution delays and no multisignature. The same account holds **no** role in the v8 set. Treat a balance left on v7 as sitting under a hot key, and settle or redeem rather than parking it there.
{% endhint %}

## Addresses

These are the 13 interface-v7 contracts. Verify any address against the chain before signing.

| Interface-v7 contract | Chain-4663 address |
|---|---|
| Clearinghouse | [`0x22dEf851cD1a3B04Ad7d232bE786d76E6944d424`](https://robinhoodchain.blockscout.com/address/0x22dEf851cD1a3B04Ad7d232bE786d76E6944d424) |
| OrderBook | [`0x9fcAe743C3fA0aEC7DB9b1d01e86464b85759942`](https://robinhoodchain.blockscout.com/address/0x9fcAe743C3fA0aEC7DB9b1d01e86464b85759942) |
| SettlementOracle | [`0xb205984b5F2F9010c2bD8aCA46d946Fe1c4F2A54`](https://robinhoodchain.blockscout.com/address/0xb205984b5F2F9010c2bD8aCA46d946Fe1c4F2A54) |
| ExpiryCalendar | [`0xd0fCeD9Ee6F533aA900BEe8d0523eF4867a5784a`](https://robinhoodchain.blockscout.com/address/0xd0fCeD9Ee6F533aA900BEe8d0523eF4867a5784a) |
| ChainlinkFeedSource | [`0x1a595B2F836b7B76e71C0F85ADA6186ef16fB96A`](https://robinhoodchain.blockscout.com/address/0x1a595B2F836b7B76e71C0F85ADA6186ef16fB96A) |
| UniV3TwapSource | [`0x030f05E856c79bC215c5683DC201473e4F88a155`](https://robinhoodchain.blockscout.com/address/0x030f05E856c79bC215c5683DC201473e4F88a155) |
| DataStreamsSource (deployed, disabled) | [`0xeC049Df6F9908374940065cec593Ac83fc1db4d2`](https://robinhoodchain.blockscout.com/address/0xeC049Df6F9908374940065cec593Ac83fc1db4d2) |
| KeeperRewards | [`0xFB409E6E253bcC12a65ED02B9D5aa3cAbF8f63f3`](https://robinhoodchain.blockscout.com/address/0xFB409E6E253bcC12a65ED02B9D5aa3cAbF8f63f3) |
| AutoRoller | [`0xca76e9d57992904a14E31C5103454A4906ebFfee`](https://robinhoodchain.blockscout.com/address/0xca76e9d57992904a14E31C5103454A4906ebFfee) |
| UniV3PayoutAdapter | [`0xf529CE3708bd2002D6bC974dFC0501c92aE72c30`](https://robinhoodchain.blockscout.com/address/0xf529CE3708bd2002D6bC974dFC0501c92aE72c30) |
| MakerVault | [`0x5EA899580B3dEB99c6866c7CD14dEDc913C8C1d0`](https://robinhoodchain.blockscout.com/address/0x5EA899580B3dEB99c6866c7CD14dEDc913C8C1d0) |
| MakerRegistry | [`0xED816A81F8e311F78496c63c66abaA93A996cD3B`](https://robinhoodchain.blockscout.com/address/0xED816A81F8e311F78496c63c66abaA93A996cD3B) |
| RewardsDistributor | [`0xc2Eea33F12e26662c66D632915fD75BCEA13BF4f`](https://robinhoodchain.blockscout.com/address/0xc2Eea33F12e26662c66D632915fD75BCEA13BF4f) |

These addresses are not the current set. The v8 Clearinghouse is a different contract at a different address; take it from [Addresses](../protocol/addresses.md) rather than from this table.

## Deployment record

| Release fact | Recorded value |
|---|---|
| Chain ID | `4663` |
| Deployment start block | `65780341` |
| Contract interface version | `7` |
| Deployed-source revision | `callhouse-contracts` `1b08755`, the frozen dev-launch revision. All 13 live runtimes matched its compiled artifacts outside immutables. Later contract revisions, including the v8 tip, are **not** an exact match to this deployed source. |
| Launch registry | `ops/markets/dev.json` SHA-256 `f3c8e679448a96cc910a6f10d879a56d8e73642d263f154d967527996f736905` at 18 September 2026 01:15 UTC. The app now keeps this set as the frozen `ops/markets/v7-legacy.json`. |
| Launch market | NVDA only; registered in [transaction `0x193b…7a6ea`](https://robinhoodchain.blockscout.com/tx/0x193b514124fc9fb83d419e2e981c0e5369ce2a19e44671cbb69bee6f2807a6ea) |
| Launch verification | The deployer's `VerifyV2` completed 121 on-chain checks at the time of that deployment. That is **not** a third-party audit and **not** explorer source-code verification. No audit of v7 or v8 exists. |

The deployment record establishes historical facts. Roles, market settings and orders can change afterwards, so read the current state on chain.

## Fees recorded on v7

These are the settings the v7 contracts hold, read at block 69,689,274. They are not the current fees; [Fees](../product/fees.md) describes the current set.

| v7 charge | Who pays | Recorded v7 setting |
|---|---|---|
| Primary premium fee | Seller, on a first sale | **0%** |
| Resale fee | Seller, on a resale | 0% |
| Taker fee | Buyer, on each fill | 0.10 USDG flat, never more than 10% of the premium |
| Maker rebate | Paid to the maker out of the taker fee | 50% |
| Exercise fee | Long holder, out of the settlement payout | 25 basis points on NVDA, pinned into each series when it is created |
| Collateral rent at mint | Writer, whenever a fill mints a new long and short pair | **80 ppm** of the locked collateral per full seven days of remaining life on NVDA |

Two of those differ from the current contracts and are the reason this page exists. V7 charged **no** primary premium fee, and it **did** charge collateral rent: 80 parts per million of the locked collateral per seven days of remaining life, taken pro rata over the time left to expiry and refunded pro rata if you close matching long and short units early. A v7 series keeps the rent rate and exercise fee that were pinned into it at creation, so an existing position's terms do not move. V7's compiled rent ceiling is 5,000 ppm, or 0.5% of collateral per seven days.

A change to the v7 OrderBook's fee parameters takes effect **24 hours** after it is scheduled. That notice is v7's; interface v8 raised the same notice to 48 hours. Neither delay applies to the other set.

## If you hold a v7 position

Work through the v7 addresses above, not the app's current market pages.

1. Identify what you hold on v7: long units, short units against locked collateral, a free Clearinghouse balance, or an unfilled order on the v7 OrderBook.
2. Cancel a v7 order you no longer want filled. An order left open can still fill while the book is unpaused.
3. Let an open v7 series reach its expiry, or close matching long and short units before expiry to release the collateral and recover the unused rent.
4. After expiry, the series must be settled before anything can be redeemed. Settlement and redemption on v7 are permissionless, so an eligible caller can submit them; do not assume a keeper will. Check the series' settled state on chain.
5. Redeem your long units and withdraw your free Stock Tokens and USDG from the v7 Clearinghouse. Keep enough chain ETH for gas.

Do not send new deposits to the v7 Clearinghouse. It still accepts them, which is exactly the risk: collateral added there sits on a superseded set that nobody is registering markets on and that is administered by a hot key. Withdraw what you finish with rather than leaving it.

## Related

* [Addresses](../protocol/addresses.md)
* [Fees](../product/fees.md)
* [Moving from v1](moving-from-v1.md)
* [Security](../protocol/security.md)
* [Risks](../resources/risks.md)

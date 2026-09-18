# Addresses

These 13 contracts were first deployed for the 18 September 2026 dev launch on Robinhood Chain 4663. The owner has designated that same on-chain set as the live public v2 deployment. There was no second production redeployment. Check the addresses, current roles and market status on chain before signing; local fork addresses are temporary.

{% hint style="warning" %}
Stonkhouse v2 is unaudited. The chain-4663 contracts first deployed for the dev launch are the live public contract set. Only NVDA is registered; other markets remain planned. Operational services and market liquidity may be unavailable. Stock Tokens carry market and issuer risks. Buyers can lose their full cost; writers can lose collateral. Stonkhouse is not available to US persons. Read [Risks](../resources/risks.md) before using the product.
{% endhint %}

Where the prose and the code disagree, the code is the specification. The public app's deployment registry is `callhouse/ops/markets/tier1.json`; the addresses below are from the dev-origin deployment manifest and are recorded in that public registry. The `deployBlock` is the deployment's recorded start block, not a claim that every contract was created in the same block.

| V2 contract | Live chain-4663 address |
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

## Deployment record

| Release fact | Recorded value |
|---|---|
| Chain ID | `4663` |
| Deployment start block | `65780341` |
| Contract interface version | `7` |
| Deployed-source revision | `callhouse-contracts` `1b08755` (the frozen dev-launch revision). All 13 live runtimes match its compiled artifacts outside immutables. The current public contracts `main` has different `UniV3TwapSource` runtime code after a TickMath rewrite; do not treat that later source as an exact match to the deployed source. |
| Launch registry | `ops/markets/dev.json` SHA-256 `f3c8e679448a96cc910a6f10d879a56d8e73642d263f154d967527996f736905` at 18 September 2026 01:15 UTC; the public registry is the deployment record going forward |
| Launch market | NVDA only; registered in [transaction `0x193b…7a6ea`](https://robinhoodchain.blockscout.com/tx/0x193b514124fc9fb83d419e2e981c0e5369ce2a19e44671cbb69bee6f2807a6ea) |
| Launch verification | The deployer's `VerifyV2` completed 121 on-chain checks. A fresh chain-4663 read found code at all 13 addresses, confirmed NVDA enabled and unpaused, and matched the runtimes to the frozen `1b08755` artifacts outside immutables. These are **not** a third-party audit or explorer source-code verification. |

Do not substitute a local fork address, a v1 address, or a different chain-4663 deployment for this set. Confirm bytecode, registry settings and current role grants directly against the chain. The launch record establishes historical facts; roles and orders can change later.

## Verify each contract

Set `RH_RPC`, `ADMIN` and the address variables from the deployment record above. Each contract uses OpenZeppelin `AccessControl`; the following `cast call` checks its admin role. The expected decoded output at the fresh verification was `true` for the launch admin on all 13 contracts. A later role transfer can change the result, so compare with current `RoleGranted` and `RoleRevoked` events. Also compare `cast code` with the frozen `1b08755` runtime artifacts and the registry's deploy block. A nonempty bytecode or admin result by itself does not prove source identity.

```sh
ADMIN_ROLE=0x0000000000000000000000000000000000000000000000000000000000000000
cast call "$CLEARINGHOUSE" "hasRole(bytes32,address)(bool)" "$ADMIN_ROLE" "$ADMIN" --rpc-url "$RH_RPC"       # true
cast call "$ORDER_BOOK" "hasRole(bytes32,address)(bool)" "$ADMIN_ROLE" "$ADMIN" --rpc-url "$RH_RPC"          # true
cast call "$SETTLEMENT_ORACLE" "hasRole(bytes32,address)(bool)" "$ADMIN_ROLE" "$ADMIN" --rpc-url "$RH_RPC"  # true
cast call "$EXPIRY_CALENDAR" "hasRole(bytes32,address)(bool)" "$ADMIN_ROLE" "$ADMIN" --rpc-url "$RH_RPC"    # true
cast call "$CHAINLINK_SOURCE" "hasRole(bytes32,address)(bool)" "$ADMIN_ROLE" "$ADMIN" --rpc-url "$RH_RPC"   # true
cast call "$UNIV3_SOURCE" "hasRole(bytes32,address)(bool)" "$ADMIN_ROLE" "$ADMIN" --rpc-url "$RH_RPC"       # true
cast call "$DATA_STREAMS_SOURCE" "hasRole(bytes32,address)(bool)" "$ADMIN_ROLE" "$ADMIN" --rpc-url "$RH_RPC" # true
cast call "$KEEPER_REWARDS" "hasRole(bytes32,address)(bool)" "$ADMIN_ROLE" "$ADMIN" --rpc-url "$RH_RPC"     # true
cast call "$AUTO_ROLLER" "hasRole(bytes32,address)(bool)" "$ADMIN_ROLE" "$ADMIN" --rpc-url "$RH_RPC"        # true
cast call "$PAYOUT_ADAPTER" "hasRole(bytes32,address)(bool)" "$ADMIN_ROLE" "$ADMIN" --rpc-url "$RH_RPC"     # true
cast call "$MAKER_VAULT" "hasRole(bytes32,address)(bool)" "$ADMIN_ROLE" "$ADMIN" --rpc-url "$RH_RPC"        # true
cast call "$MAKER_REGISTRY" "hasRole(bytes32,address)(bool)" "$ADMIN_ROLE" "$ADMIN" --rpc-url "$RH_RPC"     # true
cast call "$REWARDS_DISTRIBUTOR" "hasRole(bytes32,address)(bool)" "$ADMIN_ROLE" "$ADMIN" --rpc-url "$RH_RPC" # true
```

Check the core links as well:

```sh
cast call "$CLEARINGHOUSE" "usdg()(address)" --rpc-url "$RH_RPC"          # published USDG address
cast call "$ORDER_BOOK" "clearinghouse()(address)" --rpc-url "$RH_RPC"    # $CLEARINGHOUSE
cast call "$SETTLEMENT_ORACLE" "SETTLEMENT_WINDOW()(uint32)" --rpc-url "$RH_RPC" # 1800
```

## Related

* [Architecture](architecture.md)
* [Roles](roles.md)
* [Security](security.md)
* [Markets](../product/markets.md)

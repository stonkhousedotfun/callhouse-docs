# Addresses

The current contracts on Robinhood Chain 4663 are the interface-8 set. They were deployed on 22 September 2026 from block 69,512,673 and are administered through a single `AccessManager`. They replace the 13 contracts deployed for the 18 September 2026 dev launch, which stay on chain as the legacy interface-7 set at the bottom of this page. Check the addresses, the current role grants and the market status on chain before signing; local fork addresses are temporary.

{% hint style="warning" %}
Stonkhouse v2 is unaudited. Interface v8 is deployed on Robinhood Chain 4663 from block 69,512,673 (22 September 2026); the launch markets are NVDA and SPCX. Registered markets can change; check the current app and on-chain status before trading. Operational services and market liquidity may be unavailable. Stock Tokens carry market and issuer risks. Buyers can lose their full cost; writers can lose collateral. Stonkhouse is not available to US persons. Read [Risks](../resources/risks.md) before using the product.
{% endhint %}

Where the prose and the code disagree, the code is the specification. The public app's deployment registry is `callhouse/ops/markets/tier1.json`; the addresses below are the values the deployment wrote back into its `v2` block. The recorded deploy block is the run's start block, not a claim that every contract was created in it.

## Current contracts

| Contract | Chain-4663 address |
|---|---|
| AccessManager | [`0xb663C1EAEeD4664515Cc864667263f3e75238da3`](https://robinhoodchain.blockscout.com/address/0xb663C1EAEeD4664515Cc864667263f3e75238da3) |
| Clearinghouse | [`0x1A67948175DFf13426F0d61bfB483579D2ff2EeE`](https://robinhoodchain.blockscout.com/address/0x1A67948175DFf13426F0d61bfB483579D2ff2EeE) |
| OrderBook | [`0x65A97a05e9726DA45794DA206943bbc4280b5ce6`](https://robinhoodchain.blockscout.com/address/0x65A97a05e9726DA45794DA206943bbc4280b5ce6) |
| SettlementOracle | [`0x0e4F266b73e95dc6d4cA10674DCd5eF353e2BDCD`](https://robinhoodchain.blockscout.com/address/0x0e4F266b73e95dc6d4cA10674DCd5eF353e2BDCD) |
| ExpiryCalendar | [`0x5d0D98C6774B5db0b83D8Bc16FDd09a8Df826d18`](https://robinhoodchain.blockscout.com/address/0x5d0D98C6774B5db0b83D8Bc16FDd09a8Df826d18) |
| KeeperRewards | [`0x475D2649E991f4D2f1E21dEB758cd1d6D76C27c5`](https://robinhoodchain.blockscout.com/address/0x475D2649E991f4D2f1E21dEB758cd1d6D76C27c5) |
| AutoRoller | [`0x7C6Fbc78c460e7994e6A47f7AEe63E36709ab05D`](https://robinhoodchain.blockscout.com/address/0x7C6Fbc78c460e7994e6A47f7AEe63E36709ab05D) |
| PayoutRouter (registry key `payoutAdapter`) | [`0x6d97634501b52D78c8dEb77a7d9105587DBAAf18`](https://robinhoodchain.blockscout.com/address/0x6d97634501b52D78c8dEb77a7d9105587DBAAf18) |
| MakerVault | [`0xfbC35FCc0508788b0a2eAF09bBb3Df04402d30A2`](https://robinhoodchain.blockscout.com/address/0xfbC35FCc0508788b0a2eAF09bBb3Df04402d30A2) |
| MakerRegistry | [`0x6FeecE6CbE97b4f0b453eD6373a599795BdBBeee`](https://robinhoodchain.blockscout.com/address/0x6FeecE6CbE97b4f0b453eD6373a599795BdBBeee) |
| RewardsDistributor (maker) | [`0x08F233c5E338a35F7Ba6cD16C729AB61f40325ce`](https://robinhoodchain.blockscout.com/address/0x08F233c5E338a35F7Ba6cD16C729AB61f40325ce) |
| ChainlinkFeedSource | [`0xD824c6488982473364039e3790063b8bF1f2Cc93`](https://robinhoodchain.blockscout.com/address/0xD824c6488982473364039e3790063b8bF1f2Cc93) |
| UniV3TwapSource | [`0x48B8d36bA9BB66A033094a84d52c95D20964C666`](https://robinhoodchain.blockscout.com/address/0x48B8d36bA9BB66A033094a84d52c95D20964C666) |
| DataStreamsSource (deployed; configured for no market) | [`0xF57BB92543de0cA0B97Dc862A31c8E5A32F6b5C5`](https://robinhoodchain.blockscout.com/address/0xF57BB92543de0cA0B97Dc862A31c8E5A32F6b5C5) |
| FeeSplitter (the protocol fee recipient) | [`0x52a5674FFD2aDe74738d2347ef1366Bdc1881C37`](https://robinhoodchain.blockscout.com/address/0x52a5674FFD2aDe74738d2347ef1366Bdc1881C37) |
| V4BuybackExecutor | [`0xE7Ae90cDCfF293C7434942bEF0aE7C7C59A39565`](https://robinhoodchain.blockscout.com/address/0xE7Ae90cDCfF293C7434942bEF0aE7C7C59A39565) |
| HouseVaultFactory | [`0x5BEa4c9887C322d5Ec8C7ae547c25091599774d2`](https://robinhoodchain.blockscout.com/address/0x5BEa4c9887C322d5Ec8C7ae547c25091599774d2) |
| House vault, NVDA | [`0xfb5CcB9CF9249E46D8Af0C4f8fe7Eaa9bD7BfF51`](https://robinhoodchain.blockscout.com/address/0xfb5CcB9CF9249E46D8Af0C4f8fe7Eaa9bD7BfF51) |
| House vault, SPCX | [`0x53eF3ff548Fe3EaA1A1c0a0E010ED0aBB5365201`](https://robinhoodchain.blockscout.com/address/0x53eF3ff548Fe3EaA1A1c0a0E010ED0aBB5365201) |
| EarnVault | [`0xf7d21652473014d1Ca0e22FF75420494cdd09164`](https://robinhoodchain.blockscout.com/address/0xf7d21652473014d1Ca0e22FF75420494cdd09164) |

The core contracts were created in the run that starts at block 69,512,673. The house vault factory (block 69,517,900), the two house vaults and the EarnVault (block 69,518,125) were created later in the same run, which is why their code appears after the start block.

A hedger, a lender rewards distributor and a stock venue adapter are part of the interface but are **not deployed**; the registry records `null` for each. `V4BuybackExecutor` is the one contract above with no privileged function, so it has no `authority()` and is not managed; every other contract above answers `authority()` with the AccessManager.

Do not substitute a local fork address, a v1 address, a legacy interface-7 address, or any other chain-4663 deployment for the current contracts. Confirm bytecode, registry settings and current role grants directly against the chain. This record establishes historical facts; roles, fees and listings can change later.

## Keys and accounts

Roles live on the AccessManager, not on each contract. [Roles](roles.md) explains what each lane can do and how long it waits.

{% hint style="danger" %}
The Admin Safe and the Treasury Safe are 2-of-3, but all three signing keys of each are the owner's, so the threshold protects against one key being stolen rather than giving independent custody. The Admin Safe also holds the guardian and quoter roles with no delay, so beside its delayed lanes it can pause, veto and quote immediately. The guardian, pricer, quoter and cranker are hot keys with no delay, and the operations lane that grants and revokes them has no delay either. Treat the compromise of any of these keys as a risk to new positions and unresolved payouts, and read the current grants on chain before funding a position.
{% endhint %}

| Holder | Chain-4663 address | What it holds |
|---|---|---|
| Admin Safe (2-of-3) | [`0x6f8A7B77b72511cD8939596b1659bA28C28f101B`](https://robinhoodchain.blockscout.com/address/0x6f8A7B77b72511cD8939596b1659bA28C28f101B) | `ADMIN` 0, `FEE_MANAGER` 1, `MARKET_FEE_MANAGER` 2, `CONFIG_ADMIN` 3, `TREASURY_ADMIN` 4, `LISTING` 5, `OPS_ADMIN` 6, and also `GUARDIAN` 7 and `QUOTER` 9 with no delay |
| Treasury Safe (2-of-3) | [`0x014b996a084690FB27265BfAC157b04e9FeBbF4E`](https://robinhoodchain.blockscout.com/address/0x014b996a084690FB27265BfAC157b04e9FeBbF4E) | No role. It receives the treasury half of protocol revenue from the FeeSplitter. |
| Guardian (hot key) | [`0x29741A8d283a253E8Ce10aDfd04C6507438b6F39`](https://robinhoodchain.blockscout.com/address/0x29741A8d283a253E8Ce10aDfd04C6507438b6F39) | `GUARDIAN` 7, no delay |
| Pricer (hot key) | [`0xD08Dd3DE51d8506EB1A436297525b5c1CDaE4c0f`](https://robinhoodchain.blockscout.com/address/0xD08Dd3DE51d8506EB1A436297525b5c1CDaE4c0f) | `PRICER` 8, no delay |
| Quoter (hot key) | [`0xdEd3B00ad516aaa8c049e963a8b6C7612cdb4992`](https://robinhoodchain.blockscout.com/address/0xdEd3B00ad516aaa8c049e963a8b6C7612cdb4992) | `QUOTER` 9, no delay |
| Cranker (hot key) | [`0xc9924324bD7f5b07adA32B7146E71F614c845d47`](https://robinhoodchain.blockscout.com/address/0xc9924324bD7f5b07adA32B7146E71F614c845d47) | `BUYBACK` 10, no delay |
| Deployer | [`0xEb82c3D0F89d47453F94f0C2b2a2752e27a19d9b`](https://robinhoodchain.blockscout.com/address/0xEb82c3D0F89d47453F94f0C2b2a2752e27a19d9b) | No role. Hand-back to the Safes is complete. |
| USDG | [`0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168`](https://robinhoodchain.blockscout.com/address/0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168) | Collateral, premium and payout currency, six decimals. It answers `Clearinghouse.usdg()`. |
| STONKHOUSE | [`0xc2525b7c68b6d66dE5AABFEDC7B13314F389D5C4`](https://robinhoodchain.blockscout.com/address/0xc2525b7c68b6d66dE5AABFEDC7B13314F389D5C4) | The token the FeeSplitter buys back and burns with half of protocol revenue. |

## Deployment record

| Release fact | Recorded value |
|---|---|
| Chain ID | `4663` |
| Deployment start block | `69512673`, 22 September 2026 at 08:29 UTC |
| Contract interface version | `8` |
| Deployed source | `callhouse-contracts` `70dd0c7`, the public release carrying the deployed revision. Its `src/` tree is byte-identical to the revision the deploy ran from, checked with `git rev-parse <revision>:src`. |
| Registry | `callhouse/ops/markets/tier1.json`, the top-level `v2` block, written back by the deploy, the externals step and the registration step. The interface-7 record is archived separately as `callhouse/ops/markets/v7-legacy.json`. |
| Launch markets | NVDA and SPCX only. No other market is registered on this set. |
| Launch verification | The deployer's `VerifyV8` passed on chain twice: 216 checks at the launch gate, and 208 on the read-back afterwards. Three externals that are not deployed were not checked. Receipt fingerprint `0xcbc78758…699f`. The checks read the deployed contracts' own configuration and wiring; the repository's pinned-runtime manifest still records the interface-7 set, so no v8 runtime was compared byte for byte against a compiled artifact. This is **not** a third-party audit and **not** explorer source-code verification; the contracts are unaudited. |
| Hand-back | The deployer key holds no role on the AccessManager: `hasRole(0, deployer)` read back `false` on 22 September 2026. |

## Launch markets

Both launch markets are registered on the Clearinghouse and both read as enabled on chain. That is a fact about the contracts, not a promise that a quote or a fill is available: the house vaults are not armed, no protocol account holds USDG, and the notifier is not running. Whether you can trade is an app and on-chain question, so check both.

| Market | Registration transaction | Block | House vault |
|---|---|---|---|
| NVDA | [`0x7e4b…f82b`](https://robinhoodchain.blockscout.com/tx/0x7e4b32c4038c593943f5926abb4f222bed5e066b6b4c3086cda413bf8a91f82b) | 69,520,039 | [`0xfb5CcB9CF9249E46D8Af0C4f8fe7Eaa9bD7BfF51`](https://robinhoodchain.blockscout.com/address/0xfb5CcB9CF9249E46D8Af0C4f8fe7Eaa9bD7BfF51) |
| SPCX | [`0xa254…b4d8`](https://robinhoodchain.blockscout.com/tx/0xa2542cdd5b24ea671cf52163d7fe8968b56328cea79f1e6e8d4c8c5c4acbb4d8) | 69,520,197 | [`0x53eF3ff548Fe3EaA1A1c0a0E010ED0aBB5365201`](https://robinhoodchain.blockscout.com/address/0x53eF3ff548Fe3EaA1A1c0a0E010ED0aBB5365201) |

Read on 22 September 2026, `Clearinghouse.market()` returns `(true, false, 2500000, 25, SettlementOracle, 0)` for NVDA and `(true, false, 1000000, 25, SettlementOracle, 0)` for SPCX: enabled, minting not paused, a strike tick of 2.50 USDG on NVDA and 1.00 USDG on SPCX at six decimals, an exercise fee of 0.25% of collateral pinned into each series at creation, and collateral rent of 0. Rent is not abolished. The contracts keep a bounded rent rate that the market-fee lane could switch on with 72 hours' notice, and each series pins the rate in force when it was created.

Both markets settle on two sources, the Chainlink feed and a Uniswap v3 pool, through the `SettlementOracle` above. Both house vaults report `protocolAccountsConfirmed()` as `false`, so neither takes orders yet.

The app registry records both markets as live, and the generated [Markets](../product/markets.md) page is rendered from it. Where a page and the chain disagree, the chain is the record.

## Verify each contract

Set `RH_RPC` and the address variables from the tables above. Interface-8 contracts hold no role table of their own: each inherits `Managed`, OpenZeppelin's `AccessManaged`, and answers `authority()` with the one AccessManager, which maps `(target, selector)` to a `uint64` role id and stores each member's execution delay. A `hasRole(bytes32,address)` call on an interface-8 contract reverts; there is no `bytes32` role anywhere in interface 8.

Start by checking that every managed target names the same manager. Leave `V4BuybackExecutor` out: it has no privileged function, so it has no `authority()` and the call reverts.

```sh
ACCESS_MANAGER=0xb663C1EAEeD4664515Cc864667263f3e75238da3
for T in "$CLEARINGHOUSE" "$ORDER_BOOK" "$SETTLEMENT_ORACLE" "$EXPIRY_CALENDAR" "$KEEPER_REWARDS" \
         "$AUTO_ROLLER" "$PAYOUT_ROUTER" "$MAKER_VAULT" "$MAKER_REGISTRY" "$REWARDS_DISTRIBUTOR" \
         "$CHAINLINK_SOURCE" "$UNIV3_SOURCE" "$DATA_STREAMS_SOURCE" "$FEE_SPLITTER" \
         "$HOUSE_VAULT_FACTORY" "$HOUSE_VAULT_NVDA" "$HOUSE_VAULT_SPCX" "$EARN_VAULT"; do
  cast call "$T" "authority()(address)" --rpc-url "$RH_RPC"   # $ACCESS_MANAGER
done
```

Next, read who holds which role. `hasRole(uint64,address)` returns `(isMember, executionDelay)`; the delay in seconds is what decides whether that holder can send the call now or must schedule it and wait.

| Role | Id | Execution delay |
|---|---|---|
| `ADMIN` | 0 | 172800 seconds, 48 hours |
| `FEE_MANAGER` | 1 | 172800 seconds, 48 hours |
| `MARKET_FEE_MANAGER` | 2 | 259200 seconds, 72 hours |
| `CONFIG_ADMIN` | 3 | 86400 seconds, 24 hours |
| `TREASURY_ADMIN` | 4 | 86400 seconds, 24 hours |
| `LISTING` | 5 | 3600 seconds, 1 hour |
| `OPS_ADMIN` | 6 | 0 |
| `GUARDIAN` | 7 | 0 |
| `PRICER` | 8 | 0 |
| `QUOTER` | 9 | 0 |
| `BUYBACK` | 10 | 0 |

```sh
cast call "$ACCESS_MANAGER" "hasRole(uint64,address)(bool,uint32)" 0  "$ADMIN_SAFE"  --rpc-url "$RH_RPC"  # true 172800
cast call "$ACCESS_MANAGER" "hasRole(uint64,address)(bool,uint32)" 5  "$ADMIN_SAFE"  --rpc-url "$RH_RPC"  # true 3600
cast call "$ACCESS_MANAGER" "hasRole(uint64,address)(bool,uint32)" 7  "$GUARDIAN"    --rpc-url "$RH_RPC"  # true 0
cast call "$ACCESS_MANAGER" "hasRole(uint64,address)(bool,uint32)" 8  "$PRICER"      --rpc-url "$RH_RPC"  # true 0
cast call "$ACCESS_MANAGER" "hasRole(uint64,address)(bool,uint32)" 9  "$QUOTER"      --rpc-url "$RH_RPC"  # true 0
cast call "$ACCESS_MANAGER" "hasRole(uint64,address)(bool,uint32)" 10 "$CRANKER"     --rpc-url "$RH_RPC"  # true 0
cast call "$ACCESS_MANAGER" "hasRole(uint64,address)(bool,uint32)" 0  "$DEPLOYER"    --rpc-url "$RH_RPC"  # false 0
cast call "$ADMIN_SAFE" "getThreshold()(uint256)" --rpc-url "$RH_RPC"                                     # 2
```

To see which lane a given function sits in, ask the manager for its role:

```sh
SEL=$(cast sig "setFeeParams((uint16,uint16,uint32,uint16,uint16))")
cast call "$ACCESS_MANAGER" "getTargetFunctionRole(address,bytes4)(uint64)" "$ORDER_BOOK" "$SEL" --rpc-url "$RH_RPC"  # 1
```

Check the core links as well:

```sh
cast call "$CLEARINGHOUSE" "usdg()(address)" --rpc-url "$RH_RPC"                  # 0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168
cast call "$CLEARINGHOUSE" "payoutAdapter()(address)" --rpc-url "$RH_RPC"         # $PAYOUT_ROUTER
cast call "$CLEARINGHOUSE" "feeRecipient()(address)" --rpc-url "$RH_RPC"          # $FEE_SPLITTER
cast call "$ORDER_BOOK" "clearinghouse()(address)" --rpc-url "$RH_RPC"            # $CLEARINGHOUSE
cast call "$SETTLEMENT_ORACLE" "SETTLEMENT_WINDOW()(uint32)" --rpc-url "$RH_RPC"  # 1800
cast call "$CLEARINGHOUSE" "market(address)((bool,bool,uint64,uint16,address,uint32))" "$NVDA" --rpc-url "$RH_RPC"
```

`market()` returns `(enabled, mintPaused, strikeTick, exerciseFeeBps, oracle, mintFeePpm)`.

A later grant, revocation or mapping change alters any of these results, so compare them with the manager's current `RoleGranted`, `RoleRevoked` and `TargetFunctionRoleUpdated` events. Compare `cast code` with the compiled artifacts of the deployed source recorded above, and with the registry's deploy block. Non-empty bytecode, a matching authority, or a role result on its own does not prove source identity.

## Legacy: the interface-7 set

These 13 contracts were deployed for the 18 September 2026 dev launch and are the superseded run-off set. They are **not frozen**. They are still on chain, the legacy Clearinghouse still reports `createPaused()` as `false` and its NVDA market as enabled with an 80 ppm collateral rent, and the positions opened on them still settle there. Freezing them is a separate owner action that has not been taken. Each set answers only for its own series: do not use an interface-8 address to act on a legacy position, and do not use a legacy address to act on a current one.

[Interface v7 reference](../legacy/v7-reference.md) records this set in full: the fees it charged, the single admin account it still answers to, and what to do with a position that is still open on it.

These are not the v1 contracts. The earlier v1 product's run-off is described under [Moving from v1](../legacy/moving-from-v1.md) and [v1 reference](../legacy/v1-reference.md).

| Legacy contract | Chain-4663 address |
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

### Legacy deployment record

| Release fact | Recorded value |
|---|---|
| Chain ID | `4663` |
| Deployment start block | `65780341` |
| Contract interface version | `7` |
| Deployed source | `callhouse-contracts` `1b08755`, the frozen dev-launch revision. All 13 live runtimes matched its compiled artifacts outside immutables at the launch verification. Source later than `1b08755` is not a match for these runtimes, the interface-8 line least of all, so compare `cast code` only with the `1b08755` artifacts. |
| Launch registry | `ops/markets/dev.json` SHA-256 `f3c8e679448a96cc910a6f10d879a56d8e73642d263f154d967527996f736905` at 18 September 2026 01:15 UTC. The durable copy of this set is archived as `callhouse/ops/markets/v7-legacy.json`; `dev.json` itself has since been repurposed for interface 8 and no longer records these addresses. |
| Launch market | NVDA only; registered in [transaction `0x193b…7a6ea`](https://robinhoodchain.blockscout.com/tx/0x193b514124fc9fb83d419e2e981c0e5369ce2a19e44671cbb69bee6f2807a6ea) |
| Launch verification | The deployer's `VerifyV2` completed 121 on-chain checks. These are **not** a third-party audit or explorer source-code verification. |

### Verify a legacy contract

These contracts keep their roles themselves, in OpenZeppelin `AccessControl`, with the externally owned account `0xEb82c3D0F89d47453F94f0C2b2a2752e27a19d9b` as the admin of all 13 and as the fee recipient: one hot key, no Safe, no manager and no delay. The recipe below applies to the legacy set only. Against an interface-8 address every one of these calls reverts, because interface 8 has no `bytes32` role.

```sh
ADMIN=0xEb82c3D0F89d47453F94f0C2b2a2752e27a19d9b
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

## Related

* [Architecture](architecture.md)
* [Roles](roles.md)
* [Security](security.md)
* [Markets](../product/markets.md)
* [Interface v7 reference](../legacy/v7-reference.md)
* [Moving from v1](../legacy/moving-from-v1.md)

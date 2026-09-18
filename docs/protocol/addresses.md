# Addresses

Use the approved production registry and on-chain calls to verify v2 contracts after the owner's public production deployment. Local fork addresses are temporary. A separate dev contract set was deployed on Robinhood Chain 4663 for testing; its manifest, even with valid transactions, is not the public production address record.

{% hint style="warning" %}
Stonkhouse v2 is unaudited and has no public production release. A separate chain-4663 dev deployment is for testing, not public trading. Stock Tokens carry market and issuer risks. Buyers can lose their full cost; writers can lose collateral. Stonkhouse is not available to US persons. Read [Risks](../resources/risks.md) before using the product.
{% endhint %}

Where the prose and the code disagree, the code is the specification. The public production registry is `callhouse/ops/markets/tier1.json`. Its v2 `deployBlock` and contract addresses remain pending in this documentation candidate. Fill this table only from the owner's verified **production** deployment manifest and transaction receipts, after the separate dev test and owner release gates.

| V2 contract | Public production address | Deploy block |
|---|---|---|
| Clearinghouse | Pending verified production record | — |
| OrderBook | Pending verified production record | — |
| SettlementOracle | Pending verified production record | — |
| ExpiryCalendar | Pending verified production record | — |
| ChainlinkFeedSource | Pending verified production record | — |
| UniV3TwapSource | Pending verified production record | — |
| DataStreamsSource (built, disabled) | Pending verified production record | — |
| KeeperRewards | Pending verified production record | — |
| AutoRoller | Pending verified production record | — |
| UniV3PayoutAdapter | Pending verified production record | — |
| MakerVault | Pending verified production record | — |
| MakerRegistry | Pending verified production record | — |
| RewardsDistributor | Pending verified production record | — |

## Production address record

| Release fact | Value to fill from evidence |
|---|---|
| Public production chain ID | `4663` (confirm against the deployment RPC) |
| Final reviewed contracts SHA and interface version | Pending final patch and owner release record |
| Canonical ABI export and app submodule SHAs | Pending matching consumer build |
| Approved registry SHA, rent rates and two-pool source selection | Pending final registry and generated Markets page |
| Separate dev manifest, deploy block and read-only acceptance | Recorded separately from production; keep its addresses out of the table above |
| Public production manifest, deploy block and receipts | Pending owner production deployment evidence |
| Runtime bytecode, roles, fee settings and market source checks | Pending production read-only verification |

Do not copy a fork address, a dev preview URL or a chain-4663 dev address into the public production table. If the owner has not authorised a public production release, leave every production address pending.

## Verify each contract

After addresses and the admin account are published, set `RH_RPC`, `ADMIN` and the address variables from the verified deployment record. Each contract uses OpenZeppelin `AccessControl`; the following `cast call` checks its deploy-time admin role. The expected decoded output on each line is `true`. A later role transfer can change the result, so compare with current `RoleGranted` and `RoleRevoked` events. Also compare `cast code` with the verified runtime bytecode and the registry's deploy block. A nonempty bytecode or admin result by itself does not prove source identity.

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

Check the core links as well once deployed:

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

# Contracts and addresses

{% hint style="warning" %}
**The Stonkhouse vault is not deployed yet.** There is no Stonkhouse vault address, no library address, no Stonkhouse clearinghouse address, no admin address and no fee recipient address. They will be published on this page at launch.

Until then, treat any address that claims to be the Stonkhouse vault as unverified. After deployment, trust only the addresses listed here, and check them on chain as described below. Do not trust an address from anywhere else: a message, a social post, a search result, or another site's config.
{% endhint %}

## Chain

| Parameter | Value |
|---|---|
| Network | Robinhood Chain (Arbitrum Orbit L2, settles to Ethereum mainnet) |
| Chain ID | `4663` (`0x1237`) |
| Native currency | ETH |
| Contract code size limit | 98,304 bytes (not EIP-170's 24,576) |
| Public RPC | `https://rpc.mainnet.chain.robinhood.com` |
| Backup RPC | `https://robinhood-rpc.publicnode.com` (rejects historical `eth_getLogs` without a personal token) |
| Explorer | `https://robinhoodchain.blockscout.com` |

Blockscout for chain 4663 sits behind a Cloudflare challenge. Browsers get through it, but scripted clients that send no `Referer` header receive an HTML page instead of JSON (`ops/addresses.json`). Both public RPCs return HTTP 403 to clients that send no `User-Agent`.

## Stonkhouse contracts

Published at launch. Every row is empty today.

| Contract | Address | Notes |
|---|---|---|
| Vault (`cNVDA` shares) | published at launch | Holds the collateral. Is the Valorem writer (inside fills only), the Seaport offerer, and the Seaport zone of its own listing |
| `SeaportOrderLib` | published at launch | Linked public library |
| `ValoremLib` | published at launch | Linked public library |
| `ValoremOptionsClearinghouse` (Stonkhouse's own instance) | published at launch | Deployed by `script/DeployClear.s.sol` from the upstream Valorem Clear artifact (commit `6436c823`), with `feeTo` set to the vault admin. The vault settles every option on it. See [Architecture](architecture.md#the-clearinghouse-is-a-deploy-time-choice). |
| Admin (bootstrap key, later an Admin Safe 2 of 3) | published at launch | Holds `DEFAULT_ADMIN_ROLE`. At launch this is one hot key, the deployer's; it moves to a 2-of-3 Admin Safe through `script/HandoverAdmin.s.sol`. See [Roles and admin powers](roles.md). |
| Fee recipient | published at launch | Receives the protocol fee (5% of premium); holds no role |

The keeper and guardian addresses can be checked with `hasRole` once published. Role identifiers are on [Roles and admin powers](roles.md).

## Third-party contracts on chain 4663

These contracts are not Stonkhouse's. Stonkhouse does not control, upgrade or audit them. Addresses are copied from `ops/addresses.json` in the app repository, where each is marked `confirmed: true` (re-read on chain at block 61,322,378 on 2026-09-12). The first four match the constants in `script/Deploy.s.sol` character for character.

| Contract | Address | What it is |
|---|---|---|
| Seaport 1.6 | [`0x0000000000000068F116a894984e2DB1123eB395`](https://robinhoodchain.blockscout.com/address/0x0000000000000068F116a894984e2DB1123eB395) | Canonical Seaport deployment (`information()` reports version `1.6`). The vault lists its calls here as offerer and zone, pre-validates the order, and Seaport calls the vault's `authorizeOrder` and `validateOrder` on every fill. `script/Verify.s.sol` pins its runtime hash. |
| USDG | [`0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168`](https://robinhoodchain.blockscout.com/address/0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168) | The premium and strike currency, 6 decimals, behind a proxy. Issued by Paxos. |
| NVDA Stock Token | [`0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC`](https://robinhoodchain.blockscout.com/address/0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC) | The vault's underlying asset and the option types' `underlyingAsset`. 18 decimals, beacon proxy. Exposes `oraclePaused()` (checked before an arm, a listing and every fill) and `uiMultiplier()` (display only). |
| Chainlink RHNVDA/USD | [`0x379EC4f7C378F34a1B47E4F3cbeBCbAC3E8E9F15`](https://robinhoodchain.blockscout.com/address/0x379EC4f7C378F34a1B47E4F3cbeBCbAC3E8E9F15) | Chainlink `AggregatorProxy`, description `RHNVDA / USD`, 8 decimals, market hours `us_equities_24/5`. The vault's spot source for the arm, listing and fill gates and the UI. Never read during settlement. |
| Valorem TokenURIGenerator | [`0xE53cCB924d27f421a91b59087587fD866C5d64c7`](https://robinhoodchain.blockscout.com/address/0xE53cCB924d27f421a91b59087587fD866C5d64c7) | Renders option and claim metadata. `script/DeployClear.s.sol` points Stonkhouse's clearinghouse at it by default. Only the clearinghouse's `uri()` reads it; writing, exercising, redeeming and Seaport fills never do. |

There is no Chainlink sequencer uptime feed on chain 4663 (`ops/addresses.json`, `sequencerUptimeFeed`).

{% hint style="info" %}
**History.** Earlier designs bound the vault to Overcall's NVDA registry, listed on Overcall's order book with a 5% fee item paid to Overcall's fee address, and settled on the Valorem clearinghouse instance Overcall uses (`0x9a7b…C0C0`). The current vault has no registry parameter, no Overcall fee item and no Overcall dependency, and the launch plan settles on Stonkhouse's own clearinghouse. None of those Overcall addresses belongs in a check of the Stonkhouse vault.
{% endhint %}

## Checking a deployed vault

Once the vault address is published here, you can check its wiring yourself with any RPC. For example:

```bash
export RH_RPC=https://rpc.mainnet.chain.robinhood.com
cast call $VAULT "asset()(address)"          --rpc-url $RH_RPC   # 0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC
cast call $VAULT "usdg()(address)"           --rpc-url $RH_RPC   # 0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168
cast call $VAULT "seaport()(address)"        --rpc-url $RH_RPC   # 0x0000000000000068F116a894984e2DB1123eB395
cast call $VAULT "priceFeed()(address)"      --rpc-url $RH_RPC   # 0x379EC4f7C378F34a1B47E4F3cbeBCbAC3E8E9F15
cast call $VAULT "clear()(address)"          --rpc-url $RH_RPC   # the Stonkhouse clearinghouse listed above
cast call $VAULT "seaportZone()(address)"    --rpc-url $RH_RPC   # the vault's own address
cast call $VAULT "conduitKey()(bytes32)"     --rpc-url $RH_RPC   # 0x0000000000000000000000000000000000000000000000000000000000000000
cast call $VAULT "feeRecipient()(address)"   --rpc-url $RH_RPC   # the fee recipient listed above
cast call $CLEAR "feesEnabled()(bool)"       --rpc-url $RH_RPC   # false at deployment
cast call $CLEAR "feeTo()(address)"          --rpc-url $RH_RPC   # the admin listed above
cast call $VAULT "hasRole(bytes32,address)(bool)" \
  0x0000000000000000000000000000000000000000000000000000000000000000 $ADMIN --rpc-url $RH_RPC   # true for the admin listed above
```

The full post-deploy check is `script/Verify.s.sol` in the `callhouse-contracts` repository. It compares the vault's and both libraries' bytecode with the deployed commit's build, and checks every immutable, parameter and role.

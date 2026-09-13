# Contracts and addresses

{% hint style="warning" %}
**The Callhouse vault is not deployed yet.** There is no Callhouse vault address, no library address, no admin Safe address and no fee Safe address. They will be published on this page after deployment.

Until then, treat any address that claims to be the Callhouse vault as unverified. After deployment, trust only the addresses listed here, and check them on chain as described below. Do not trust an address from anywhere else: a message, a social post, a search result, or another site's config.
{% endhint %}

## Chain

| Parameter | Value |
|---|---|
| Network | Robinhood Chain (Arbitrum Orbit L2, settles to Ethereum mainnet) |
| Chain ID | `4663` (`0x1237`) |
| Native currency | ETH |
| Public RPC | `https://rpc.mainnet.chain.robinhood.com` |
| Backup RPC | `https://robinhood-rpc.publicnode.com` (rejects historical `eth_getLogs` without a personal token) |
| Explorer | `https://robinhoodchain.blockscout.com` |

Blockscout for chain 4663 sits behind a Cloudflare challenge. Browsers get through it, but scripted clients that send no `Referer` header receive an HTML page instead of JSON (`ops/addresses.json`). Both public RPCs return HTTP 403 to clients that send no `User-Agent`.

## Callhouse contracts

Filled in at deployment. Every row is empty today.

| Contract | Address | Notes |
|---|---|---|
| Vault (`cNVDA` shares) | not deployed | Holds the collateral, is the Valorem writer and the Seaport offerer |
| `SeaportOrderLib` | not deployed | Linked public library |
| `ValoremLib` | not deployed | Linked public library |
| Admin Safe (2 of 3) | not deployed | Holds `DEFAULT_ADMIN_ROLE` |
| Fee Safe | not deployed | Receives the protocol fee; holds no role |

The keeper and guardian addresses can be checked with `hasRole` once published. Role identifiers are on [Roles and admin powers](roles.md).

## Third-party contracts on chain 4663

These contracts are not Callhouse's. Callhouse does not control, upgrade or audit them. Addresses are copied from `ops/addresses.json` in the app repository, where each is marked `confirmed: true` (re-read on chain at block 61322378 on 2026-09-12). They match the constants in `script/Deploy.s.sol` and `script/Verify.s.sol` character for character.

| Contract | Address | What it is |
|---|---|---|
| Valorem Clear | [`0x9a7b40e5c1dB1Af822ef091c990b58b02C78C0C0`](https://robinhoodchain.blockscout.com/address/0x9a7b40e5c1dB1Af822ef091c990b58b02C78C0C0) | `ValoremOptionsClearinghouse`. Its runtime bytecode matches upstream `valorem-core` at commit `6436c823` apart from the metadata trailer (`ops/recon/R4-valorem-abi.md`). Holds written collateral, mints the option ERC-1155 and the claim NFT, and settles exercise and redemption. It has a 15 bps notional engine fee that is currently switched off. |
| Seaport 1.6 | [`0x0000000000000068F116a894984e2DB1123eB395`](https://robinhoodchain.blockscout.com/address/0x0000000000000068F116a894984e2DB1123eB395) | Canonical Seaport deployment (`information()` reports version `1.6`). The vault lists option tokens here as offerer. |
| USDG | [`0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168`](https://robinhoodchain.blockscout.com/address/0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168) | The premium and strike currency, 6 decimals, behind a proxy. |
| NVDA Stock Token | [`0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC`](https://robinhoodchain.blockscout.com/address/0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC) | The vault's underlying asset and Valorem's `underlyingAsset`. 18 decimals, beacon proxy. Exposes `oraclePaused()` (checked before writes) and `uiMultiplier()` (display only). |
| Overcall registry, NVDA market | [`0x8E973cE1A6884E28Ad3E377d5f670Bc0b463f4EA`](https://robinhoodchain.blockscout.com/address/0x8E973cE1A6884E28Ad3E377d5f670Bc0b463f4EA) | `OvercallRegistry` for the NVDA market: `collateralToken` is NVDA, `exerciseToken` is USDG, `clearinghouse` is Valorem Clear. Sets each cycle's approved rungs, timestamps and lot size. Verified source, not a proxy. This is the registry the vault binds to. |
| Overcall fee recipient | [`0xdAe7e82A2E7D566C67E87C164B05a1C560190782`](https://robinhoodchain.blockscout.com/address/0xdAe7e82A2E7D566C67E87C164B05a1C560190782) | An EOA. Receives consideration item 1, Overcall's 5% of gross premium, on every fill. It is also Valorem Clear's `feeTo`, the key that can switch Valorem's engine fee on. |
| Chainlink RHNVDA/USD | [`0x379EC4f7C378F34a1B47E4F3cbeBCbAC3E8E9F15`](https://robinhoodchain.blockscout.com/address/0x379EC4f7C378F34a1B47E4F3cbeBCbAC3E8E9F15) | Chainlink `AggregatorProxy`, description `RHNVDA / USD`, 8 decimals, market hours `us_equities_24/5`. The vault's spot source for the write gates and the UI. Never read during settlement. |

{% hint style="warning" %}
**The JUGGERNAUT registry is not Callhouse's.** Overcall's frontend config for chain 4663 has a top-level `registry` key set to `0x65dD407955912Be814f723724cE60f91ebd72616`. That is the OvercallRegistry for the **JUGGERNAUT** market, not NVDA. It has the same bytecode and answers the same getters, but its `collateralToken` is a different token. The Callhouse vault's constructor reverts `RegistryAssetMismatch` for any registry whose collateral, exercise token or clearinghouse do not match. The deploy script repeats that check before broadcasting.
{% endhint %}

The NVDA registry, and every other Overcall registry on this chain, is owned by the single EOA `0x408adcFFebDF48EC23F1E3811A91AeD3cC951CC0`. That owner sets the weekly cycle but holds no funds (`ops/recon/R1-overcall-registry.md` §6).

## Checking a deployed vault

Once the vault address is published here, you can check its wiring yourself with any RPC. For example:

```bash
export RH_RPC=https://rpc.mainnet.chain.robinhood.com
cast call $VAULT "registry()(address)"             --rpc-url $RH_RPC   # 0x8E973cE1A6884E28Ad3E377d5f670Bc0b463f4EA
cast call $VAULT "asset()(address)"                --rpc-url $RH_RPC   # 0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC
cast call $VAULT "usdg()(address)"                 --rpc-url $RH_RPC   # 0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168
cast call $VAULT "clear()(address)"                --rpc-url $RH_RPC   # 0x9a7b40e5c1dB1Af822ef091c990b58b02C78C0C0
cast call $VAULT "seaport()(address)"              --rpc-url $RH_RPC   # 0x0000000000000068F116a894984e2DB1123eB395
cast call $VAULT "priceFeed()(address)"            --rpc-url $RH_RPC   # 0x379EC4f7C378F34a1B47E4F3cbeBCbAC3E8E9F15
cast call $VAULT "overcallFeeRecipient()(address)" --rpc-url $RH_RPC   # 0xdAe7e82A2E7D566C67E87C164B05a1C560190782
cast call $VAULT "feeRecipient()(address)"         --rpc-url $RH_RPC   # the fee Safe listed above
cast call $VAULT "hasRole(bytes32,address)(bool)" \
  0x0000000000000000000000000000000000000000000000000000000000000000 $SAFE_ADMIN --rpc-url $RH_RPC   # true
```

The full post-deploy check is `script/Verify.s.sol` in the `callhouse-contracts` repository.

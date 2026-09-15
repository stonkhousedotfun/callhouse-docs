# Contracts and addresses

{% hint style="warning" %}
**Trust only the addresses on this page, and check them on chain yourself** with the commands below. Do not trust an address from anywhere else: a message, a social post, a search result, or another site's config.

The vault is live on Robinhood Chain and has had no external audit. Its admin role is held by one hot key with no timelock. See [Security and audits](security.md) and [Roles and admin powers](roles.md).
{% endhint %}

## Chain

| Parameter | Value |
|---|---|
| Network | Robinhood Chain (Arbitrum Orbit L2, settles to Ethereum mainnet) |
| Chain ID | `4663` (`0x1237`) |
| Native currency | ETH |
| Contract code size limit | 98,304 bytes, not EIP-170's 24,576. The vault's runtime is 25,775 bytes. |
| Public RPC | `https://rpc.mainnet.chain.robinhood.com` (not an archive node: historical state reads fail) |
| Backup RPC | `https://robinhood-rpc.publicnode.com` (rejects historical `eth_getLogs` without a personal token) |
| Explorer | `https://robinhoodchain.blockscout.com` |

Blockscout for chain 4663 sits behind a Cloudflare challenge. Browsers get through it, but scripted clients that send no `Referer` header receive an HTML page instead of JSON. Both public RPCs return HTTP 403 to requests carrying Python's default `User-Agent` (`Python-urllib`); a request with no `User-Agent` header is answered normally.

## Every live address and role holder

Each row below was read with `cast` against `https://rpc.mainnet.chain.robinhood.com` on 2026-09-15 (around block 63,817,000). The "Checked with" column is the read that ties the address to the vault.

| What | Address | Checked with | Notes |
|---|---|---|---|
| Vault (share token `Callhouse NVDA` / `cNVDA`) | [`0x88a98931E3682137E7e4D3426f623247f4A4ecbb`](https://robinhoodchain.blockscout.com/address/0x88a98931E3682137E7e4D3426f623247f4A4ecbb) | 25,775 bytes of code; `name()` = `"Callhouse NVDA"`, `symbol()` = `"cNVDA"`, `seaportZone()` = its own address | Holds the collateral. It is the Valorem writer (inside fills only), the Seaport offerer, and the Seaport zone of its own listing. The on-chain name dates from before the product was renamed Stonkhouse. Not upgradeable. |
| Valorem Clear (Stonkhouse's own instance) | [`0x53d7A6d0489Daf3d67b9A314e0eAB2B78Acab9C6`](https://robinhoodchain.blockscout.com/address/0x53d7A6d0489Daf3d67b9A314e0eAB2B78Acab9C6) | `vault.clear()`; 16,110 bytes of code | Settles every option the vault writes; the week's option token is its ERC-1155. `feesEnabled()` = `false`, `feeBps()` = `15`. **Not source-verified** (see [Source verification](#source-verification)). |
| `SeaportOrderLib` | [`0x6B617a0B578Ef6EDCD07774468f08b3778272D8A`](https://robinhoodchain.blockscout.com/address/0x6B617a0B578Ef6EDCD07774468f08b3778272D8A) | Linked into the vault's runtime (the address appears in its bytecode); 5,170 bytes of code | Linked public library: the listing shape check and the Seaport encoders |
| `ValoremLib` | [`0xd3CB94893EAb55e425cCd77Db98458b38D75Fa3d`](https://robinhoodchain.blockscout.com/address/0xd3CB94893EAb55e425cCd77Db98458b38D75Fa3d) | Linked into the vault's runtime; 5,993 bytes of code | Linked public library: the arm gate, the fill gate and write, the claim redeem, the oracle reads |
| Seaport 1.6 | [`0x0000000000000068F116a894984e2DB1123eB395`](https://robinhoodchain.blockscout.com/address/0x0000000000000068F116a894984e2DB1123eB395) | `vault.seaport()`; `information()` reports version `"1.6"` | Canonical third-party deployment. The vault lists its calls here and pre-validates the order; Seaport calls the vault's `authorizeOrder` and `validateOrder` on every fill. `vault.conduitKey()` is zero, so no conduit is involved. |
| USDG | [`0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168`](https://robinhoodchain.blockscout.com/address/0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168) | `vault.usdg()`; `decimals()` = `6` | Third party (Paxos), behind a proxy. The premium and strike currency. |
| NVDA Stock Token | [`0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC`](https://robinhoodchain.blockscout.com/address/0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC) | `vault.asset()`; `decimals()` = `18` | Third party, beacon proxy. The vault's underlying asset and the option types' underlying. Exposes `oraclePaused()` (checked before an arm, a listing and every fill) and `uiMultiplier()` (display only). |
| Chainlink RHNVDA/USD | [`0x379EC4f7C378F34a1B47E4F3cbeBCbAC3E8E9F15`](https://robinhoodchain.blockscout.com/address/0x379EC4f7C378F34a1B47E4F3cbeBCbAC3E8E9F15) | `vault.priceFeed()`; `description()` = `"RHNVDA / USD"`, `decimals()` = `8` | Third-party price feed. Read only by `rollOpen`, `approveListing`, every fill and the `spotUsdg()` view, never during settlement. |
| Admin (`DEFAULT_ADMIN_ROLE`) | [`0xEb82c3D0F89d47453F94f0C2b2a2752e27a19d9b`](https://robinhoodchain.blockscout.com/address/0xEb82c3D0F89d47453F94f0C2b2a2752e27a19d9b) | `hasRole(0x00…00, 0xEb82…9d9b)` = `true`; the keeper and guardian return `false` | A hot EOA (no code), the deployer of the vault and the Clear. No timelock. The handover of this role to a Safe is planned and has not happened. |
| Keeper (`KEEPER_ROLE`) | [`0x06c131cfEd73A56893f5eB52D17252856FAFC1d2`](https://robinhoodchain.blockscout.com/address/0x06c131cfEd73A56893f5eB52D17252856FAFC1d2) | `hasRole(0xfc87…4fab, 0x06c1…C1d2)` = `true`; the admin returns `false` | Hot EOA run by the keeper service |
| Guardian (`GUARDIAN_ROLE`) | [`0x29741A8d283a253E8Ce10aDfd04C6507438b6F39`](https://robinhoodchain.blockscout.com/address/0x29741A8d283a253E8Ce10aDfd04C6507438b6F39) | `hasRole(0x5543…5041, 0x2974…6F39)` = `true`; the admin and keeper return `false` | EOA |
| Protocol fee recipient | [`0xEb82c3D0F89d47453F94f0C2b2a2752e27a19d9b`](https://robinhoodchain.blockscout.com/address/0xEb82c3D0F89d47453F94f0C2b2a2752e27a19d9b) | `vault.feeRecipient()` | The same hot EOA as the admin. Receives the protocol fee (`protocolFeeBps` = 500, 5% of premium). The admin can change it with `setFeeRecipient`. |
| Clear fee switch holder (`feeTo`) | [`0xff1454009F024507f3E455eb2027E98fAF4ccF61`](https://robinhoodchain.blockscout.com/address/0xff1454009F024507f3E455eb2027E98fAF4ccF61) | `clear.feeTo()`; Safe `VERSION()` = `"1.4.1"`, `getThreshold()` = `1`, `nonce()` = `0` | A 1-of-1 Safe. It holds the Clear's 15 bps engine fee switch and holds no role on the vault. |
| Owner of the `feeTo` Safe | [`0x7A3a8C3F6331f63107D5b3aEeA0515e799022C32`](https://robinhoodchain.blockscout.com/address/0x7A3a8C3F6331f63107D5b3aEeA0515e799022C32) | Safe `getOwners()` = `[0x7A3a…2C32]` | EOA. Its one signature is enough to act as the Safe. |
| Valorem TokenURIGenerator | [`0xE53cCB924d27f421a91b59087587fD866C5d64c7`](https://robinhoodchain.blockscout.com/address/0xE53cCB924d27f421a91b59087587fD866C5d64c7) | `clear.tokenURIGenerator()` | Third party. Renders option and claim metadata for the Clear's `uri()` only; writing, exercising, redeeming and fills never read it. |

Role identifiers: `DEFAULT_ADMIN_ROLE` is `0x0000000000000000000000000000000000000000000000000000000000000000`, `KEEPER_ROLE` is `0xfc8737ab85eb45125971625a9ebdb75cc78e01d5c1fa80c4c6e5203f47bc4fab`, and `GUARDIAN_ROLE` is `0x55435dd261a4b9b3364963f7738a7a662ad9c84396d64be3365284bb7f0a5041`. The vault uses plain `AccessControl`, so holders cannot be listed from the contract. Since deployment it has emitted exactly three `RoleGranted` events (admin, keeper, guardian) and no `RoleRevoked`.

There is no Chainlink sequencer uptime feed on chain 4663.

## Source verification

| Contract | Sourcify | Blockscout |
|---|---|---|
| Vault | `match` on both creation and runtime bytecode: a partial match, meaning the compiled code matches the published source but the metadata hash does not | Partially verified |
| `SeaportOrderLib` | Runtime `match` (partial); no creation-bytecode result recorded | Not verified |
| `ValoremLib` | Runtime `match` (partial); no creation-bytecode result recorded | Not verified |
| Valorem Clear `0x53d7…C6` | **Not verified** | **Not verified** |

**The Clear is not yet source-verified.** Its 16,110-byte runtime is byte-for-byte identical to the Valorem Clear at [`0x9a7b40e5c1dB1Af822ef091c990b58b02C78C0C0`](https://robinhoodchain.blockscout.com/address/0x9a7b40e5c1dB1Af822ef091c990b58b02C78C0C0) except for the 32-byte IPFS hash inside the trailing CBOR metadata (bytes 16,067 to 16,098). That other instance is an `exact_match` on Sourcify, and its source is upstream `valorem-core` at commit `6436c823`. You can repeat the comparison with `cast code` on both addresses. It shows the two runtimes are the same code; it is not a source verification of `0x53d7…C6` itself. The `0x9a7b…C0` instance is the one Overcall uses. It is not the vault's clearinghouse, and nothing in a check of the Stonkhouse vault should point at it.

## Checking the vault yourself

```bash
export RH_RPC=https://rpc.mainnet.chain.robinhood.com
export VAULT=0x88a98931E3682137E7e4D3426f623247f4A4ecbb
export CLEAR=0x53d7A6d0489Daf3d67b9A314e0eAB2B78Acab9C6
export FEE_SAFE=0xff1454009F024507f3E455eb2027E98fAF4ccF61

cast call $VAULT "asset()(address)"          --rpc-url $RH_RPC   # 0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC
cast call $VAULT "usdg()(address)"           --rpc-url $RH_RPC   # 0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168
cast call $VAULT "seaport()(address)"        --rpc-url $RH_RPC   # 0x0000000000000068F116a894984e2DB1123eB395
cast call $VAULT "priceFeed()(address)"      --rpc-url $RH_RPC   # 0x379EC4f7C378F34a1B47E4F3cbeBCbAC3E8E9F15
cast call $VAULT "clear()(address)"          --rpc-url $RH_RPC   # 0x53d7A6d0489Daf3d67b9A314e0eAB2B78Acab9C6
cast call $VAULT "seaportZone()(address)"    --rpc-url $RH_RPC   # 0x88a98931E3682137E7e4D3426f623247f4A4ecbb (the vault)
cast call $VAULT "conduitKey()(bytes32)"     --rpc-url $RH_RPC   # 0x0000000000000000000000000000000000000000000000000000000000000000
cast call $VAULT "feeRecipient()(address)"   --rpc-url $RH_RPC   # 0xEb82c3D0F89d47453F94f0C2b2a2752e27a19d9b
cast call $VAULT "hasRole(bytes32,address)(bool)" \
  0x0000000000000000000000000000000000000000000000000000000000000000 \
  0xEb82c3D0F89d47453F94f0C2b2a2752e27a19d9b --rpc-url $RH_RPC      # true
cast call $VAULT "policy()(uint16,uint16,uint16,uint16,uint16,uint64)" --rpc-url $RH_RPC
# 300 1200 10 9500 500 50  (minOtmBps, maxOtmBps, minPremiumBps, maxUtilizationBps, protocolFeeBps, maxContractsCap)
cast call $CLEAR "feesEnabled()(bool)"       --rpc-url $RH_RPC   # false
cast call $CLEAR "feeTo()(address)"          --rpc-url $RH_RPC   # 0xff1454009F024507f3E455eb2027E98fAF4ccF61
cast call $FEE_SAFE "getOwners()(address[])" --rpc-url $RH_RPC   # [0x7A3a8C3F6331f63107D5b3aEeA0515e799022C32]
cast call $FEE_SAFE "getThreshold()(uint256)" --rpc-url $RH_RPC  # 1
```

The admin can change `feeRecipient`, the policy and the role holders at any time, and the `feeTo` Safe can nominate a new `feeTo`, so the comments above are the values on 2026-09-15, not guarantees. A different answer today is a reason to look for the transaction that changed it, not proof of a fake vault; a different `asset`, `usdg`, `seaport`, `priceFeed`, `clear` or `conduitKey` is, because those are immutable.

The repository script `script/Verify.s.sol` in `callhouse-contracts` performs a fuller read-only check: it compares the vault's and both libraries' runtime bytecode with a commit's build and checks every immutable, parameter and role.

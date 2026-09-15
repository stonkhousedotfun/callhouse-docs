# Contracts and addresses

{% hint style="warning" %}
Trust only the addresses on this page, and check them on chain yourself. Do not trust an address from a message, a social post, or another site.
{% endhint %}

## Chain

| Parameter | Value |
|---|---|
| Network | Robinhood Chain |
| Chain ID | `4663` |
| Public RPC | `https://rpc.mainnet.chain.robinhood.com` |
| Explorer | `https://robinhoodchain.blockscout.com` |

## Live product

Each user has an isolated account cloned from the factory. A fill writes **that** user's NVDA and pays **that** user.

| What | Address |
|---|---|
| Account factory | [`0xc4A5Cd0DE91CaB7F5Ebe2114bc63Fbb43E642BBb`](https://robinhoodchain.blockscout.com/address/0xc4A5Cd0DE91CaB7F5Ebe2114bc63Fbb43E642BBb) |
| Account implementation | [`0xe412A596B000f73ad19B39f51dfd0B17A15F45EC`](https://robinhoodchain.blockscout.com/address/0xe412A596B000f73ad19B39f51dfd0B17A15F45EC) |
| Valorem Clear | [`0x53d7A6d0489Daf3d67b9A314e0eAB2B78Acab9C6`](https://robinhoodchain.blockscout.com/address/0x53d7A6d0489Daf3d67b9A314e0eAB2B78Acab9C6) |
| `ValoremLib` | [`0xd3CB94893EAb55e425cCd77Db98458b38D75Fa3d`](https://robinhoodchain.blockscout.com/address/0xd3CB94893EAb55e425cCd77Db98458b38D75Fa3d) |
| Seaport 1.6 | [`0x0000000000000068F116a894984e2DB1123eB395`](https://robinhoodchain.blockscout.com/address/0x0000000000000068F116a894984e2DB1123eB395) |
| NVDA Stock Token | [`0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC`](https://robinhoodchain.blockscout.com/address/0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC) |
| USDG | [`0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168`](https://robinhoodchain.blockscout.com/address/0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168) |
| Chainlink RHNVDA/USD | [`0x379EC4f7C378F34a1B47E4F3cbeBCbAC3E8E9F15`](https://robinhoodchain.blockscout.com/address/0x379EC4f7C378F34a1B47E4F3cbeBCbAC3E8E9F15) |
| Admin | [`0xEb82c3D0F89d47453F94f0C2b2a2752e27a19d9b`](https://robinhoodchain.blockscout.com/address/0xEb82c3D0F89d47453F94f0C2b2a2752e27a19d9b) |
| Keeper | [`0x06c131cfEd73A56893f5eB52D17252856FAFC1d2`](https://robinhoodchain.blockscout.com/address/0x06c131cfEd73A56893f5eB52D17252856FAFC1d2) |
| Guardian | [`0x29741A8d283a253E8Ce10aDfd04C6507438b6F39`](https://robinhoodchain.blockscout.com/address/0x29741A8d283a253E8Ce10aDfd04C6507438b6F39) |
| Fee recipient | [`0xEb82c3D0F89d47453F94f0C2b2a2752e27a19d9b`](https://robinhoodchain.blockscout.com/address/0xEb82c3D0F89d47453F94f0C2b2a2752e27a19d9b) |

The keeper is not admin. App: `app.stonkhouse.fun/account` and `/book`.

## Check it yourself

```bash
export RH_RPC=https://rpc.mainnet.chain.robinhood.com
export FACTORY=0xc4A5Cd0DE91CaB7F5Ebe2114bc63Fbb43E642BBb

cast call $FACTORY "implementation()(address)" --rpc-url $RH_RPC
# 0xe412A596B000f73ad19B39f51dfd0B17A15F45EC
cast call $FACTORY "asset()(address)" --rpc-url $RH_RPC
# 0xd0601CE157Db5bdC3162BbaC2a2C8aF5320D9EEC
cast call $FACTORY "usdg()(address)" --rpc-url $RH_RPC
# 0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168
cast call $FACTORY "clear()(address)" --rpc-url $RH_RPC
# 0x53d7A6d0489Daf3d67b9A314e0eAB2B78Acab9C6
cast call $FACTORY "seaport()(address)" --rpc-url $RH_RPC
# 0x0000000000000068F116a894984e2DB1123eB395
cast call $FACTORY "feeRecipient()(address)" --rpc-url $RH_RPC
# 0xEb82c3D0F89d47453F94f0C2b2a2752e27a19d9b
cast call $FACTORY "hasRole(bytes32,address)(bool)" \
  0x0000000000000000000000000000000000000000000000000000000000000000 \
  0xEb82c3D0F89d47453F94f0C2b2a2752e27a19d9b --rpc-url $RH_RPC
# true (admin)
cast call $FACTORY "hasRole(bytes32,address)(bool)" \
  0x0000000000000000000000000000000000000000000000000000000000000000 \
  0x06c131cfEd73A56893f5eB52D17252856FAFC1d2 --rpc-url $RH_RPC
# false (keeper is not admin)
```

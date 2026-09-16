# Security and audits

{% hint style="warning" %}
**The live factory is on Robinhood Chain and has had no external audit.** No external security firm has reviewed the contracts yet. An external audit is pending, with no report yet. The reviews below were done by the team, mostly against the earlier pooled vault that led to write-on-fill. They are not a substitute for an audit. Factory admin is one hot key with no timelock, and there is no bug bounty.
{% endhint %}

Source paths refer to the `callhouse-contracts` repository unless marked as the app repository. The threat model and review record are in `SECURITY.md` there.

## Status

| Item | State |
|---|---|
| External audit | **None yet; pending.** Owner decision D14 (2026-09-13) was against one; on 2026-09-15 it was made pending |
| Mainnet | Live factory `0xc4A5…2BBb` (2026-09-15). Implementation `0xe412…45EC`. Addresses on [Contracts and addresses](addresses.md) |
| Admin key | One hot EOA holds `DEFAULT_ADMIN_ROLE`, with no timelock. A Safe handover is planned and has not happened |
| Monitoring and alerts | **Not wired.** Keeper alerts stay in its log |
| Bug bounty | **None.** Report to security@stonkhouse.fun |
| Upgradeability | Implementation is locked. A defect fix means a new factory and new accounts |

## What the live accounts inherited

Write-on-fill and unique option types exist because of the 2026-09-13 vault findings:

- **AF-01 (High), pre-redesign:** writing unsold calls into a shared Valorem bucket let a third party take ITM value of unsold writes. **Fix:** write only inside a fill, 1 NVDA per lot; each account uses expiry `base + index` so Stonkhouse writers do not share a type.
- **AF-02..05** (stranded claims, payout legs, utilisation, honest NAV) were vault-share problems. Isolated accounts have no shares and no redeem queue. `settle` after expiry is permissionless; a failed Valorem redeem leaves the claim for a retry.

The 2026-09-14 internal pass over the redesigned **vault** reported no Critical / High / Medium, and one Low (L-01: a contract buyer depositing inside its own fill to skim vault premium). L-01 does not apply to isolated accounts: premium is paid to the owner's wallet in the Seaport order, not into a share index.

That review is not an audit of `src/solo/Account.sol` or `AccountFactory.sol`.

## Trust table (live product)

| Actor | Can move your NVDA? | Worst case if compromised |
|---|---|---|
| Factory admin | No transfer function | Policy to compiled floors, fee to 20%, cap to 0, grant itself keeper |
| Keeper | No | Week at the floor; list lots you already requested |
| Guardian | No | Halt lists and fills |
| Seaport | Only during a fill of a live lot | Standard Seaport 1.6 |
| Valorem Clear | Written collateral only | Engine fee switch on `feeTo`; assignment inside your type |
| Stock Token / USDG issuer | Yes, on tokens they issued | Pause, freeze, burn |
| App / indexer | No | Wrong UX; you still sign |

## Reporting a vulnerability

Email **security@stonkhouse.fun**. Do not open a public issue. There is no bug bounty.

`stonkhouse.fun/legal` and `/.well-known/security.txt` repeat this. `callhouse.xyz` is not a Stonkhouse domain.

## Related

* [Roles and admin powers](roles.md)
* [Risks](../product/risks.md)
* [Architecture](architecture.md)

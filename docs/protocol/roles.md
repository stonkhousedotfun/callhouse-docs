# Roles and admin powers

The factory uses OpenZeppelin `AccessControl` with three roles. It never calls `_setRoleAdmin`, so `DEFAULT_ADMIN_ROLE` administers all three. There is no timelock on any role-gated function.

Source paths refer to `callhouse-contracts` `src/solo/`. Live holders below were read with `hasRole` on 15 September 2026.

| Role | Identifier | Holder today |
|---|---|---|
| `DEFAULT_ADMIN_ROLE` | `0x00…00` | `0xEb82c3D0F89d47453F94f0C2b2a2752e27a19d9b`, a hot EOA. No timelock |
| `KEEPER_ROLE` | `keccak256("KEEPER_ROLE")` | `0x06c131cfEd73A56893f5eB52D17252856FAFC1d2` |
| `GUARDIAN_ROLE` | `keccak256("GUARDIAN_ROLE")` | `0x29741A8d283a253E8Ce10aDfd04C6507438b6F39` |

Each role is held by exactly one address, and none of the three holds another's role. The keeper is **not** admin. Addresses and how to check them are on [Contracts and addresses](addresses.md).

{% hint style="danger" %}
**One hot key holds every admin power**, with no multisig and no timelock: the protocol fee up to 20% of ask, the fee recipient (today the same key), the deposit cap, the policy inside its hard caps, the price age, accepting the Valorem engine fee, and granting or revoking every role. Every change takes effect in the block it lands. Listed accounts have already pinned this week's orders.
{% endhint %}

## DEFAULT_ADMIN_ROLE

| Function | Effect | Bound in bytecode |
|---|---|---|
| `setPolicy(PolicyParams)` | Sets the six policy fields. Live: `(300, 1200, 40, 9500, 500, 50)` | `Policy.validate`: min OTM ≥ 1%, max OTM ≤ 25%, min premium ≥ 0.10%, utilisation ≤ 99.85%, fee ≤ 20%, max lots ≠ 0 |
| `setFeeRecipient(address)` | Where the 5% Seaport fee goes. Live: `0xEb82…9d9b` | Non-zero |
| `setDepositCap(uint256)` | Per-account held-NVDA ceiling. Live: `type(uint256).max` | None. 0 blocks further deposits on any account already at 0 held, and any positive deposit |
| `setMaxPriceAge(uint32)` | Live: 4 days | 1 hour to 7 days |
| `setValoremFeeAccepted(bool)` | Live: `false` | None. While Clear fees are on and this is false, `list` and fills revert |
| `grantRole` / `revokeRole` | Adds or removes keeper, guardian, or admin | None |

Values no role can change:

* Asset, USDG, Clear, Seaport, price feed, conduit key, implementation (all immutable / locked).
* Hard caps in `Policy.validate`.
* Lot size of 1 NVDA.
* `setWeek` bounds: exercise ≥ now + 1 hour, base expiry ≥ exercise + 1 day, ask ≤ strike.
* Code. Clones follow the locked implementation; a fix is a new factory.

### Valorem engine fee

Clear `0x53d7…C6`, `feeTo` = Safe `0xff14…CF61` (1-of-1, owner `0x7A3a…2C32`). That Safe holds no factory role. It can switch the 15 bps fee and sweep. See [Fees](../product/fees.md).

## KEEPER_ROLE

| Function | Effect | Checked on chain |
|---|---|---|
| `setWeek(strike, exerciseTs, baseExpiryTs, ask)` | Stores the week's terms and increments `week.id` | Exercise ≥ now + 1 hour; base expiry ≥ exercise + 1 day; ask > 0, strike > 0, ask ≤ strike |
| `listFor(owner)` | Calls `list` on that owner's clone | Same as `list` |

The keeper cannot deposit, withdraw, claim, or transfer ownership. It can list lots the owner already `requestWrite`d, at the week's pinned terms, inside policy.

A compromised keeper can set the lowest strike and ask the band allows and list requested lots to a buyer it fills itself. It cannot take idle NVDA.

## GUARDIAN_ROLE

| Function | Effect |
|---|---|
| `setWritesHalted(bool)` | Stops `list` and fills while true. Does not block deposits, idle withdrawals, `settle`, or exercise |

## Account owner

| Function | Notes |
|---|---|
| `deposit` / `withdraw` | Owner only. Withdraw idle only |
| `requestWrite` | Whole lots. Blocked while listed |
| `list` | Owner **or** keeper / factory |
| `claimUsdg` | Whole USDG balance to owner |
| `transferOwnership` | Rekeys `factory.accountOf` |

## Anyone

| Action | When |
|---|---|
| `createAccount` | Once per wallet |
| Fill a live lot through Seaport | Until that account's exercise timestamp |
| `settle` on an account | After that account's `listedExpiryTs` |
| `exercise` on the Clear | During that option type's window |
| `newOptionType` on the Clear | Always (the account does this in `list` if needed) |

Seaport 1.6 is the only caller of the zone hooks.

## Related

* [Launch policy and hard caps](../product/policy.md)
* [Architecture](architecture.md)
* [Contracts and addresses](addresses.md)

# Glossary

### Admin

Holder of the factory's `DEFAULT_ADMIN_ROLE`: today the hot EOA `0xEb82c3D0F89d47453F94f0C2b2a2752e27a19d9b`, also the protocol fee recipient. No timelock. See [Roles and admin powers](../protocol/roles.md).

### Account

A `WriterAccount` clone from the factory. Holds one owner's NVDA. Not a share token.

### Assignment

Valorem taking written NVDA at the strike when a holder exercises that account's option type. Only lots you listed and that sold can be assigned. See [Assignment](../product/assignment.md).

### Ask

USDG price per 1-NVDA lot for the week. Week 1: 1.000000 USDG.

### cNVDA

Share token of the **closed** pooled vault. Not used by the live product.

### Contract (lot)

One option contract, backed by exactly 1.0000 NVDA Stock Token. Each Seaport order is one lot.

### Covered call

A call sold by someone who already holds the asset. Stonkhouse's calls are covered by the NVDA you deposit.

### Deposit cap

Factory `depositCap()`, checked against **that account's** held NVDA. Live: `type(uint256).max`.

### Exercise timestamp

When sales stop and exercise can start. Keeper default: NYSE Friday close, 4:00pm ET.

### Expiry

When that option type can no longer be exercised and `settle` is allowed. Factory stores a **base** expiry; each account uses `base + index`.

### Factory

`AccountFactory` at `0xc4A5Cd0DE91CaB7F5Ebe2114bc63Fbb43E642BBb`. Creates clones, stores the week and policy, holds roles.

### Fill

A Seaport fulfilment of one live lot. Writes 1 NVDA and pays the ask (5% fee, 95% to the owner wallet).

### Guardian

`GUARDIAN_ROLE`. Can halt writes. Cannot move tokens.

### Idle NVDA

Account NVDA that is not reserved for this week's listing. Withdrawable.

### Keeper

`KEEPER_ROLE`. Sets the week and can `listFor` an owner. Cannot move tokens.

### Listed lots

Lots reserved by `list`. Locked until `settle` after expiry, or released one-by-one as they fill.

### Option type

Valorem ERC-1155 id. Unique per account because expiry includes the account index.

### Premium

What the buyer pays (the ask). Seller receives 95% in-wallet on the fill.

### Protocol fee

5% of the ask, Seaport consideration to `feeRecipient`. Ceiling 20%. Never on strike proceeds.

### Request write

`requestWrite(X)`: how many whole lots you want listed this week.

### Reserved

NVDA locked for live lots not yet filled.

### Settle

`settle()` after that account's expiry: cancel leftovers, unlock unsold NVDA, redeem the claim if any. Anyone may call it.

### Strike

USDG paid per contract on exercise. Week 1: 223 USDG.

### Valorem Clear

Stonkhouse's clearinghouse, `0x53d7A6d0489Daf3d67b9A314e0eAB2B78Acab9C6`. Holds written collateral and option tokens.

### Write on fill

The account writes NVDA into Valorem only inside `authorizeOrder`, never at list time.

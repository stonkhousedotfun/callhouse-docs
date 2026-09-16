# Accounting

Isolated accounts have no shares, no NAV and no USDG index. Each clone is one user's NVDA plus, after assignment, strike USDG waiting to be claimed.

## Balances

| Amount | Where it lives |
|---|---|
| Idle NVDA | `asset.balanceOf(account) − reserved` |
| Reserved / listed NVDA | `reserved` (1e18 per listed lot not yet filled) |
| Written NVDA | Locked in that account's Valorem claim |
| Premium | Owner wallet, at fill, net of the 5% fee |
| Protocol fee | Fee recipient, at fill |
| Strike USDG | Account USDG balance after a successful `settle` redeem |

`_heldAssets()` = idle + reserved remaining in the token balance + NVDA still in the claim. `deposit` refuses if that plus the new amount would exceed `factory.depositCap()`. Live cap is `type(uint256).max`.

## A fill

Ask `A`, fee bps `f` (500 today):

```
fee    = floor(A * f / 10_000)
seller = A - fee
```

Seaport consideration: `seller` USDG to `owner`, `fee` USDG to `feeRecipient` if `fee > 0`. The account never sees the premium. `contractsWritten` increments by 1. `reserved` drops by 1e18.

The fill gate still prices the short: strike inside the OTM band at live spot, ask at least `minPremiumBps` of spot, utilisation against `_sizingAssets`, Valorem fee off or accepted, oracle live, before the exercise timestamp.

## Settle

After `listedExpiryTs`:

1. Cancel leftover orders (`incrementCounter` + clear hashes).
2. `reserved = 0`, `listedLots = 0`, `requestedLots = 0`.
3. If `claimKey != 0`, `tryRedeemClaim`. On success: unassigned NVDA returns, strike USDG is credited to the account, `claimKey` and `optionId` clear. On failure the listing is still cleared; the claim stays for a later `settle`.

Strike USDG is not fee'd. `claimUsdg` sends the account's whole USDG balance to the owner. There is no deadline.

## Rounding

* Protocol fee is rounded down on the ask.
* Each lot's ask is exact (one contract, one price).
* Lots are whole NVDA only (`Policy.LOT` = 1e18).

## What this is not

Do not use pooled-vault views (`convertToAssets`, `accUsdgPerShare`, `queueRedeem`, `totalSupply`). Those belong to the closed `cNVDA` vault. The live ABI is `src/solo/Account.sol` and `src/solo/AccountFactory.sol`.

## Related

* [Fees](../product/fees.md)
* [Assignment](../product/assignment.md)
* [Architecture](architecture.md)

# Deposits and collateral

See which Stock Tokens or USDG a writer locks, which balance stays free, and how collateral is returned.

{% hint style="warning" %}
Stonkhouse v2 is unaudited. The chain-4663 contracts first deployed for the dev launch are the live public contract set. Only NVDA is registered; other markets remain planned. Operational services and market liquidity may be unavailable. Stock Tokens carry market and issuer risks. Buyers can lose their full cost; writers can lose collateral. Stonkhouse is not available to US persons. Read [Risks](../resources/risks.md) before using the product.
{% endhint %}

## Your Clearinghouse ledger

Deposit a supported Stock Token to write covered calls, or USDG to write cash-secured puts. You first approve an exact token amount, then deposit it to your own free balance in the Clearinghouse. A deposit is not an option sale. You can withdraw free funds at any time, subject to the token issuer allowing the transfer.

When a new option is written, the Clearinghouse moves collateral from your free balance to the series' locked balance. For a call, each unit locks **0.01 Stock Token**; for a put, each unit locks **0.01 × strike USDG**. One unit covers 0.01 share. The deployed v7 design also charges rent from your free balance **in the same asset**, based on locked collateral and time left to expiry. You need enough free balance for both collateral and rent. Locked collateral cannot be withdrawn until you close the position or the series settles and your short is redeemed.

| Balance | What you can do |
|---|---|
| Free | Withdraw it, or use it to back new write-on-fill asks. |
| Locked | It backs an already minted short. Closing or settling releases the remainder. |
| Rent held | It is separate from locked collateral. A close before expiry returns its unused portion to whoever closes; any amount still held at settlement becomes a protocol fee. |
| Credited payout | A payout that could not transfer sits in your ledger until withdrawal is possible. |

An unfilled write-on-fill ask does **not** lock collateral or charge rent. Several asks can refer to the same free balance; only fills reserve collateral and charge rent. If one fills first, another may no longer have enough for both and can be skipped. Depositing exactly one Stock Token may therefore support less than one share of newly written calls. Cancelling an unfilled ask does not withdraw your deposit. A short token can be transferred, so a later rent refund may go to its new holder if that holder brings the matching long and closes. The Clearinghouse is non-upgradeable, and v2 contracts are unaudited; the underlying Stock Token and USDG issuers can pause or block transfers.

## Related

* [Setting your ask](setting-your-ask.md)
* [Cash-secured puts](cash-secured-puts.md)
* [Security](../protocol/security.md)
* [Risks](../resources/risks.md)

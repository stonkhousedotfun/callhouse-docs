# Deposits and collateral

See which Stock Tokens or USDG a writer locks, which balance stays free, and how collateral is returned.

{% hint style="warning" %}
Stonkhouse v2 is unaudited. Interface v8 is deployed on Robinhood Chain 4663 from block 69,512,673 (22 September 2026); the launch markets are NVDA and SPCX. Registered markets can change; check the current app and on-chain status before trading. Operational services and market liquidity may be unavailable. Stock Tokens carry market and issuer risks. Buyers can lose their full cost; writers can lose collateral. Stonkhouse is not available to US persons. Read [Risks](../resources/risks.md) before using the product.
{% endhint %}

## Your Clearinghouse ledger

Deposit a supported Stock Token to write covered calls, or USDG to write cash-secured puts. You first approve an exact token amount, then deposit it to your own free balance in the Clearinghouse. A deposit is not an option sale. You can withdraw free funds at any time, subject to the token issuer allowing the transfer.

When a new option is written, the Clearinghouse moves collateral from your free balance to the series' locked balance. For a call, each unit locks **0.01 Stock Token**; for a put, each unit locks **0.01 × strike USDG**. One unit covers 0.01 share. A market can also charge rent from your free balance **in the same asset**, based on locked collateral and time left to expiry, but every registered market sets that rate to 0, so you need free balance for the collateral alone. The contracts keep a bounded rent dial that the market-fee role could switch on; such a change waits 72 hours and then applies only to series created after it. Locked collateral cannot be withdrawn until you close the position or the series settles and your short is redeemed.

| Balance | What you can do |
|---|---|
| Free | Withdraw it, or use it to back new write-on-fill asks. |
| Locked | It backs an already minted short. Closing or settling releases the remainder. |
| Rent held | Zero at the registered 0 ppm rate. Were a rate set, it would be held separately from locked collateral, a close before expiry would return its unused portion to whoever closes, and any amount still held at settlement would become a protocol fee. |
| Credited payout | A payout that could not transfer sits in your ledger until withdrawal is possible. |

An unfilled write-on-fill ask does **not** lock collateral. Several asks can refer to the same free balance; only fills reserve collateral. If one fills first, another may no longer have enough and can be skipped. Cancelling an unfilled ask does not withdraw your deposit. A short token can be transferred, so a later rent refund, if a market ever charges rent, may go to its new holder if that holder brings the matching long and closes. The Clearinghouse is non-upgradeable, and v2 contracts are unaudited; the underlying Stock Token and USDG issuers can pause or block transfers.

## Related

* [Setting your ask](setting-your-ask.md)
* [Cash-secured puts](cash-secured-puts.md)
* [Security](../protocol/security.md)
* [Risks](../resources/risks.md)

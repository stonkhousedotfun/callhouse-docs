# Getting paid

See when a writer receives premium and how buyers and writers receive their settlement proceeds.

{% hint style="warning" %}
Stonkhouse v2 is unaudited. Interface v8 is deployed on Robinhood Chain 4663 from block 69,512,673 (22 September 2026); the launch markets are NVDA and SPCX. Registered markets can change; check the current app and on-chain status before trading. Operational services and market liquidity may be unavailable. Stock Tokens carry market and issuer risks. Buyers can lose their full cost; writers can lose collateral. Stonkhouse is not available to US persons. Read [Risks](../resources/risks.md) before using the product.
{% endhint %}

## A fill and a settlement are different payments

**When your ask fills.** A primary buyer's premium is paid to you less the effective primary-sale fee, 5% of the premium. If you placed the resting order, you may also receive a share of the taker fee as a maker rebate. The fill is what mints the units and locks your collateral; at the registered 0 ppm rent rate it charges you no rent. A fill is required for a write-on-fill ask; listing alone pays nothing and costs nothing. If a token transfer cannot reach you, the OrderBook records an amount owed for you to claim.

**When a series settles.** The Clearinghouse computes each long and short payout from the final price. Redemption is permissionless, but someone must submit the transaction. An operator-run cranker is meant to submit these calls, but no service is promised. Check the on-chain state of your expiry, and be prepared to submit the permissionless calls yourself if nothing has. A winning call long receives USDG by default if the configured conversion meets its slippage limit; otherwise it receives Stock Tokens. A put long receives USDG. A short holder receives the collateral remainder in kind. The exercise fee comes out of an in-the-money long payout.

**When you close before expiry.** If you hold equal long and short units and close them, the Clearinghouse returns their locked collateral to your free balance in the collateral asset. It also returns any unused rent, which is nothing while a market's rate is 0 ppm; that refund goes to whoever closes, which may differ from the original writer after a short transfer. Closing at or after expiry returns collateral but no rent.

**If delivery fails.** A token issuer can pause or block a transfer. The Clearinghouse then credits your internal ledger rather than blocking everyone else's redemption. Withdraw the credit when transfers are possible. You can choose an in-kind call payout or direct a payout to the ledger in Portfolio; these preferences affect future redemptions.

Your transaction and ledger history are visible in Portfolio. A quoted USDG value is not a promise that a conversion will execute at that exact amount.

## Related

* [Settlement and payout](../buying/settlement-and-payout.md)
* [Fees](../product/fees.md)
* [Deposits and collateral](../writing/deposits-and-collateral.md)
* [Risks](../resources/risks.md)

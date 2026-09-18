# Getting paid

See when a writer receives premium and how buyers and writers receive their settlement proceeds.

{% hint style="warning" %}
Stonkhouse v2 is unaudited and has no public production release. A separate chain-4663 dev deployment is for testing, not public trading. Stock Tokens carry market and issuer risks. Buyers can lose their full cost; writers can lose collateral. Stonkhouse is not available to US persons. Read [Risks](../resources/risks.md) before using the product.
{% endhint %}

## A fill and a settlement are different payments

**When your ask fills.** A primary buyer's premium is paid to you less the effective primary-sale fee, planned at 0% for v7 launch. If you placed the resting order, you may also receive a share of the taker fee as a maker rebate. When new units are minted, you separately pay time-based rent from your free collateral balance: Stock Tokens for a call, USDG for a put. A fill is required for a write-on-fill ask; listing alone pays no premium and charges no rent. If a token transfer cannot reach you, the OrderBook records an amount owed for you to claim.

**When a series settles.** The Clearinghouse computes each long and short payout from the final price. Redemption is permissionless, but someone must submit the transaction; no v2 cranker service was running at the recorded dev launch. A winning call long receives USDG by default if the configured conversion meets its slippage limit; otherwise it receives Stock Tokens. A put long receives USDG. A short holder receives the collateral remainder in kind. The exercise fee comes out of an in-the-money long payout.

**When you close before expiry.** If you hold equal long and short units and close them, the Clearinghouse returns their locked collateral and unused rent to your free balance in the collateral asset. The rent refund goes to whoever closes, which may differ from the original writer after a short transfer. Closing at or after expiry returns collateral but no rent. Rent still held at settlement becomes a protocol fee.

**If delivery fails.** A token issuer can pause or block a transfer. The Clearinghouse then credits your internal ledger rather than blocking everyone else's redemption. Withdraw the credit when transfers are possible. You can choose an in-kind call payout or direct a payout to the ledger in Portfolio; these preferences affect future redemptions.

Your transaction and ledger history are visible in Portfolio. A quoted USDG value is not a promise that a conversion will execute at that exact amount.

## Related

* [Settlement and payout](../buying/settlement-and-payout.md)
* [Fees](../product/fees.md)
* [Deposits and collateral](../writing/deposits-and-collateral.md)
* [Risks](../resources/risks.md)

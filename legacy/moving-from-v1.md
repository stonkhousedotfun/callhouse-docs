# Moving from v1

See how existing v1 positions run off and how a writer can withdraw before using v2.

{% hint style="warning" %}
Stonkhouse v2 is unaudited. Interface v8 is deployed on Robinhood Chain 4663 from block 69,512,673 (22 September 2026); the launch markets are NVDA and SPCX. Registered markets can change; check the current app and on-chain status before trading. Operational services and market liquidity may be unavailable. Stock Tokens carry market and issuer risks. Buyers can lose their full cost; writers can lose collateral. Stonkhouse is not available to US persons. Read [Risks](../resources/risks.md) before using the product.
{% endhint %}

## Your positions stay on their original contracts

The current v2 contracts use a shared Clearinghouse and an on-chain order book. A v1 account, its Valorem option tokens, and its Seaport lots do **not** convert into a v2 position. Do not send old option tokens to a v2 contract. Existing v1 positions must finish under their original rules. The [v1 reference](v1-reference.md) records those rules.

Two v2 Clearinghouses now sit on chain 4663. The current one is the interface-v8 contract listed on [Addresses](../protocol/addresses.md). The other is the superseded interface-v7 contract, which is still on chain and is in run-off; the [v7 reference](v7-reference.md) records that set. Read the address from the current [Addresses](../protocol/addresses.md) page before you sign anything.

## If you wrote in v1

1. Check your old account under `/legacy/[ticker]/account`. Before the freeze, cancel an unfilled lot you no longer want sold while its sale window remains open. A lot listed but unsold when the factory freezes stops selling then.
2. Let filled options reach their v1 expiry. V1 buyers can still exercise during the option's exercise window, so do not treat sold collateral as free until the old account settles.
3. Check whether the permissionless v1 `settle()` has been called after that account's expiry; if not, an eligible caller can submit it. Do not rely on a keeper continuing indefinitely during run-off. An issuer pause, freeze, or blocklist when a sold account settles can strand its redemption claim; lifting the restriction later does not let that account retry the failed redemption.
4. Claim any strike USDG in the old account and withdraw your free Stock Tokens or USDG. The contracts set no deadline for these actions. Keep enough chain ETH for gas.
5. Deposit assets into the current Clearinghouse separately, once you have checked its terms. Take its address from [Addresses](../protocol/addresses.md), which carries the interface-v8 set. Do not deposit into the superseded interface-v7 Clearinghouse: it is still on chain and it still accepts deposits, but it is in run-off and nothing new is registered on it. Set new asks or an auto-roll strategy only if you want them; neither carries over.

V1's freeze stops **new deposits and listings** for the run-off. It does not erase old tokens, prevent a holder's valid exercise, or move collateral to v2. Sold calls run to their own expiries; the last exercise window closes at the last listed expiry. The `/legacy` exercise page stays available until at least 24 hours after that expiry. The `/legacy` account page stays available while v1 accounts hold assets. Check the current app and chain status rather than assuming a date in this guide.

## If you bought in v1

V1 is physically settled. If you want to exercise an in-the-money call during **its own** exercise window, you need the strike amount in USDG and a transaction on the legacy page. V1 does not auto-exercise. An unexercised v1 long can expire without payout. V2's automatic settlement applies only to v2 long tokens.

Exercising is a transaction on the Valorem clearinghouse; it does not depend on the Stonkhouse site.

## After the run-off

Once every live v1 account has settled and 24 hours have passed since the last listed expiry, the v1 keeper and indexer can be switched off. An account that still holds Stock Tokens or USDG can use `withdraw` or `claimUsdg` through the `/legacy` account page or the explorer's write-contract tab. Those calls have no deadline in the contracts. Historical activity shown by the old indexer may become unavailable.

## Related

* [v1 reference](v1-reference.md)
* [v7 reference](v7-reference.md)
* [Addresses](../protocol/addresses.md)
* [How Stonkhouse works](../getting-started/how-it-works.md)
* [Security](../protocol/security.md)
* [Risks](../resources/risks.md)

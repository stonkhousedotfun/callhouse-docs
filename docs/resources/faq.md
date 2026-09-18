# FAQ

Find short answers about trading, writing, settlement, risks, and the current deployment state.

{% hint style="warning" %}
Stonkhouse v2 is unaudited and has no public production release. A separate chain-4663 dev deployment is for testing, not public trading. Stock Tokens carry market and issuer risks. Buyers can lose their full cost; writers can lose collateral. Stonkhouse is not available to US persons. Read [Risks](risks.md) before using the product.
{% endhint %}

## Trading

**What do I buy?** A fungible ERC-1155 long for a specific Stock Token, strike, type, and expiry. One unit covers 0.01 share. The premium plus taker fee is your maximum loss on the option; network gas is extra. See [Buying your first contract](../getting-started/buying-your-first-contract.md).

**Can I sell before expiry?** Yes. Hit a bid as a taker or list a resale ask as a maker while the series is open. A resale ask escrows the long tokens until it fills or you cancel it.

**Do I have to exercise or pay the strike?** No strike payment is required in v2. Someone must submit the permissionless price-finalisation and series-settlement calls; once settled, you can redeem your own position. Do not assume a keeper will do this for you: no v2 cranker service was running at the recorded dev launch.

**Why is a payout late?** The oracle can wait for a source, run a delayed single-source candidate, or hold a vetoed result. No caller may have submitted a permissionless lifecycle transaction yet. A failed outgoing transfer becomes a ledger credit. Check the series' settlement status and [Settlement and payout](../buying/settlement-and-payout.md).

**Why did I get Stock Tokens rather than USDG?** A winning call is owed Stock Token value. The Clearinghouse tries to convert it by default. The protocol's conversion floor includes a base shortfall bound and the route's pool fee. If a route is unavailable or the floor cannot be met, the in-kind Stock Token payout is used. You can choose in-kind payouts in Portfolio.

## Writing and makers

**Does placing an ask earn premium or lock collateral?** No. A write-on-fill ask earns premium and locks the corresponding collateral only when bought. Under the proposed v7 design, mint also charges time-based rent from the writer's free collateral balance, in Stock Tokens for a call or USDG for a put. An unfilled ask pays no rent but can later lack enough free collateral for both the lock and the fee.

**How do I leave a short early?** Buy the matching long and call `close` before the series settles. Closing before expiry returns unused rent to whoever closes, in the collateral asset. A close at or after expiry returns no rent. The cost of buying the long can exceed the premium received or the refund. A short transfer can move the eventual refund to another holder.

**Can auto-roll leave an in-the-money ask open?** The proposed v7 `cancelStale` lets anyone cancel the tracked ask's unfilled remainder when a fresh oracle spot reaches its strike. It is a transaction, not automatic protection: a buyer can fill first, and an unavailable or stale oracle cannot trigger it. A cancelled ask is not replaced before that expiry.

**Does the maker-vault cap protect all treasury value?** No. The proposed v7 cap limits net USDG paid through quoter-initiated trades and bids with a 24-hour refill. It does not bound the option value sold, settlement losses or admin actions. See [Market makers](../market/market-makers.md).

**Does a maker score pay a reward?** Not by itself. The operator must fund an epoch, publish an allocation file, and post its root on chain. A maker then verifies and claims its allocation.

## Access and status

**Is v2 live?** A separate v2 contract set and NVDA test book were recorded on chain 4663 for a dev preview on 18 September 2026. That is not a public production release, and these pages do not publish production v2 addresses. The existing NVDA v1 product has different contracts and rules; see [Moving from v1](../legacy/moving-from-v1.md).

**Can I migrate a v1 position?** No contract converts it. A v1 writer settles and withdraws after the old lot runs off, then deposits into v2 separately. A v1 buyer uses the legacy exercise flow while its option is live.

**Are alerts required?** No. Telegram, browser push, or email alerts are optional and can fail or arrive late. Check your wallet and on-chain status directly.

## Related

* [Documentation home](../README.md)
* [Glossary](glossary.md)
* [Moving from v1](../legacy/moving-from-v1.md)
* [Risks](risks.md)

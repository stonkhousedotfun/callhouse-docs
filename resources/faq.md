# FAQ

Find short answers about trading, writing, settlement, risks, and the current deployment state.

{% hint style="warning" %}
Stonkhouse v2 is unaudited. Interface v8 is deployed on Robinhood Chain 4663 from block 69,512,673 (22 September 2026); the launch markets are NVDA and SPCX. Registered markets can change; check the current app and on-chain status before trading. Operational services and market liquidity may be unavailable. Stock Tokens carry market and issuer risks. Buyers can lose their full cost; writers can lose collateral. Stonkhouse is not available to US persons. Read [Risks](risks.md) before using the product.
{% endhint %}

## Trading

**What do I buy?** A fungible ERC-1155 long for a specific Stock Token, strike, type, and expiry. One unit covers 0.01 share. The premium plus taker fee is your maximum loss on the option; network gas is extra. See [Buying your first contract](../getting-started/buying-your-first-contract.md).

**Can I sell before expiry?** Yes. Hit a bid as a taker or list a resale ask as a maker while the series is open. A resale ask escrows the long tokens until it fills or you cancel it.

**Do I have to exercise or pay the strike?** No strike payment is required in v2. Someone must submit the permissionless price-finalisation and series-settlement calls; once settled, you can redeem your own position. Anyone can submit them, and the bounty that would pay a keeper for doing so comes out of the `KeeperRewards` pool, which is unfunded on the current contracts today. Check the on-chain result of an expiry you care about rather than assuming a keeper reached it.

**Why is a payout late?** The oracle can wait for a source, run a delayed single-source candidate, or hold a vetoed result. No caller may have submitted a permissionless lifecycle transaction yet. A failed outgoing transfer becomes a ledger credit. Check the series' settlement status and [Settlement and payout](../buying/settlement-and-payout.md).

**Why did I get Stock Tokens rather than USDG?** A winning call is owed Stock Token value. The Clearinghouse tries to convert it by default. The protocol's conversion floor includes a base shortfall bound and the route's pool fee. If a route is unavailable or the floor cannot be met, the in-kind Stock Token payout is used. You can choose in-kind payouts in Portfolio.

## Writing and makers

**Does placing an ask earn premium or lock collateral?** No. A write-on-fill ask earns premium and locks the corresponding collateral only when bought, and that fill is the only thing that mints. An unfilled ask costs nothing, but it can later lack enough free collateral to fill at all.

**What does fair value mean?** It is an off-chain USDG estimate for one whole share of option coverage on a Stock Token. It is not a Stonkhouse bid or ask, an executable external quote, or the settlement-oracle price. Under the required source-aware contract, the provider names where the input came from and the method says whether it used an exact listed contract, interpolation, extrapolation, a model, or an external indicative value. A local daily expiry may have no matching listed contract. The pricing service does not publish those fields on the wire yet. When it does, check the source observation time, declared delay, method, and readiness rather than treating the estimate as a floor.

**Why can fair value or smart pricing be unavailable?** The required source-aware gates can reject a series with no usable quote, an unknown or stale observation time, an unsupported local expiry, mismatched identity or spot, delayed fallback data, or too much model or earnings uncertainty. A running pricing process does not make every series ready. The pricer refuses a reprice when the fair value's observation time is unknown or older than its age limit, when the fair spot disagrees with the oracle spot, or when a provenance object marks the series degraded, unavailable, or mis-identified. The pricing service does not publish provenance on the wire yet, so today's gate is the observation time and the spot check. Smart pricing also stays off until the operator turns the pricer on. You can still set a manual ask.

**Does smart pricing guarantee a reprice or fill?** No. It only lets the pricer move an eligible auto-roll ask inside the minimum and maximum you signed. Session rules, its cadence, and its movement threshold can leave the ask unchanged. The source-readiness gates add further refusal conditions. If the pricer or source stops, the last ask remains live at its last price; it does not jump to your maximum or cancel itself. A static or auto-priced ask can become cheap before you change it, and no price is certain to fill.

**How do I leave a short early?** Buy the matching long and call `close` before the series settles. Closing before expiry also returns any unused rent to whoever closes, which is nothing while a market's rate is 0 ppm. The cost of buying the long can exceed the premium received. A short transfer can move the eventual refund to another holder.

**Can auto-roll leave an in-the-money ask open?** `cancelStale` lets anyone cancel the tracked ask's unfilled remainder when a fresh oracle spot reaches its strike. It is a transaction, not automatic protection: a buyer can fill first, and an unavailable or stale oracle cannot trigger it. A cancelled ask is not replaced before that expiry.

**Does the maker-vault cap protect all treasury value?** No. The cap limits net USDG paid through quoter-initiated trades and bids, and it refills over 24 hours. It binds every quoting caller, the owner's Safe included, but it does not bound the option value sold, the losses at settlement, or a treasury withdrawal from the vault. See [Market makers](../market/market-makers.md).

**Does a maker score pay a reward?** Not by itself. The operator must fund an epoch, publish an allocation file, and post its root on chain. A maker then verifies and claims its allocation.

## Access and status

**Is v2 live?** The current contracts were deployed on Robinhood Chain 4663 on 22 September 2026, and the launch markets are NVDA and SPCX. Both are registered and enabled for trading. Whether you can get a quote or a fill is a separate question: it needs someone to rest an order, and the protocol's own house vault is not armed and holds no USDG yet. Market registration, availability, orders and operational services can change. Check [Addresses](../protocol/addresses.md), [Markets](../product/markets.md) and the chain before signing. The earlier dev-launch contracts are the legacy set; they are still on chain and still accept new positions. The existing NVDA v1 product has different contracts and rules; see [Moving from v1](../legacy/moving-from-v1.md).

**Can I migrate a v1 position?** No contract converts it. A v1 writer settles and withdraws after the old lot runs off, then deposits into v2 separately. A v1 buyer uses the legacy exercise flow while its option is live.

**Are alerts required?** No, and none are running today: the notification service has never been deployed and holds no messaging credential. Telegram, browser push, and email alerts remain optional when they do arrive, and they can fail or arrive late. Check your wallet and on-chain status directly.

## Related

* [Documentation home](../README.md)
* [Glossary](glossary.md)
* [Moving from v1](../legacy/moving-from-v1.md)
* [Risks](risks.md)

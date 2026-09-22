# Roadmap

{% hint style="warning" %}
This graphic and its pillars are long-term ideas, not a list of features available today or a release commitment. The fee figures under the pillars below match the rates registered on the interface v8 contracts on 22 September 2026; they are not a live quote and a role holder can change them with notice, so see [Fees](product/fees.md) before you trade. V2 is unaudited; the current contracts are interface v8, deployed on Robinhood Chain 4663 from block 69,512,673 on 22 September 2026, and the launch set is NVDA and SPCX. Registration and availability can change, and a market is tradable only once it is enabled on chain. Two pillars below have been decided differently from what this graphic says: **there will be no staking**, and the fee split is **50% buyback-and-burn, 50% treasury**, described on [Where fees go](product/where-fees-go.md). The picture cannot be edited and is out of date wherever it disagrees with the text — among other things it shows six roles rather than eleven, two audits, a 30-minute wait on oracle updates, Pyth as a price source, an auto-sell keeper, fee ranges in place of the registered rates, and a 60–70% burn share alongside staking, staker perks and a fee vote — so read the text under each pillar, not the picture. See [Token Supply and Allocation](resources/token-supply-and-allocation.md) for current token allocation information. Check [release status](README.md#release-status), [Markets](product/markets.md), [security](protocol/security.md) and [addresses](protocol/addresses.md) before relying on a feature.
{% endhint %}

<figure><img src=".gitbook/assets/stonkhouse-roadmap.png" alt="StonkHouse roadmap: Trust &#x26; Safety, A Real Market, Buyer-First App, Revenue Model, Growth Loops and Token Flywheel"><figcaption><p>The StonkHouse roadmap at a glance</p></figcaption></figure>

## Trust & Safety

Safe to put real money in. No single key controls anything that matters.

* **Role-based access** — Privileged calls are split across eleven scoped roles behind a role manager. The delayed roles are held by one 2-of-3 Safe whose keys are all the owner's, so that threshold guards against one key being stolen rather than giving independent custody.
* **Waiting periods** — 24h on configuration and treasury changes, 48h on book fees and on role changes, 72h on a market's exercise fee and rent dial, 1h on listings. The guardian, pricer, quoter and buyback roles are hot keys with no delay. Reading a price needs no role and no waiting period; changing which sources a market settles on, or a source's feed or pool, is a 24h configuration change, and a series that has already been pinned keeps the sources it was pinned to.
* **Immutable core** — The contracts are not upgradeable. Fee caps are compiled: premium ≤10%, exercise ≤2%.
* **Real oracle** — A Chainlink push feed cross-checked against a Uniswap v3 TWAP on chain. Settle on a 30-minute average, never one tick. Chainlink Data Streams is built and deployed but enabled for no market, and there is no Pyth source.
* **Audit + bounty** — An external audit is planned once total value locked reaches 1,000,000 USDG. None has been commissioned and no bounty has been announced; the contracts are unaudited today.
* **Keepers** — Permissionless bots snapshot the sources and finalise the settlement price, settle a series and redeem holders (auto-exercise), roll auto-roll strategies and cancel stale asks, and sweep fees to the splitter. There is no auto-sell. Only the buyback step needs a role; see [Keepers](protocol/keepers.md). Bounties are paid from the keeper rewards balance, which held no USDG at the 22 September 2026 check (block 69,689,676).

## A Real Market

One shared order book. Positions you can actually trade.

* **Shared order book** — One series per stock, strike, expiry and type, so liquidity pools and prices converge.
* **Tokenized positions** — Buyers can sell before expiry. Writers can exit early.
* **Writers set the price** — Real bid/ask per series replaces the hardcoded 0.40% ask. Fair value shown as a guide.
* **Market makers** — Permissionless makers can earn rebates. The protocol's maker vault and a house vault for each launch market were deployed with the interface v8 set, but the maker vault held no USDG at the 22 September 2026 check (block 69,689,676) and neither house vault is armed, so markets may remain one-sided.
* **Auto-everything** — Winning contracts settle straight into your wallet, with alerts for strikes, expiries and payouts. Neither runs yet: the keeper bounties that pay for settlement and redemption are unfunded, and the notification service has never been deployed.

## Buyer-First App

Buyers are the growth engine. The product speaks to them first.

* **Buy page is the front door** — A marketplace of live contracts. Each is a payoff card with a one-tap Buy.
* **Live payoff slider** — Drag the stock price and watch your payout update in real time.
* **Fractional contracts** — Buy 0.1 or 0.01 of a contract. Start with cents, not a full position.

## Revenue Model

Small, layered fees that scale with volume and stay invisible on a single trade.

* **Premium fee · 5%** — Charged on a first sale, the fill that mints a new contract; a resale pays 0%. This is the registered rate rather than a proposal, and it restores what v1 charged: the interface v7 market had replaced it with 0% plus a collateral rent.
* **Exercise fee · 0.25%** — Only when a contract wins, paid out of profit, and never more than 10% of that payout.
* **Taker fee · flat 0.10 USDG** — Capped at 10% of the premium, so micro-bets stay viable.
* **Maker rebate · current default 50% of the taker fee** — Makers in one take split at most 0.05 USDG according to filled premium.
* **Lending spread** — Not a product. The interface v8 deployment lends nothing: neither the hedger nor the lender-side rewards distributor was deployed, so there is no rate to quote.
* **Hard caps** — Every fee is bounded by a compiled ceiling, and a taker can additionally cap what one trade will pay with `maxTotalFee`.

## Growth Loops

Make wins shareable, events tradeable, and yield passive.

* **Public wins feed** — Live P\&L cards, one-tap share images and a leaderboard for the biggest wins and streaks.
* **Event markets** — Pages for earnings, launches and macro events, expiring right after. New markets in minutes.
* **Set-and-forget for sellers** — Auto-roll and one-tap presets turn sellers into passive earners.

## Token Flywheel

Fees the protocol keeps are divided between buying back the token and the treasury. The `FeeSplitter` and its buyback executor are deployed and configured on Robinhood Chain 4663, and both the order book and the Clearinghouse already pay their protocol fees to the splitter; at the 22 September 2026 check (block 69,689,676) no distribution and no buyback had run.

* **The loop** — Half of each distribution buys STONKHOUSE and burns it; the other half goes to the Treasury Safe. Stock Token fees are sold for USDG first. [Where fees go](product/where-fees-go.md) has the mechanics.
* **No staking** — There is no staking programme, no locked-token tier and no fee vote. Holding the token does not entitle you to fees, a discount or a say in listings.
* **Bounded buys** — A single buyback spends at most its configured cap, 50 USDG at launch under a compiled 1,000 USDG ceiling, with a five-minute cooldown between buys.
* **Emission discipline** — New tokens only against volume milestones, never on a timer.

## Related

* [Markets](product/markets.md)
* [Where fees go](product/where-fees-go.md)
* [Roles](protocol/roles.md)
* [Risks](resources/risks.md)

# Roadmap

{% hint style="warning" %}
This graphic and its pillars are long-term ideas, not a list of features available today or a release commitment. The fee figures below are historical roadmap proposals, not v2 trading terms; see [Fees](product/fees.md). V2 is unaudited; its live public contract set is the dev-origin chain-4663 deployment, currently with NVDA as its sole registered market. In particular, current v2 code does not have a deployed multisig or timelock, and no staking or buyback programme has been announced. See [Token Supply and Allocation](resources/token-supply-and-allocation.md) for current token allocation information. Check [release status](README.md#release-status), [security](protocol/security.md) and [addresses](protocol/addresses.md) before relying on a feature.
{% endhint %}

<figure><img src=".gitbook/assets/stonkhouse-roadmap.png" alt="StonkHouse roadmap: Trust &#x26; Safety, A Real Market, Buyer-First App, Revenue Model, Growth Loops and Token Flywheel"><figcaption><p>The StonkHouse roadmap at a glance</p></figcaption></figure>

## Trust & Safety

Safe to put real money in. No single key controls anything that matters.

* **Role-based access** — Owner key split into six scoped roles. Withdrawals need 2-of-3 multisig.
* **Timelocks** — 24–72h delay on fee, param and role changes. 30 min on oracle updates.
* **Immutable core** — Upgrades disabled after audit. Fee caps hard-coded: premium ≤10%, exercise ≤2%.
* **Real oracle** — Chainlink or Pyth, cross-checked on-chain. Settle on an average price, never one tick.
* **Audit + bounty** — Two independent audits before anything scales.
* **Keepers** — Permissionless bots handle auto-exercise, auto-sell and auto-roll.

## A Real Market

One shared order book. Positions you can actually trade.

* **Shared order book** — One series per stock, strike, expiry and type, so liquidity pools and prices converge.
* **Tokenized positions** — Buyers can sell before expiry. Writers can exit early.
* **Writers set the price** — Real bid/ask per series replaces the hardcoded 0.40% ask. Fair value shown as a guide.
* **Market makers** — Rebates, financing and a protocol-owned vault so every market is two-sided from day one.
* **Auto-everything** — Winning contracts settle straight into your wallet. Alerts for strikes, expiries and payouts.

## Buyer-First App

Buyers are the growth engine. The product speaks to them first.

* **Buy page is the front door** — A marketplace of live contracts. Each is a payoff card with a one-tap Buy.
* **Live payoff slider** — Drag the stock price and watch your payout update in real time.
* **Fractional contracts** — Buy 0.1 or 0.01 of a contract. Start with cents, not a full position.

## Revenue Model

Small, layered fees that scale with volume and stay invisible on a single trade.

* **Premium fee · 5%** — Unchanged. It's the stated brand fee.
* **Exercise fee · 0.25–0.50%** — Only when a contract wins, paid out of profit.
* **Taker fee · flat 0.10–0.25 USDG** — Flat, not a percentage, so micro-bets stay viable.
* **Maker rebate · 0.05–0.10 USDG** — Pays market makers to keep spreads tight.
* **Lending spread · ~10% of yield** — The platform's cut of interest on idle deposited stock.
* **Hard caps** — Every fee is bounded by the immutable core.

## Growth Loops

Make wins shareable, events tradeable, and yield passive.

* **Public wins feed** — Live P\&L cards, one-tap share images and a leaderboard for the biggest wins and streaks.
* **Event markets** — Pages for earnings, launches and macro events, expiring right after. New markets in minutes.
* **Set-and-forget for sellers** — Auto-roll and one-tap presets turn sellers into passive earners.

## Token Flywheel

Platform revenue buys back, burns and rewards stakers. A token that's necessary, not cosmetic.

* **The loop** — 60–70% of revenue to buyback-and-burn, 20–30% to staking, the rest to treasury.
* **Real yield** — Staking pays from actual earnings, not emissions. Burns scale with real usage.
* **Real perks** — Stakers get lower fees, better rates and a vote on fees, listings and events.
* **Emission discipline** — New tokens only against volume milestones, never on a timer.

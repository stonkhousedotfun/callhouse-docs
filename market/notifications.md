# Notifications

Choose alerts for price moves, expiries, fills, settlement, and writer positions, and learn what the service stores.

{% hint style="warning" %}
Stonkhouse v2 is unaudited. Interface v8 is deployed on Robinhood Chain 4663 from block 69,512,673 (22 September 2026); the launch markets are NVDA and SPCX. Registered markets can change; check the current app and on-chain status before trading. Operational services and market liquidity may be unavailable. Stock Tokens carry market and issuer risks. Buyers can lose their full cost; writers can lose collateral. Stonkhouse is not available to US persons. Read [Risks](../resources/risks.md) before using the product.
{% endhint %}

## Choose a channel

Alerts are not available. The notifier service has never been deployed and has no delivery target configured, so nothing is sent, and no date is planned. The rest of this page describes what the service does where it is run.

In `/settings/notifications`, connect your wallet and sign the notifier's challenge to manage subscriptions. You can link Telegram with a short-lived deep link, allow browser push after an explicit browser permission request, or add email if the service has email enabled. Email requires confirmation. Each channel can be disabled or unsubscribed separately. A signature proves control of your wallet; it is **not a transaction** and should be checked before signing.

Choose alerts for a strike crossing, an expiry 24 hours or one hour away, settlement, fills, writer in-the-money warnings, auto-roll events, and your own above/below price levels. A payout that failed to transfer to your wallet can also trigger a ledger notice. Alerts are advisory. Delivery can be delayed, dropped, or unavailable; watch your positions and the on-chain state directly.

The notifier distinguishes a **withdrawn auto-roll ask**, cancelled after a fresh oracle spot reached its strike, from a skipped roll. If you wrote the ask, it shows you the market, strike, observed spot and that the next roll waits until after the current expiry. This alert is not protection against an earlier fill; use on-chain order state as the source of truth.

## What the notifier stores

The service stores your wallet address, channel preferences and status, encrypted delivery targets, and delivery metadata. A browser push target is its endpoint, a Telegram target is a chat id, and an email target is your email address. Targets are encrypted at rest; list responses reveal only a masked email or push-service host. It also stores short-lived sign-in challenges and link tokens. The current session token is held in the app for settings access and expires. The notifier does not hold your signing key or custody your funds.

The service may cap delivery rate, retry transient failures, and disable an unreachable target. Turning alerts off does not change your option position or on-chain payout. If the notifier is down, the app explains the outage and the rest of the app remains usable.

## Related

* [Buying your first contract](../getting-started/buying-your-first-contract.md)
* [Settlement and payout](../buying/settlement-and-payout.md)
* [Risks](../resources/risks.md)

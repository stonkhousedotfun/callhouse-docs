# Risks

Review the ways an option, issuer, oracle, market, contract, or operational failure can cause a loss or delayed payout.

{% hint style="warning" %}
Stonkhouse v2 is unaudited and has no public production release. A separate chain-4663 dev deployment is for testing, not public trading. Stock Tokens carry market and issuer risks. Buyers can lose their full cost; writers can lose collateral. Stonkhouse is not available to US persons. Read [Security](../protocol/security.md) before using the product.
{% endhint %}

{% hint style="danger" %}
The dev deployment's hot admin key has no timelock. The maker-vault outflow cap does not restrict admin actions. Contract and issuer controls can still delay payouts or cause losses.
{% endhint %}

## Costs you can lose

**Buying.** Most options expire worthless. You can lose the full amount you paid for a long, including the taker fee and gas. A card's target payout is a scenario at expiry, not a predicted result or a resale quote. The book may move before your transaction confirms. Selling early requires a buyer at an acceptable price.

**Writing.** A covered call gives up upside above its strike on filled units. At a high final price, your short receives fewer Stock Tokens, worth about the strike per original share; the writer also keeps any premium after book fees. A cash-secured put can consume much of its USDG collateral if the price falls. Premium arrives only if someone fills your ask. The proposed v7 mint rent is charged **separately in your collateral asset** on every new mint, even if you minted before selling the long; an unfilled write-on-fill ask pays none. Rent can cost more than the premium from a cheap ask, and a direct pre-mint pays rent before any sale. A pre-expiry close returns unused rent to whoever closes, which may not be the original writer after a short transfer. A close at or after expiry returns no rent. Closing a short early can cost more than the premium earned or the refund. Stock Tokens and USDG themselves can lose value or become unusable.

## Price and settlement

The final price is an oracle average over the last 30 minutes before 16:00 New York, not the official share close or the last trade you see. The Chainlink push feed may have no new print near the close if the market moved less than its update threshold; a contract near the strike can settle on the other side of the strike from an external closing price. An early-close session still uses the calendar's 16:00 expiry. A pool source can be manipulated or unavailable. A single-source or disputed price waits through a delay, can be vetoed, and may need an admin resolution after 48 hours. Your payout can be late.

A winning call's in-kind payout is normally offered for conversion to USDG. The protocol sets a base shortfall bound and adds the selected route's pool fee, subject to a 300 bps total ceiling. If the conversion cannot meet its floor, you receive Stock Tokens instead. Even a successful conversion can realise less USDG than the card's settlement-price valuation. The payout route can change before redemption. A failed token transfer credits the Clearinghouse ledger; it does not make the issuer release a freeze.

## Issuer, contract, and operational risks

Stock Tokens are debt securities issued by Robinhood Assets (Jersey) Limited, not company shares. They carry no ordinary share voting right. The issuer can pause transfers, blocklist addresses, or burn tokens under its own rules. The USDG issuer can pause, freeze, or wipe balances. These powers can stop deposits, trades, conversion, redemption delivery, or withdrawals even when Stonkhouse code is functioning.

The v2 contracts are **unaudited** and have no public production release; a separate chain-4663 dev deployment is for testing. Contract, pricing, keeper, indexer, wallet, or bridge failures can delay or change what you receive. The dev design has one hot admin key without a timelock. It can change settings for future series, current spot and payout routes, announce bounded book-fee changes 24 hours ahead, and resolve a stuck settlement under contract rules. An expiry's settlement sources are pinned no later than its first series; if none of those sources produces a usable price, an admin-set price can still be needed after 48 hours. For a Held expiry with exactly one recorded usable price, the admin may set a final price within 0.8× to 1.25× of it after seven days, and the admin can grant itself the guardian role that places the hold. The guardian can pause new risk and veto a settlement candidate. Neither role is meant to move user collateral, but a bug or compromised dependency can still cause loss. Read [Roles](../protocol/roles.md) and [Security](../protocol/security.md).

Approving the OrderBook or AutoRoller gives those contracts specific powers over free collateral or asks. Verify addresses and revoke approvals you no longer need. A maker's quoted collateral may be used by another fill before yours. An indexer outage can hide the book and an alert outage can leave you without a warning; the chain remains the source of truth. V1 positions do not move into v2 automatically.

The proposed v7 stale-ask cancellation cannot stop every unfavourable fill. It needs a fresh oracle reading and an on-chain transaction after the strike is reached. A trade can win the race or occur on an off-chain move before the feed prints. A cancelled auto-roll ask is not reposted during the same period, so you may miss premium. The proposed MakerVault net USDG outflow cap refills over 24 hours and does not bound the value of options sold or losses at settlement. It may also restrict legitimate bids; an admin key is exempt. See [Market makers](../market/market-makers.md) and [Security](../protocol/security.md).

Stonkhouse is not available to US persons. Check the Stock Token issuer's eligibility rules as well. Nothing here is investment, legal, or tax advice, or an offer of securities. Where this prose and the code disagree, **the code is the specification**.

## Related

* [Documentation home](../README.md)
* [Fees](../product/fees.md)
* [Oracle and settlement](../protocol/oracle-and-settlement.md)
* [Security](../protocol/security.md)

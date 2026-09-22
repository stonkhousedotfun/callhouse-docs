# Risks

Review the ways an option, issuer, oracle, market, contract, or operational failure can cause a loss or delayed payout.

{% hint style="warning" %}
Stonkhouse v2 is unaudited. Interface v8 is deployed on Robinhood Chain 4663 from block 69,512,673 (22 September 2026); the launch markets are NVDA and SPCX. Registered markets can change; check the current app and on-chain status before trading. Operational services and market liquidity may be unavailable. Stock Tokens carry market and issuer risks. Buyers can lose their full cost; writers can lose collateral. Stonkhouse is not available to US persons. Read [Security](../protocol/security.md) before using the product.
{% endhint %}

{% hint style="danger" %}
Privileged changes are delayed, not prevented. Every delayed role sits with one 2-of-3 Admin Safe; a 2-of-3 Treasury Safe receives the protocol's money and holds no role at all. All three signing keys of each Safe are the owner's, and the guardian, pricer, quoter and buyback keys are hot keys with no delay at all; the Admin Safe itself also holds the guardian and quoter roles with no delay, and the operations role that rotates them has none either. The maker-vault outflow cap does not restrict treasury-role withdrawals. Contract and issuer controls can still delay payouts or cause losses.
{% endhint %}

## Costs you can lose

**Buying.** Most options expire worthless. You can lose the full amount you paid for a long, including the taker fee and gas. A card's target payout is a scenario at expiry, not a predicted result or a resale quote. The book may move before your transaction confirms. Selling early requires a buyer at an acceptable price.

**Writing.** A covered call gives up upside above its strike on filled units. At a high final price, your short receives fewer Stock Tokens, worth about the strike per original share; the writer also keeps any premium after book fees. A cash-secured put can consume much of its USDG collateral if the price falls. Premium arrives only if someone fills your ask, and only a fill mints: there is no route by which an unfilled ask costs you anything. On the current contracts a first sale pays 5% of the premium as the primary fee and a resale pays none. Both launch markets set their collateral-rent rate to 0, but the rate is a dial the contracts keep, and raising it is announced 72 hours before it can reach a new series; read the ticket rather than assuming. The legacy dev-launch contracts, still in run-off, charge no primary fee and 80 ppm rent on NVDA. A pre-expiry close returns any unused rent to whoever closes, which may not be the original writer after a short transfer. Closing a short early can cost more than the premium earned. Stock Tokens and USDG themselves can lose value or become unusable.

## Price and settlement

The final price is an oracle average over the last 30 minutes before 16:00 New York, not the official share close or the last trade you see. The Chainlink push feed may have no new print near the close if the market moved less than its update threshold; a contract near the strike can settle on the other side of the strike from an external closing price. An early-close session still uses the calendar's 16:00 expiry. A pool source can be manipulated or unavailable. A single-source or disputed price waits through a delay, can be vetoed, and may need an admin resolution after 48 hours. Your payout can be late.

A winning call's in-kind payout is normally offered for conversion to USDG. The protocol sets a base shortfall bound and adds the selected route's pool fee, subject to a 300 bps total ceiling. If the conversion cannot meet its floor, you receive Stock Tokens instead. Even a successful conversion can realise less USDG than the card's settlement-price valuation. The payout route can change before redemption. A failed token transfer credits the Clearinghouse ledger; it does not make the issuer release a freeze.

## Issuer, contract, and operational risks

Stock Tokens are debt securities issued by Robinhood Assets (Jersey) Limited, not company shares. They carry no ordinary share voting right. The issuer can pause transfers, blocklist addresses, or burn tokens under its own rules. The USDG issuer can pause, freeze, or wipe balances. These powers can stop deposits, trades, conversion, redemption delivery, or withdrawals even when Stonkhouse code is functioning.

The v2 contracts are **unaudited**. The current contracts are a fresh deployment made on Robinhood Chain 4663 on 22 September 2026, with their own role manager and Safes; the legacy dev-launch contracts are still on chain, still accept new positions, and are governed by a single hot admin key with no waiting period at all. Contract, pricing, keeper, indexer, wallet, or bridge failures can delay or change what you receive. Privileged calls on the current contracts run through a role manager with per-role waiting periods: one hour to list, enable or re-tick a market, 24 hours to change settings for future series, current spot or payout routes, 24 hours to change a fee recipient or move maker-vault funds to the treasury, 48 hours before a bounded book-fee change can be scheduled and a further 48 hours before the scheduled parameters bite, 72 hours to change a market's exercise fee or rent dial, and 48 hours to change who holds a role. The operations, guardian, pricer, quoter and buyback roles have no delay at all. The guardian can cancel a pending change in every lane except a role change, which only the Safe can cancel. An expiry's settlement sources are pinned no later than its first series; if none of those sources produces a usable price, a role-set price can still be needed after 48 hours. For a Held expiry with exactly one recorded usable price, that role may set a final price within 0.8× to 1.25× of it after seven days, and the operations role can grant the guardian key that places the hold with no delay. The guardian can pause new risk and veto a settlement candidate. No role is meant to move user collateral, but a bug or compromised dependency can still cause loss. Read [Roles](../protocol/roles.md) and [Security](../protocol/security.md).

Approving the OrderBook or AutoRoller gives those contracts specific powers over free collateral or asks. Verify addresses and revoke approvals you no longer need. A maker's quoted collateral may be used by another fill before yours. An indexer outage can hide the book and an alert outage can leave you without a warning; the chain remains the source of truth. V1 positions do not move into v2 automatically.

Protocol-side liquidity is not switched on. The house vault that would quote on the launch markets reports its protocol accounts as unconfirmed, so it takes no orders, and the maker vault, the house vaults, the keeper reward pool and the fee splitter all hold 0 USDG. Until the owner arms and funds them, any bid or ask you see comes from other users, a series can have no quote at all, and the permissionless lifecycle calls pay no bounty, so nobody is being paid to finalise or settle your expiry. The notification service is not running either: it has never been deployed and holds no messaging credential, so do not wait for an alert.

Stale-ask cancellation cannot stop every unfavourable fill. It needs a fresh oracle reading and an on-chain transaction after the strike is reached. A trade can win the race or occur on an off-chain move before the feed prints. A cancelled auto-roll ask is not reposted during the same period, so you may miss premium. The deployed MakerVault net USDG outflow cap refills over 24 hours and binds every quoting caller, the owner's Safe included; no key is exempt. It does not bound the value of options sold or the losses at settlement, and a treasury withdrawal from the vault is a separate action on a 24-hour delay. The cap can also block a legitimate bid once the window's budget is spent. See [Market makers](../market/market-makers.md) and [Security](../protocol/security.md).

Stonkhouse is not available to US persons. Check the Stock Token issuer's eligibility rules as well. Nothing here is investment, legal, or tax advice, or an offer of securities. Where this prose and the code disagree, **the code is the specification**.

## Related

* [Documentation home](../README.md)
* [Fees](../product/fees.md)
* [Oracle and settlement](../protocol/oracle-and-settlement.md)
* [Security](../protocol/security.md)

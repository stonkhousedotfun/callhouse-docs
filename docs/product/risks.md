# Risks

This is the full list. Most of these are not bugs and have no fix. They are the shape of writing covered calls against a tokenised security on a one-week clock, through contracts and tokens other people control.

{% hint style="danger" %}
**You can lose the collateral you deposit.** The Stonkhouse contracts are live on Robinhood Chain and **unaudited**: no external firm has audited them yet. An external audit is pending, with no report yet. The factory is `0xc4A5Cd0DE91CaB7F5Ebe2114bc63Fbb43E642BBb`. Every address is on [Contracts and addresses](../protocol/addresses.md).
{% endhint %}

{% hint style="warning" %}
* Premium is paid only if a buyer fills.
* Assignment can take listed lots at the strike.
* Idle NVDA is not written, and cannot be assigned.
* Stock Tokens are debt securities.
* Stonkhouse is not available to US persons.
{% endhint %}

## The ordinary outcomes

### Weeks that pay zero

You list lots and nobody buys them before the exercise timestamp. Nothing is written, the listing ends, and that week's premium is zero. On a thin market for weekly calls on a tokenised stock, this is the most likely outcome.

**Costs you:** the week's premium, which is zero, and the time. No fee. Unsold NVDA unlocks at `settle`. Idle lots you did not list were never at risk.

**What the system does:** the book only shows live lots. There is no dealer obliged to take the other side.

### A fill refused after a rally

Each fill re-checks the strike band and the premium floor at live spot. If NVDA rises far enough, the week's ask is under the floor, or the strike is under the 3% OTM bound, and fills revert.

**Costs you:** sales. The strike belongs to the week: no new ask fixes a strike that has moved too close to spot.

### Assignment caps your upside

Anyone holding **your** option type can exercise during your window. For each assigned lot, Valorem takes that NVDA at the strike. You keep the premium already paid to your wallet, and collect strike USDG after `settle`. v1 does not buy the NVDA back. See [Assignment](assignment.md).

### Listed NVDA is locked

Once you list, reserved lots cannot be withdrawn until `settle` after your expiry. Idle NVDA can still go out.

## Keys and admin

Factory admin is one hot EOA, `0xEb82c3D0F89d47453F94f0C2b2a2752e27a19d9b`, with no timelock. It is also the fee recipient. It can change policy inside hard caps, the fee recipient, the deposit cap, the price age, Valorem-fee acceptance, and roles, immediately.

A compromised keeper can set a week's strike and ask at the policy floor and list your requested lots. It cannot withdraw your NVDA. A compromised admin can loosen policy to the compiled floors and raise the fee to 20%. See [Roles and admin powers](../protocol/roles.md).

The guardian can halt new lists and fills. It cannot move tokens.

## The Stock Token issuer

Stock Tokens are debt securities issued by Robinhood Assets (Jersey) Limited. They are not Nvidia shares: no vote, no claim on Nvidia. The issuer can pause transfers, blocklist addresses (your account included) and burn tokens from any address. During a pause or a blocklist of your account, deposits, withdrawals and fills that move NVDA stop. USDG already in your wallet from fills is yours. Strike USDG waits in the claim until `settle` can redeem.

An issuer burn of tokens sitting in your account is a loss of that NVDA. There is no technical workaround.

## Oracle, Seaport, Valorem, chain

Fills and lists read Chainlink RHNVDA/USD. A stale or paused feed stops lists and fills, not withdrawals of idle NVDA.

Seaport 1.6 and Valorem are external. A clearinghouse or marketplace failure can strand a claim or block fills. `settle` is permissionless after expiry so a stopped keeper cannot trap reserved NVDA forever.

Robinhood Chain, USDG and the Stock Token each have issuer / operator powers outside Stonkhouse.

## Regulatory perimeter

Stonkhouse is not available to US persons. That is a Terms of Use restriction, not an on-chain block. It applies to depositing and to buying calls. The Terms at `stonkhouse.fun/terms` cover the site and the app. No operating entity and no governing law have been designated yet.

## Unaudited code

The live factory and account implementation have had no external audit. An internal review of the earlier pooled vault led to write-on-fill and is not a substitute. There is no bug bounty. See [Security and audits](../protocol/security.md).

## The closed pooled vault

The previous product was a shared `cNVDA` vault at `0x88a98931E3682137E7e4D3426f623247f4A4ecbb`. It is closed. If you still have a queued redemption there, collect it at `app.stonkhouse.fun/collect`. That vault is not the live listing venue.

## Related

* [Launch policy and hard caps](policy.md)
* [Fees](fees.md)
* [Assignment](assignment.md)

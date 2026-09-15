# Glossary

### Admin

The holder of the vault's `DEFAULT_ADMIN_ROLE`: today one hot EOA, `0xEb82c3D0F89d47453F94f0C2b2a2752e27a19d9b`, the deployer, which is also the protocol fee recipient. The admin sets policy inside the hard caps, the deposit cap, the price-age limit and the fee recipient, decides whether to accept Valorem's engine fee, can halt and lift a halt, and grants and revokes roles. There is no timelock on any of it, and every change takes effect at once. It has no function that transfers depositors' tokens. Moving the role to a Safe is planned and has not happened. See [Roles and admin powers](../protocol/roles.md).

### Assignment

What happens to the writer of a call when a holder exercises it. Valorem takes the vault's NVDA collateral at the strike and leaves the strike price in USDG. Assignment can take the collateral at the strike. Valorem spreads each exercise pro rata by amount written across the writers in a bucket, and every write made before an option's first exercise shares one bucket, so a call the vault sold can be assigned whoever exercises. Because the vault writes only what it sells, it can never be assigned on more contracts than it sold. See [Assignment](../product/assignment.md).

### Capacity

How many more contracts the vault can sell in the current week: the lower of 95% of its NVDA (in whole contracts) and 50 contracts under the live policy, minus the contracts already written. A listing may offer at most the capacity at the moment it is authorised, and every fill is measured against it again, so a fill can be refused if the vault's NVDA has fallen in between.

### cNVDA

The share token of the Stonkhouse NVDA vault. An ERC-20 with 18 decimals, representing a pro-rata claim on the vault's NVDA plus separately accrued USDG. It is not a Stock Token and not Nvidia equity.

### completeRedeem

The function that pays a settled redemption: the NVDA leg first, then the USDG leg on its own, which is deferred if USDG cannot move. It also pays your share of a stranded claim once that claim has been redeemed. See [Withdrawing and the redeem queue](../getting-started/withdrawing.md).

### Contract (lot)

One option contract, backed by exactly 1.0000 NVDA Stock Token. The vault writes whole contracts only, and only inside a buyer's fill.

### Covered call

A call option sold by someone who already holds the asset the call is on. The seller collects a premium and in return gives up any rise above the strike until expiry. Stonkhouse's calls are covered by the NVDA depositors put in.

### DepositsClosed

The one error the vault uses for every reason deposits are closed: the wrong phase, an exercise timestamp that has passed, assignment proceeds still in the claim, a stranded claim, a reserve left unbacked by an issuer burn, a share price below the share-price floor, or a fill earlier in the same transaction. A deposit over the cap fails with a separate error, `DepositCapExceeded`. See [Depositing](../getting-started/depositing.md).

### Epoch

One settled batch of queued redemptions. Queued shares are tagged with the current epoch, and the epoch settles when the week's `rollClose` runs or when anyone calls `settleQueue` while the vault is Idle. The epoch number goes up by one each time a queue settles.

### Exercise timestamp

The moment, fixed in each week's option type, when the sale window closes and the exercise window opens. The keeper sets it at the NYSE close on Friday, 4:00pm New York time, or on Thursday when Friday is an NYSE holiday. Listings must end by it, and fills and deposits close at it.

### Exercise window

The period from the exercise timestamp up to expiry during which holders of the week's calls can exercise them on the Valorem clearinghouse. The keeper sets it to 24 hours; the vault accepts nothing shorter than one day. Holders exercise through the Exercise card on the app's cycle page, whose button is enabled only inside this window, or by calling `exercise` on the clearinghouse directly.

### Expiry

The end of the week's option, fixed in its option type: 24 hours after the exercise timestamp, as the keeper sets it. After expiry the calls can no longer be exercised and the week can be closed with `rollClose`.

### Guardian

A single-key role that can halt writes (new weeks, listings and every fill) and cancel listings, and nothing else. It cannot touch collateral, change policy or stop a withdrawal. Lifting a halt needs the admin role.

### Keeper

The hot-key service that runs the week: it creates the week's option type on the clearinghouse, arms it with `rollOpen`, authorises and cancels listings, and normally calls `lockBook`, `rollClose` and `settleQueue`, which anyone else can also call (`rollClose` from one hour after expiry). It never holds option tokens and cannot move funds. The vault checks every proposal against its own rules. See [How Stonkhouse works](../getting-started/how-it-works.md).

### lockBook

The function that moves the vault from Listed to Exercisable. Anyone can call it from the exercise timestamp. It invalidates any listing still live. Calling it is optional; fills and deposits close on the timestamp regardless.

### Option type

A Valorem call option defined by six fixed terms: the underlying (the NVDA Stock Token), the amount per contract (one token), the exercise asset (USDG), the strike, the exercise timestamp and the expiry. The keeper creates one each week with the clearinghouse's `newOptionType`, which anyone can call. The terms cannot change once created, and the option's id is derived from them. The vault reads them back from the clearinghouse and checks them before it arms the week.

### OTM (out of the money)

A call whose strike is above the current price. Under the live policy the vault arms only options whose strike is 3% to 12% above spot, and the hard caps never allow less than 1%. The keeper aims for 5% to 11.5%. At every fill the strike must still be at least the band's lower bound at live spot.

### Premium

The USDG a buyer pays for a call. Premium is paid only if a buyer fills. The whole premium reaches the vault in the buyer's transaction. It is credited to depositors as claimable USDG after the Stonkhouse protocol fee, and never added to the share price.

### Premium floor

The least a fill must pay: 0.10% of spot per contract under the live policy, which is also the compiled minimum, plus the value at spot of Valorem's engine fee if that fee is on. The vault checks it when a listing is authorised and again at every fill, against the spot of that moment.

### Protocol fee

Stonkhouse's fee: 5% of the premium under the live policy, changeable by the admin up to a compiled ceiling of 20%. Never charged on deposits, idle NVDA or strike proceeds. See [Fees](../product/fees.md).

### Redeem queue

The withdrawal path whenever the vault is not flat. `queueRedeem` escrows your shares, `rollClose` or `settleQueue` settles them, and `completeRedeem` pays you NVDA plus USDG. See [Withdrawing and the redeem queue](../getting-started/withdrawing.md).

### Reserve haircut

The pro-rata cut applied to settled redemptions when an issuer burn has left the vault holding less NVDA than it set aside for them. Every redeemer who has not yet collected is paid the same fraction: the vault's NVDA balance over the amount set aside.

### Restricted order

A Seaport order that Seaport will fill only after calling its zone. The vault's listing is a `PARTIAL_RESTRICTED` Seaport 1.6 order: restricted, so every fill runs the vault's checks, and partial, so a buyer can take some of the contracts and leave the rest on offer.

### retryStrandedClaim

The function that redeems a stranded claim. Anyone can call it, any number of times. It reverts with `StillStranded` while the cause persists and redeems the claim the first time Valorem lets it through, crediting the returned NVDA and strike USDG to the shares and epochs they belong to.

### rollClose

The function that ends the week. It redeems the vault's Valorem claim, credits USDG and takes the protocol fee on premium only, settles the redeem queue, and returns the vault to Idle. If the claim cannot be redeemed, it keeps the claim as a stranded claim and still returns to Idle. The keeper can call it from expiry; anyone can call it one hour after expiry.

### rollOpen

The function that starts the week. Only the keeper can call it, and only while the vault is Idle, writes are not halted and no claim is stranded. It arms the week's option type after the vault checks its terms, strike, window, fee state and price feed. It writes nothing.

### Safe

A smart-contract wallet that needs a set number of its owners' signatures to act. The switch for the Valorem engine fee on Stonkhouse's clearinghouse is held by a 1-of-1 Safe, so one owner's signature is enough. The vault's admin role is not held by a Safe today, and the protocol fee is paid to the admin's hot key.

### Seaport 1.6

The third-party order settlement contract the vault sells its calls through. It has no owner, no upgrade path and no pause. The vault validates its one live order on Seaport, so the order fills with an empty signature.

### settleQueue

A function anyone can call while the vault is Idle and shares are queued. It credits any USDG that has arrived since the last close, then settles the whole queue at the price an instant redemption would pay at that moment. It moves no tokens. While a claim is stranded, it also books each settled epoch's share of the claim.

### Share price

NVDA per cNVDA share: the vault's idle NVDA, plus NVDA locked in the current week's claim, minus NVDA already set aside for settled redemptions, never below zero, divided by the share supply. While a claim is stranded, only the part of it owned by shares still held is counted. Deposits and redemptions leave it unchanged, apart from rounding in the vault's favour. It falls when NVDA leaves without shares being burned, as in an assignment. It leaves out USDG and the open short calls, so it is not a full measure of what a share is worth.

### Share-price floor

A limit compiled into the vault: it sells no new shares while one cNVDA is worth less than one millionth of an NVDA. Only a vault that has lost almost all its NVDA with its shares still outstanding reaches it. Deposits reopen by themselves when the share price recovers.

### Stock Token

A tokenised stock instrument on Robinhood Chain. The vault's collateral is the NVDA Stock Token, which has 18 decimals. Stock Tokens are debt securities. They are issued by Robinhood Assets (Jersey) Limited, carry no shareholder rights or vote, and the issuer can freeze transfers and burn tokens. Corporate actions such as splits and dividend adjustments are shown through a display multiplier; the vault's accounting uses raw balances.

### Stranded claim

A week's Valorem claim that `rollClose` could not redeem, because a token issuer made the redeem revert (for example USDG paused, the vault frozen by USDG, or the vault blocklisted on the NVDA Stock Token). The vault returns to Idle and keeps the claim. Deposits and instant redemption stay closed and no new week can be armed until `retryStrandedClaim` redeems it; the redeem queue keeps working.

### Strike

The price at which a call can be exercised, in USDG per contract, fixed in the week's option type. The keeper picks the strike where a call's delta is about 0.15 in Cboe's delayed NVDA option quotes, kept between 5% and 11.5% above spot under the live policy and rounded to a whole USDG. If a call is assigned, the vault receives the strike for each assigned contract.

### USDG

The stablecoin that premium and strike proceeds are paid in. It has 6 decimals. It is a third-party token whose contract Stonkhouse does not control; its issuer can pause it and freeze addresses.

### USDG leg (deferred)

The USDG part of a redemption payout that could not be transferred when you called `completeRedeem`. The NVDA part is paid anyway; the USDG stays owed to you and a later `completeRedeem`, to any address, collects it.

### Valorem Clear

The options clearinghouse contract, written by Valorem, that holds the vault's NVDA collateral, mints the option tokens and a claim for the writer, and settles exercise and assignment. The vault uses Stonkhouse's own deployment, `0x53d7A6d0489Daf3d67b9A314e0eAB2B78Acab9C6`, whose code matches upstream Valorem except for its metadata hash; it is not source-verified. It has no owner, no pause and no upgrade path. Its one admin key, `feeTo` (a 1-of-1 Safe), can switch the engine fee on or off, hand that key on, change the token metadata generator and sweep collected fees; it cannot touch collateral.

### Valorem engine fee

A 15 bps fee on written notional, charged in NVDA by the clearinghouse when its fee switch is on, plus 15 bps of the strike charged to whoever exercises. It is off. The vault refuses to arm or fill while it is on unless the admin has explicitly accepted it; if accepted, every fill's premium floor rises by the fee's value at spot.

### Write on fill

The rule that the vault writes calls only inside a buyer's fill, exactly as many as the buyer takes, and checks afterwards that none stayed behind. Nothing is written when a week is armed or listed, the vault never holds an unsold call, and it can never be assigned on more contracts than it sold.

### Zone

The contract Seaport calls before and after it fills a restricted order. The vault is the zone of its own listing: before Seaport moves anything, the vault re-checks the fill and writes the calls, and afterwards it confirms no option token stayed behind.

### Overcall and the registry (history)

**History note.** Earlier designs of Stonkhouse sold the vault's calls through Overcall's order book and took each week's strikes and timing from Overcall's on-chain registry. The current vault does not use either: the keeper creates the week's option type, the vault checks it against the clearinghouse itself, and the calls are sold through the vault's own Seaport order.

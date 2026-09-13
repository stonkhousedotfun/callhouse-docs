# Glossary

### Admin Safe

The 2-of-3 Safe multisig that will hold the vault's admin role after the launch handover. Until then the deployer key holds it. The admin sets policy inside the hard caps, the deposit cap, the price-age limit and the fee recipient, decides whether to accept Valorem's engine fee, can halt and lift a halt, and grants and revokes roles. It has no function that transfers depositors' tokens. See [Roles and admin powers](../protocol/roles.md).

### Assignment

What happens to the writer of a call when a holder exercises it. Valorem takes the vault's NVDA collateral at the strike and leaves the strike price in USDG. Assignment can take the collateral at the strike. It can be partial: some of the vault's contracts assigned and the rest not. It is spread across everyone who wrote the same option, so contracts the vault wrote but did not sell can be assigned too. See [Assignment](../product/assignment.md).

### Bootstrap admin

The launch arrangement for the vault's admin role: the deployer's own key holds `DEFAULT_ADMIN_ROLE` from deployment until a two-step handover to the 2-of-3 Admin Safe. Until the handover that one key holds every admin power, including the fee up to its 20%-of-premium ceiling, the fee recipient, the deposit cap and role grants. See [Roles and admin powers](../protocol/roles.md).

### cNVDA

The share token of the Callhouse NVDA vault. An ERC-20 with 18 decimals, representing a pro-rata claim on the vault's NVDA plus separately accrued USDG. It is not a Stock Token and not Nvidia equity.

### Contract (lot)

One option contract, backed by exactly 1.0000 NVDA Stock Token. The vault writes whole contracts only.

### Covered call

A call option sold by someone who already holds the asset the call is on. The seller collects a premium and in return gives up any rise above the strike until expiry. Callhouse's calls are covered by the NVDA depositors put in.

### Epoch

One settled batch of queued redemptions. Queued shares are tagged with the current epoch, and the epoch settles when the week's `rollClose` runs. The epoch number goes up by one each time a queue settles.

### Exercise timestamp

The moment, set by Overcall's registry for each cycle, when the book closes and the exercise window opens. Listings must end by it, and deposits close at it.

### Exercise window

The period from the exercise timestamp to expiry during which holders of the week's calls can exercise them. Overcall's current window is 24 hours.

### Expiry

The end of the cycle, set by Overcall's registry. After expiry the calls can no longer be exercised and the week can be closed with `rollClose`.

### Guardian

A single-key role that can halt new writes and cancel listings, and nothing else. It cannot touch collateral, change policy or stop a withdrawal. Lifting a halt needs the admin role (the deployer key at launch, the Admin Safe after the handover).

### Keeper

The hot-key service that runs the weekly cycle: it opens the week with `rollOpen`, proposes and cancels listings, and closes the week with `rollClose`. It never holds the option tokens and cannot move funds. The vault checks every proposal against its own rules.

### lockBook

The function that moves the vault from Listed to Exercisable. Anyone can call it from the exercise timestamp. It cancels any listing still live. Calling it is optional; deposits close on the timestamp regardless.

### OTM (out of the money)

A call whose strike is above the current price. Callhouse writes only calls whose strike is 3% to 12% above spot at launch, and never less than 1% above spot under the hard caps.

### Overcall

The third-party options venue Callhouse uses. Its registry publishes the weekly cycle and strikes for each market, and its book shows listings to buyers. Overcall takes 5% of gross premium on each fill.

### Premium

The USDG a buyer pays for a call. Premium is paid only if a buyer fills. It is credited to depositors as claimable USDG, after Overcall's 5% and the Callhouse protocol fee, and never added to the share price.

### Protocol fee

Callhouse's fee: 5% of the premium the vault receives at launch, with a compiled ceiling of 20%. Never charged on deposits, idle NVDA or strike proceeds. See [Fees](../product/fees.md).

### Redeem queue

The withdrawal path while a call is open. `queueRedeem` escrows your shares, `rollClose` settles them, and `completeRedeem` pays you NVDA plus USDG. See [Withdrawing and the redeem queue](../getting-started/withdrawing.md).

### Registry

Overcall's per-market contract that defines each weekly cycle: its number, the approved strike rungs, the exercise timestamp, the expiry and the lot size. The registry owner can change the lot size between cycles, and the vault refuses to write calls in any cycle whose lot size is not exactly one token. The vault binds to it instead of a calendar.

### rollClose

The function that ends the week. It redeems the vault's Valorem claim, harvests USDG and takes the protocol fee on premium only, settles the redeem queue, and returns the vault to Idle. The keeper can call it from expiry; anyone can call it one hour after expiry.

### rollOpen

The function that starts the week. Only the keeper can call it, and only while the vault is Idle and the registry's writing window is open. The vault checks the strike, size, price feed and cycle before locking NVDA in Valorem and writing the calls.

### Safe

A smart-contract multisig wallet that needs a set number of signers to act. Callhouse's admin role moves to a 2-of-3 Safe after the launch handover (a single deployer key holds it until then), and the protocol fee is paid to a fee Safe.

### Share price

NVDA per cNVDA share: the vault's idle NVDA, minus NVDA already set aside for settled redemptions, plus NVDA locked in the current call, divided by the share supply. Deposits and redemptions leave it unchanged, apart from rounding in the vault's favour. It falls when NVDA leaves without shares being burned, as in an assignment. It leaves out USDG and the open short call, so it is not a full measure of what a share is worth.

### Stock Token

A tokenised stock instrument on Robinhood Chain. The vault's collateral is the NVDA Stock Token, which has 18 decimals. Stock Tokens are debt securities. They are issued by Robinhood Assets (Jersey) Limited, carry no shareholder rights or vote, and the issuer can freeze transfers. Corporate actions such as splits and dividend adjustments are shown through a display multiplier; the vault's accounting uses raw balances.

### Strike

The price at which a call can be exercised, in USDG per contract. If a call is assigned, the vault receives the strike for each assigned contract.

### USDG

The stablecoin that premium and strike proceeds are paid in. It has 6 decimals. It is a third-party token whose contract Callhouse does not control.

### Valorem Clear

The third-party options clearinghouse that holds the vault's NVDA collateral, mints the option tokens and a claim for the writer, and settles exercise and assignment.

# Screen Inventory & UX State Specifications
## Complete Catalog of Public, Authenticated, Financial & Supporting Screens

**Document Version:** 1.0.0  
**Phase:** 02 — Design System & UI/UX Foundation  
**Status:** Canonical Screen Specification  
**Classification:** Internal Architectural & Engineering Standard  

---

## 1. Overview & Architectural Conventions

This document specifies every screen, sub-view, modal, and state within the Crypto Wallet MVP. All layouts, component hierarchies, and interactions strictly align with the approved PRD (`docs/PRD.md`), System Architecture (`docs/ARCHITECTURE.md`), and UI/UX Specification (`docs/UI_UX_SPEC.md`).

---

## 2. Public Experience Screens

### 2.1 Public Marketing Homepage (`/`)
- **Purpose:** Introduce the product, communicate the core value proposition (secure NGN <-> EVM crypto bridge), build trust, and drive user registration.
- **Primary Action:** Click "Get Started" / "Create Account".
- **Secondary Actions:** View live asset rates, read security model, explore FAQ, click "Sign In".
- **Layout Hierarchy:**
  1. *Sticky Header:* Logo, navigation anchors ("Features", "Security", "Fees", "FAQ"), Theme toggle, "Sign In" (outline), "Get Started" (primary).
  2. *Hero Section:* High-contrast headline, explanatory subhead, primary CTA, secondary CTA ("Explore Assets"), live exchange ticker card.
  3. *Core Features Grid:* 4-card grid (NGN Bank Top-up, Instant Off-chain Transfers, Institutional Custody, Zero Gas Headaches).
  4. *Supported Assets Strip:* Visual cards for NGN, USDT, ETH with live indicators and EVM network badge.
  5. *Institutional Security Section:* Architecture breakdown (Double-entry ledger, zero key storage, MPC custody).
  6. *FAQ Accordion:* 6 key questions regarding funding speed, limits, and custody model.
  7. *Footer:* Terms, privacy, risk disclosure, support links.
- **Required Components:** `Navbar`, `HeroSection`, `RatesTicker`, `FeatureCard`, `AssetCard`, `SecuritySection`, `FaqAccordion`, `Footer`.
- **States:**
  - *Loading:* Pulse skeletons for live rates ticker.
  - *Error:* Fallback static rates with timestamp disclaimer if rate feed fails.
- **Responsive Behavior:** 4-column feature grid stacks to 2-column on tablet (768px) and 1-column on mobile (<640px). Sticky nav collapses into an accessible mobile hamburger drawer.
- **Accessibility:** Semantic `<header>`, `<main>`, `<section>`, and `<footer>` landmarks; accessible accordion with ARIA `expanded` attributes.

---

## 3. Authentication Screens

### 3.1 User Registration (`/auth/register`)
- **Purpose:** Onboard new Nigerian users with email, phone number, and secure password.
- **Primary Action:** Submit registration form ("Create Account").
- **Secondary Actions:** Link to "Sign In", click Terms of Service / Privacy Policy links.
- **Layout Hierarchy:** Centered card with brand mark, progress step indicator, form fields, password strength meter, TOS consent checkbox, submit button.
- **Required Components:** `Card`, `Input`, `PasswordInput`, `PasswordStrengthMeter`, `Checkbox`, `Button`, `InlineAlert`.
- **States:**
  - *Active:* Real-time input validation; password strength updates dynamically.
  - *Loading:* Button displays spinner and label "Creating account..."; inputs disabled.
  - *Error:* Inline error banner displaying specific failure (e.g. "Email already registered").
- **Responsive Behavior:** Full-width card with 16px margins on mobile; max-w-md centered on desktop.
- **Accessibility:** Form fields labeled explicitly; error messages linked via `aria-describedby`.

### 3.2 User Login (`/auth/login`)
- **Purpose:** Authenticate returning users via email and password.
- **Primary Action:** Submit credentials ("Sign In").
- **Secondary Actions:** "Forgot Password?", "Create Account".
- **Layout Hierarchy:** Centered card, email input, password input, "Remember me" switch, submit button, alternate auth links.
- **Required Components:** `Card`, `Input`, `PasswordInput`, `Button`, `InlineAlert`.
- **States:**
  - *Active:* Fields ready for entry.
  - *Loading:* Spinner on submit button; inputs disabled.
  - *Error:* "Invalid email or password" generic message; rate-limit countdown banner after 5 failed attempts.
- **Responsive & Accessibility:** Autofocus on email input; accessible tab index navigation.

### 3.3 Email Verification (`/auth/verify-email`)
- **Purpose:** Verify user ownership of the registered email address.
- **Primary Action:** Enter 6-digit OTP code or click verification link.
- **Secondary Actions:** "Resend verification code" (with 60-second cooldown timer).
- **Required Components:** `Card`, `OtpInputGroup`, `CountdownTimer`, `Button`.

### 3.4 Password Reset (`/auth/reset-password`)
- **Purpose:** Allow users to recover access via password reset email.
- **Primary Action:** "Send Reset Instructions".
- **States:** Entry state -> Confirmation state ("Check your inbox for reset instructions").

---

## 4. Wallet Dashboard Screens

### 4.1 Portfolio Dashboard (`/dashboard`)
- **Purpose:** Primary authenticated hub displaying net worth, asset balances, quick action tray, and recent activity.
- **Primary Action:** Choose quick action (Add Money, Receive, Transfer, Swap).
- **Secondary Actions:** Toggle balance privacy masking (`••••••`), click asset row for details, view full transaction history.
- **Layout Hierarchy:**
  1. *Dashboard Header:* Greeting, user avatar, KYC badge, notification bell.
  2. *Portfolio Hero Card:* Aggregate Net Worth in NGN (`font-mono text-3xl font-bold`), USD secondary valuation, privacy eye toggle, 4-button quick action bar.
  3. *Asset Balances Table / List:* Rows for NGN, USDT, ETH showing Available Balance, Reserved Balance, Fiat Value, and quick action dropdown.
  4. *Recent Transactions Feed:* Card containing the 5 most recent entries with status badges, transaction icons, and "View All" link.
- **Required Components:** `DashboardLayout`, `PortfolioHero`, `BalanceMaskToggle`, `QuickActionBar`, `AssetList`, `AssetRow`, `TransactionStatusBadge`, `RecentTransactionsCard`.
- **States:**
  - *Loading:* Skeleton pulse cards for balances and transaction rows.
  - *Empty:* Shown for newly registered users: friendly banner *"Welcome! Add money via bank transfer to get started"*.
  - *Error:* Error banner with "Retry" action if balance fetch times out.
- **Responsive Behavior:** Desktop shows 3-column layout with persistent sidebar; mobile shows bottom navigation bar and stacks asset cards into vertical touch list.
- **Accessibility:** Screen reader announces "Balance masked" or "Balance visible" on toggle.

---

## 5. Add Money (Fiat NGN On-Ramp) Screens

### 5.1 Funding Request & Amount Selection (`/dashboard/add-money`)
- **Purpose:** Initiate an NGN deposit via bank transfer.
- **Primary Action:** Enter amount and click "Proceed to Payment".
- **Secondary Actions:** Select preset chips (₦10,000, ₦25,000, ₦50,000, ₦100,000).
- **Layout Hierarchy:** Centered card, preset chips, custom amount input with NGN prefix, fee breakdown card (Fee: ₦0.00, Total Payable: ₦X), "Proceed" button.
- **Required Components:** `AmountInput`, `PresetChipGroup`, `FeeSummaryRow`, `Button`.

### 5.2 Bank Transfer Instructions Screen (Virtual Account)
- **Purpose:** Present the user with a dedicated virtual bank account number to complete the bank transfer.
- **Primary Action:** Copy Account Number.
- **Secondary Actions:** "I have made this transfer", "Cancel".
- **Layout Hierarchy:** Bank Name, Account Number (large mono text with copy button), Beneficiary Name, Expiration countdown timer (30 mins), payment detection spinner.
- **States:**
  - *Awaiting Payment:* Animated pulsing indicator *"Listening for bank transfer..."*.
  - *Payment Detected:* Status updates to *"Payment detected! Crediting wallet..."*.
  - *Success Modal:* Confirmed checkmark with reference number and updated balance.
  - *Expired / Failed:* Timer reaches 0; account deactivated with "Generate New Account" button.
- **Accessibility:** Copy action triggers live region announcement *"Account number copied to clipboard"*.

---

## 6. Receive Crypto Screens

### 6.1 EVM Receive Screen (`/dashboard/receive`)
- **Purpose:** Display user's dedicated EVM deposit address and QR code for inbound crypto deposits.
- **Primary Action:** Copy deposit address or scan QR code.
- **Secondary Actions:** Select asset (USDT, ETH), switch network, view pending deposits.
- **Layout Hierarchy:**
  1. *Asset & Network Selector:* Ticker dropdown + explicit EVM network badge (e.g. Polygon PoS / Arbitrum).
  2. *Network Warning Alert (Amber Banner):* *"Send only [Asset] via [Network] to this address. Other assets will be lost permanently."*
  3. *QR Code Container:* High-contrast QR code centered with asset icon overlay.
  4. *Address Display Card:* Formatted address `0x...` with one-tap copy button and tooltip.
  5. *Pending Inbound Deposits Box:* Shows active deposits with block confirmation progress (e.g., `Confirmations: 24 / 64`).
- **Required Components:** `AssetSelect`, `NetworkBadge`, `WarningAlert`, `QrCodeDisplay`, `CopyButton`, `ConfirmationProgressBar`.
- **States:**
  - *Active:* QR and address rendered.
  - *Pending Deposit Detected:* Yellow notification bar shows incoming tx hash and confirmation count.
  - *Confirmed:* Green toast notification *"Deposit of 100 USDT confirmed!"*.
- **Accessibility:** QR code has explicit `alt="QR code for deposit address"` text; address copy button has descriptive `aria-label`.

---

## 7. Transfer & Withdrawal Screens

### 7.1 Transfer Hub (`/dashboard/transfer`)
- **Purpose:** Unified modal or page for off-chain internal transfers and on-chain external withdrawals.
- **Tabs:**
  - **Tab A: "Send to Platform User" (Internal Transfer)**
  - **Tab B: "External Crypto Wallet" (Withdrawal)**

### 7.2 Internal Transfer Flow
- **Fields:** Recipient Tag/Email, Asset selector, Amount input with "Use Max" button.
- **Interactive Validation:** Live debounced check resolves email to recipient name (e.g., *"Verified: Tunde Bakare"* with green check).
- **Confirmation Step:** Modal showing Recipient Name, Tag, Amount, Fee (`₦0.00 - Free`), and password confirmation input.
- **States:**
  - *Success:* Receipt modal with reference ID, recipient name, and timestamp.
  - *Insufficient Funds:* Red inline warning; amount input highlighted in red; submit button disabled.

### 7.3 External Withdrawal Flow
- **Fields:** Destination EVM Address, Network, Asset, Amount.
- **Validation:** Strict EIP-55 checksum validation; rejection of invalid or null addresses.
- **Fee Breakdown:** Shows gross amount, estimated network/provider gas fee, net amount sent.
- **Confirmation Modal:** Clear warning *"External blockchain transfers are irreversible"*, password/2FA input, "Authorize Withdrawal" button.
- **Execution States:**
  - *Initiated:* Funds moved to `Reserved`.
  - *Broadcasted:* Tx hash provided with clickable block explorer link.
  - *Confirmed / Failed:* Terminal status notification.

---

## 8. Crypto Swap Screens

### 8.1 Instant RFQ Swap (`/dashboard/swap`)
- **Purpose:** Execute instant conversion between supported asset pairs (NGN <-> USDT, USDT <-> ETH).
- **Primary Action:** Request quote and confirm swap.
- **Layout Hierarchy:**
  1. *"You Pay"* Card: Asset dropdown, balance indicator, numeric amount input.
  2. *Invert Assets Button:* Centered circular icon button with rotation animation.
  3. *"You Receive"* Card: Asset dropdown, estimated output amount.
  4. *Exchange Rate & Fee Row:* Live indicative rate (e.g. `1 USDT = ₦1,500.00`), platform spread (`0.5%`).
  5. *Quote Countdown Bar:* Active 30-second circular countdown timer once amount is entered.
  6. *Submit Button:* Dynamic label *"Confirm Swap (28s)"* -> flips to *"Quote Expired - Tap to Refresh"* at 0s.
- **Required Components:** `SwapCard`, `AssetInputRow`, `InvertButton`, `RateSummary`, `QuoteTimer`, `ConfirmSwapModal`.
- **States:**
  - *Draft:* User typing amounts; indicative estimates shown.
  - *Locked Quote:* 30s countdown ticking down; rate guaranteed.
  - *Pending Execution:* Spinner active *"Settling swap on ledger..."*.
  - *Success:* Conversion receipt modal showing debited and credited base units.
  - *Expired:* Red inline alert *"Quote expired due to market volatility. Tap to refresh rate."*.

---

## 9. Supporting & Account Screens

### 9.1 Transaction History & Statement (`/dashboard/history`)
- **Purpose:** Full historical ledger journal for the user with search and filtering.
- **Features:** Search by reference or counterparty, filter by Asset, Type (Deposit, Transfer, Swap, Withdrawal), and Status.
- **Components:** `FilterToolbar`, `TransactionTable`, `PaginationControls`, `ExportCsvButton`.

### 9.2 Transaction Detail Drawer / Modal
- **Purpose:** Comprehensive financial receipt for any past transaction.
- **Data Displayed:** Reference ID, Timestamp, Type, Status Badge, Asset Amount, Fiat Equivalent at execution time, Fee breakdown, Counterparty / External Tx Hash (with explorer link), and "Download PDF Receipt" action.

### 9.3 Profile & Security Center (`/dashboard/settings`)
- **Tabs:**
  - *Profile:* Name, email, phone number, KYC tier verification status.
  - *Security:* Change password, two-factor authentication (2FA) toggle, active sessions list with "Revoke All Other Sessions" button.
  - *Preferences:* Default currency toggle (NGN vs USD), notification settings.

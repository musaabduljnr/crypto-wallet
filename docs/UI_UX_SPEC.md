# UI/UX Specification & Design System Direction
## Nigeria-First Managed Crypto Wallet Web Application

**Document Version:** 1.0.0  
**Phase:** 01 — Product Requirements, Architecture & Technical Foundation  
**Status:** Approved for Technical Specification  
**Classification:** Confidential / Internal Architectural Specification  

---

## 1. Design Philosophy & Aesthetic Direction

The design language reflects the trust, restraint, and precision of a world-class financial institution while delivering the agility and clarity of top-tier consumer fintech applications (e.g., Stripe, Mercury, Moniepoint, Revolut).

### Core Aesthetic Pillars
1. **Restraint & Editorial Calm:** Avoid gaudy neon crypto gradients, memetic banners, or cluttered interfaces. Use crisp off-whites, deep charcoals, and subtle borders to build instant financial trust.
2. **Generous Whitespace & Information Hierarchy:** Every primary action has breathing room. Key metrics (Total Net Worth, Available Balance) are immediately scannable without sensory overload.
3. **Institutional Precision:** Consistent typographic scales, monospaced numbers for tabular financial amounts (`tabular-nums`), and explicit currency tickers.
4. **Zero Ambiguity in Financial States:** Financial states (Pending, Confirmed, Failed, Reserved) are communicated with distinct semantic palettes, clear human-readable explanations, and actionable next steps.
5. **No Emojis for Financial Symbols:** All UI glyphs use cleanly rendered vector icons from the **Lucide React** icon library.

---

## 2. Design System Tokens & Foundations

### 2.1 Color Palette (Tailwind HSL Token Schema)

```css
:root {
  /* Base Neutral Tokens (Sleek High-Trust Light Mode) */
  --background: 210 20% 98%;          /* Crisp Off-White #F8FAFC */
  --foreground: 222 47% 11%;          /* Deep Slate Charcoal #0F172A */
  --card: 0 0% 100%;                  /* Pure White Surface #FFFFFF */
  --card-foreground: 222 47% 11%;
  --popover: 0 0% 100%;
  --popover-foreground: 222 47% 11%;
  
  /* Primary Brand (Sleek Emerald / Deep Fintech Green) */
  --primary: 158 64% 20%;             /* Rich Forest Emerald #0D5A3E */
  --primary-foreground: 0 0% 100%;
  
  /* Secondary & Muted */
  --secondary: 210 40% 96.1%;
  --secondary-foreground: 222 47% 11%;
  --muted: 210 40% 96.1%;
  --muted-foreground: 215 16% 47%;    /* Neutral Muted Text #64748B */
  
  /* Accent & Interactive */
  --accent: 158 64% 95%;              /* Subtle Mint Accent */
  --accent-foreground: 158 64% 20%;
  
  /* Financial Semantic Status Tokens */
  --success: 142 71% 45%;             /* Verified Green #16A34A */
  --success-foreground: 0 0% 100%;
  --warning: 38 92% 50%;              /* Pending Amber #F59E0B */
  --warning-foreground: 0 0% 100%;
  --destructive: 0 84% 60%;          /* Error Crimson #EF4444 */
  --destructive-foreground: 0 0% 100%;
  
  /* Borders & Dividers */
  --border: 214 32% 91%;              /* Subtle Card Border #E2E8F0 */
  --input: 214 32% 91%;
  --ring: 158 64% 20%;
  
  --radius: 0.75rem;                  /* 12px Soft Modern Corners */
}

/* Dark Mode Tokens (Deep Space / Titanium Dark Theme) */
.dark {
  --background: 224 71% 4%;           /* Deepest Midnight #020617 */
  --foreground: 210 40% 98%;
  --card: 222 47% 7%;                 /* Surface Dark Slate #0B1120 */
  --card-foreground: 210 40% 98%;
  --primary: 158 64% 45%;             /* Vibrant Mint #22C55E */
  --primary-foreground: 224 71% 4%;
  --muted: 217 33% 17%;
  --muted-foreground: 215 20% 65%;
  --border: 217 33% 17%;
  --input: 217 33% 17%;
}
```

### 2.2 Typography Scale
- **Headings & Body Font:** Inter or Plus Jakarta Sans (via `next/font/google`).
- **Financial Balances & Cryptographic Hashes:** JetBrains Mono or Geist Mono (`font-mono font-medium tracking-tight tabular-nums`).
- **Hierarchy:**
  - `Hero Display`: 48px / 1.1 line-height (Desktop), 32px (Mobile).
  - `Section Title (h1)`: 28px / 1.25 line-height.
  - `Card Header (h2)`: 20px / 1.3 line-height.
  - `Body Standard`: 15px / 1.5 line-height.
  - `Caption / Helper`: 13px / 1.4 line-height.

### 2.3 Iconography Standards
All icons sourced exclusively from **Lucide React**. Standard sizing:
- Micro actions / inputs: `16px` (`w-4 h-4`).
- List items / navigation: `20px` (`w-5 h-5`).
- Empty states / modal headers: `32px` or `40px` (`w-8 h-8` or `w-10 h-10`).

---

## 3. Screen Specifications & Layout Breakdown

### 3.1 Public Marketing Homepage (`/`)
- **Header:** Sticky translucent blur navbar (`backdrop-blur-md bg-background/80 border-b border-border`). Brand logo, value prop anchor links ("Features", "Security", "Fees", "FAQ"), Theme toggle, "Sign In" button, and "Create Account" primary button.
- **Hero Section:** High-impact typography: *"The Smartest Bridge Between Naira & Digital Dollars"*. Dynamic live rates ticker (NGN/USDT rate, ETH network status). Interactive preview card showing instant transfer simulation.
- **Value Proposition Grid:**
  - *Instant NGN Top-up:* Fund via local bank transfer in seconds.
  - *Zero-Fee Internal Transfers:* Send funds to any registered user instantly.
  - *Managed EVM Custody:* No seed phrase anxiety, institutional security.
  - *Institutional Compliance:* Built with bank-grade ledger integrity.
- **Trust & Security Banner:** Visual display of double-entry auditing, encryption standards, and custodial architecture.
- **FAQ Accordion:** Clear answers to common user questions regarding custody, withdrawal limits, and network fees.
- **Footer:** Legal disclaimers, risk warning, terms of service, contact support.

---

### 3.2 Authentication Flows (`/auth/*`)
- **Layout:** Centered card with split-screen branding on desktop (left: marketing testimonial and security proof; right: authentication form).
- **Registration (`/auth/register`):**
  - Inputs: First Name, Last Name, Email, Phone Number (+234 format), Password, Confirm Password.
  - Interactive password strength meter (Green/Amber/Red criteria).
  - Legal consent checkbox (Terms of Service, Privacy Policy).
- **Email Verification (`/auth/verify-email`):**
  - Clean verification pending state with 6-digit OTP code entry or resend magic link.
- **Login (`/auth/login`):**
  - Inputs: Email and Password. "Remember me" checkbox, "Forgot password?" link.
- **Password Recovery (`/auth/reset-password`):**
  - Clean one-click reset instructions sent to verified email with throttling cooldown.

---

### 3.3 Dashboard Overview (`/dashboard`)
- **Navigation:**
  - Desktop: Persistent left-hand sidebar with logo, navigation links (Dashboard, Add Money, Receive, Transfer, Swap, History, Settings), user profile badge, and logout action.
  - Mobile: Top header with user avatar + sticky bottom navigation bar (Home, Transfer, Swap, History, Profile).
- **Net Worth Hero Card:**
  - Total Balance in NGN: `₦1,425,850.00` (large 36px font, with eye icon to toggle visibility: `••••••••`).
  - Secondary USD conversion equivalent: `~$950.56 USD`.
  - Quick action buttons (Add Money, Receive, Transfer, Swap) with distinct Lucide icons.
- **Asset Balances Table / List:**
  - Row for each asset: NGN, USDT, ETH.
  - Details: Asset Icon, Name, Ticker, Available Balance, Reserved Balance, NGN Fiat Value, 24h Trend indicator.
  - Actions: Three-dot dropdown menu for quick actions (Send, Receive, Swap).
- **Recent Transactions Section:**
  - 5 most recent activities with status badge (Confirmed, Pending, Failed), icon representing direction (ArrowDownLeft for Receive, ArrowUpRight for Send, RefreshCw for Swap), and timestamp.
  - "View All" link directing to full history.

---

### 3.4 Add Money (NGN Fiat Funding) (`/dashboard/add-money`)
- **Step 1: Amount Selection:**
  - Preset quick-pick chips: `₦10,000`, `₦25,000`, `₦50,000`, `₦100,000`, or custom input.
  - Real-time calculation showing: Expected credit amount, processing fee (`₦0.00 - Free`), total payable.
- **Step 2: Bank Transfer Instruction Screen:**
  - High-prominence Virtual Bank Account Card:
    - Bank Name: e.g. *Wema Bank / Moniepoint MFB*
    - Account Number: `9876543210` (with prominent "Copy" button).
    - Beneficiary Name: *Wallet / [User Name]*
    - Dynamic Countdown: "Account expires in 29:45 mins".
  - Clear instruction: *"Transfer exactly the selected amount from any Nigerian bank app. Your wallet will credit automatically upon receipt."*
  - Live polling indicator: "Waiting for payment... (listening for bank confirmation)".

---

### 3.5 Receive Crypto (`/dashboard/receive`)
- **Asset & Network Selector:**
  - Dropdown to select asset (e.g. USDT).
  - Explicit Network Badge: e.g. **Polygon PoS** or **Arbitrum One**.
- **Security Warning Banner (Amber Alert):**
  - *"Only send USDT on the [Selected EVM Network] network to this address. Sending via any other network (e.g., TRC-20, Solana) will result in irreversible loss of funds."*
- **Deposit Address Box:**
  - Centered high-contrast QR code.
  - Formatted EVM address: `0x71C...3a9` with full address copy button and tooltip feedback ("Address copied to clipboard").
- **Pending Deposits Tracker:**
  - List of detected unconfirmed deposits with confirmation progress bar (e.g., `Confirmations: 18 / 64`).

---

### 3.6 Transfer Funds (`/dashboard/transfer`)
- **Tabbed Interface:**
  - Tab 1: **"Send to User"** (Internal Off-chain Transfer).
  - Tab 2: **"External Wallet"** (On-chain EVM Withdrawal).
- **Sub-flow: Send to User:**
  - Recipient Identifier: Email or Username.
  - Live debounced verification: Once typed, displays verified user name ("Recipient: Tunde Bakare") with checkmark.
  - Amount input with "Max" button and real-time available balance check.
  - Instant zero-fee breakdown.
- **Sub-flow: External Wallet:**
  - Recipient EVM Address input with checksum validation and address book lookup.
  - Network Fee estimation widget (e.g. `Network fee: ~$0.08 / ₦120`).
  - Total deducted: Amount + Network Fee.
- **Confirmation Modal:**
  - Requires user password or 2FA OTP confirmation before dispatching funds.

---

### 3.7 Crypto Swap (`/dashboard/swap`)
- **Interactive Conversion Card:**
  - "You Pay" input box with asset selector (e.g. NGN) and current available balance.
  - Invert button (Swaps Pay/Receive assets with subtle rotation animation).
  - "You Receive" estimated output box with asset selector (e.g. USDT).
- **Quote Lock Screen (RFQ):**
  - Once amount is entered, a firm quote locks in with a **30-second circular countdown timer**.
  - Rate guarantee: `1 USDT = ₦1,500.00`.
  - Platform Fee: `0.5% (₦750.00)`.
  - Guaranteed Output: `99.50 USDT`.
  - Primary button: "Confirm Swap (28s)".
  - When timer reaches 0, button changes to "Quote Expired - Refresh Rate".

---

### 3.8 Transaction History & Detail Modal (`/dashboard/history`)
- **Filtering & Search Bar:**
  - Search by transaction ID, counterparty, or hash.
  - Dropdown filter by Type (All, Deposits, Transfers, Swaps, Withdrawals).
  - Dropdown filter by Asset (All, NGN, USDT, ETH).
  - Date Range picker.
- **Transaction Table:**
  - Columns: Date & Time, Type, Description/Counterparty, Asset Amount, Fiat Equivalent, Status.
  - Status Badges:
    - `Confirmed` (Green fill, check icon).
    - `Pending` (Amber fill, pulsing clock icon).
    - `Failed` (Red fill, alert icon).
- **Detail Drawer / Modal:**
  - Full financial breakdown: Reference ID, External Tx Hash (clickable link to EVM explorer), Timestamp, Fees paid, Source and Destination Accounts, and "Download Receipt" action.

---

### 3.9 User Profile & Security Settings (`/dashboard/settings`)
- **Profile Tab:** Personal details, phone verification status, KYC tier badge (Tier 1 Verified).
- **Security Tab:**
  - Change password form.
  - Two-factor authentication (2FA) setup toggle.
  - Active sessions list (Device, Browser, IP address, Last active time) with "Log out of all other sessions" action.
- **Preferences Tab:** Default currency display (NGN or USD), notification toggles (Email alerts for deposits/withdrawals).

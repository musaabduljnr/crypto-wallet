# Reusable Component Guide & API Reference
## Complete Component Catalog, Props, Accessibility & Usage Patterns

**Document Version:** 1.0.0  
**Phase:** 02 — Design System & UI/UX Foundation  
**Status:** Canonical Component Specification  
**Classification:** Internal Architectural & Engineering Standard  

---

## 1. Architectural Guidelines for UI Components

1. **Presentation Purity:** Components in `src/components/` are pure presentational units or client interaction handlers. They contain **zero** financial side-effects, zero direct ledger mutations, and zero hard-coded business rules.
2. **Accessible by Default:** All interactive elements support standard keyboard navigation (`Tab`, `Enter`, `Space`, `Escape`), maintain visible focus rings (`focus-visible:ring-2 focus-visible:ring-primary`), and declare proper ARIA roles and live regions.
3. **Compound & Composable:** Complex financial widgets (e.g. `PortfolioSummaryPanel`, `SwapCard`) are composed of smaller atomic primitives (`Card`, `AmountInput`, `AssetSelect`, `TransactionStatusBadge`).
4. **Strict Typing:** All components export explicit TypeScript interfaces for their props.

---

## 2. Component Catalog & API Reference

### 2.1 Foundations

#### `Container` (`src/components/ui/container.tsx`)
Responsive layout container constraining maximum content width.
- **Props:**
  - `size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'` (default: `'xl'`)
  - `className?: string`
  - `children: React.ReactNode`
- **Usage:**
  ```tsx
  <Container size="lg">
    <PageHeader title="Wallet Dashboard" />
  </Container>
  ```

#### `Heading` & `Text` (`src/components/ui/typography.tsx`)
Standardized semantic typography primitives ensuring consistent typographic scale.
- **Props (Heading):**
  - `as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'` (default: `'h2'`)
  - `variant?: 'hero' | 'title' | 'subtitle' | 'section'`
  - `children: React.ReactNode`
- **Props (Text):**
  - `variant?: 'body' | 'caption' | 'muted' | 'mono'`
  - `children: React.ReactNode`

---

### 2.2 Controls & Form Primitives

#### `Button` (`src/components/ui/button.tsx`)
Base interactive control with loading spinners, variants, and accessible keyboard states.
- **Variants:**
  - `primary`: Forest Emerald fill (`bg-primary text-primary-foreground`)
  - `secondary`: Neutral Slate fill (`bg-secondary text-secondary-foreground`)
  - `outline`: Subtle border container (`border border-border bg-card`)
  - `destructive`: Red danger fill (`bg-destructive text-destructive-foreground`)
  - `ghost`: Transparent hover highlight
- **Sizes:** `sm` (36px), `md` (44px, default), `lg` (48px), `icon` (44x44px).
- **Props:** `variant`, `size`, `isLoading?: boolean`, `leftIcon?: React.ReactNode`, `rightIcon?: React.ReactNode`, standard HTML button props.
- **Usage:**
  ```tsx
  <Button variant="primary" isLoading={isSubmitting} leftIcon={<Send className="w-4 h-4" />}>
    Confirm Transfer
  </Button>
  ```

#### `Input` (`src/components/ui/input.tsx`)
Accessible single-line text input with label, helper text, and validation states.
- **Props:**
  - `label?: string`
  - `error?: string`
  - `helperText?: string`
  - `leftAddon?: React.ReactNode`
  - `rightAddon?: React.ReactNode`
  - Standard HTML input props.

#### `AmountInput` (`src/components/ui/amount-input.tsx`)
Specialized financial numeric input enforcing decimal precision, currency prefixes, and quick "Use Max" actions.
- **Props:**
  - `value: string`
  - `onChange: (value: string) => void`
  - `assetTicker: string` (e.g., `'NGN'`, `'USDT'`, `'ETH'`)
  - `maxBalance?: string`
  - `onMaxClick?: () => void`
  - `decimals?: number` (default: 2 for NGN, 6 for USDT, 18 for ETH)
  - `error?: string`
- **Usage:**
  ```tsx
  <AmountInput
    value={amount}
    onChange={setAmount}
    assetTicker="USDT"
    maxBalance="1,450.00"
    onMaxClick={() => setAmount("1450.00")}
  />
  ```

---

### 2.3 Financial Display Components

#### `BalanceDisplay` (`src/components/wallet/balance-display.tsx`)
High-prominence monetary amount display with currency symbol, integer/decimal split, and privacy masking toggle.
- **Props:**
  - `amount: string | number`
  - `currency: 'NGN' | 'USD' | 'USDT' | 'ETH'`
  - `isMasked?: boolean`
  - `size?: 'sm' | 'md' | 'lg' | 'hero'`
  - `showToggle?: boolean`
  - `onToggleMask?: () => void`
- **Visual Example:**
  `₦ 1,425,850.00` or `••••••••`

#### `TransactionStatusBadge` (`src/components/wallet/transaction-status-badge.tsx`)
Deterministic status pill with semantic icon, color palette, and optional pulsing indicator.
- **Statuses:**
  - `DRAFT`: Neutral Slate (`bg-slate-100 text-slate-700`)
  - `PENDING`: Amber (`bg-amber-100 text-amber-800 animate-pulse`)
  - `PROCESSING`: Sky Blue (`bg-sky-100 text-sky-800 animate-pulse`)
  - `COMPLETED`: Forest Emerald (`bg-emerald-100 text-emerald-800`)
  - `FAILED`: Crimson (`bg-red-100 text-red-800`)
  - `CANCELLED`: Zinc (`bg-zinc-100 text-zinc-700`)
  - `EXPIRED`: Orange (`bg-orange-100 text-orange-800`)
  - `RECONCILIATION_REQUIRED`: Purple (`bg-purple-100 text-purple-800`)

#### `CryptoAddressCard` (`src/components/wallet/crypto-address-card.tsx`)
Container displaying EVM address, one-click clipboard copy, and formatted truncated address with tooltip.
- **Props:**
  - `address: string`
  - `network: string`
  - `asset: string`
  - `qrCodeUrl?: string`

---

### 2.4 Feedback & State Components

#### `LoadingSkeleton` (`src/components/feedback/loading-skeleton.tsx`)
Pulsing placeholder matching card, table row, and balance shapes to prevent Cumulative Layout Shift (CLS).
- **Variants:** `'text' | 'avatar' | 'card' | 'table-row' | 'balance'`

#### `EmptyState` (`src/components/feedback/empty-state.tsx`)
Friendly, un-intimidating placeholder when no data exists (e.g. empty transaction history).
- **Props:** `icon: LucideIcon`, `title: string`, `description: string`, `action?: { label: string; onClick: () => void }`

#### `InlineNotice` (`src/components/feedback/inline-notice.tsx`)
Contextual message banner for security warnings, network mismatches, and fee announcements.
- **Variants:** `'info' | 'warning' | 'success' | 'destructive'`

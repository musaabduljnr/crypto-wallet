# Design System & Token Specification
## Nigeria-First Managed Crypto Wallet — Visual & Interaction Foundation

**Document Version:** 1.0.0  
**Phase:** 02 — Design System & UI/UX Foundation  
**Status:** Canonical Design System Specification  
**Classification:** Internal Architectural & Engineering Standard  

---

## 1. Visual Identity & Design Principles

The design language of the Crypto Wallet MVP is engineered to inspire **institutional confidence, financial clarity, and effortless control**. It rejects the high-volatility, casino-like aesthetics of speculative meme-trading platforms in favor of a clean, editorial, high-trust fintech aesthetic akin to Mercury, Stripe, Moniepoint, and Revolut.

### Core Tenets
1. **Financial Sobriety:** Restrained palettes, subtle structural borders, and purposeful whitespace over heavy gradients or distracting visual noise.
2. **Numeric Precision:** Monospaced tabular numerals (`tabular-nums`) for all monetary values, balances, and exchange rates to ensure alignment and prevent jitter during updates.
3. **Deterministic Financial States:** Strict semantic color mapping for transaction statuses: `Draft` (Slate), `Pending` (Amber), `Processing` (Sky), `Completed` (Emerald), `Failed` (Crimson), `Cancelled` (Zinc), `Expired` (Orange), and `Reconciliation Required` (Violet).
4. **Accessible by Construction:** High-contrast text exceeding WCAG 2.1 AA ratios (minimum 4.5:1), prominent keyboard focus rings (`ring-2 ring-primary ring-offset-2`), and minimum touch target sizes of 44x44px.
5. **No Decorative Emojis:** Glyphs and indicators strictly use scalable vector icons from **Lucide React**.

---

## 2. Design Tokens Architecture (CSS Variables & Tailwind)

The token architecture uses semantic CSS variables defined in HSL format (`H S% L%`), enabling seamless theme switching between Light and Dark modes while preventing hardcoded hex codes in UI components.

### 2.1 Color Tokens Schema

```css
:root {
  /* Surface & Canvas Tokens */
  --background: 210 20% 98%;          /* #F8FAFC Canvas Off-white */
  --foreground: 222 47% 11%;          /* #0F172A Deep Slate Body Text */
  --card: 0 0% 100%;                  /* #FFFFFF Card & Surface Fill */
  --card-foreground: 222 47% 11%;     /* #0F172A */
  --popover: 0 0% 100%;               /* #FFFFFF Dropdowns & Flyouts */
  --popover-foreground: 222 47% 11%;

  /* Brand Primary: Deep Nigerian Forest Emerald */
  --primary: 158 64% 20%;             /* #0D5A3E High-Trust Forest Green */
  --primary-foreground: 0 0% 100%;    /* #FFFFFF Contrast Text */

  /* Secondary & Neutral Utility */
  --secondary: 210 40% 96.1%;         /* #F1F5F9 Soft Neutral Fill */
  --secondary-foreground: 222 47% 11%;
  --muted: 210 40% 96.1%;             /* #F1F5F9 Subdued Background */
  --muted-foreground: 215 16% 47%;    /* #64748B Secondary Text (4.5:1 contrast) */
  --accent: 158 64% 95%;              /* #E6F5EE Subtle Mint Highlight */
  --accent-foreground: 158 64% 20%;   /* #0D5A3E */

  /* Semantic Financial Status Tokens */
  --success: 142 71% 45%;             /* #16A34A Verified / Completed */
  --success-foreground: 0 0% 100%;
  --warning: 38 92% 50%;              /* #F59E0B Pending Action */
  --warning-foreground: 0 0% 100%;
  --destructive: 0 84% 60%;          /* #EF4444 Error / Failed / Destructive */
  --destructive-foreground: 0 0% 100%;
  --info: 217 91% 60%;               /* #3B82F6 In-Flight / Processing */
  --info-foreground: 0 0% 100%;

  /* Borders, Separators & Focus Rings */
  --border: 214 32% 91%;              /* #E2E8F0 Subtle Container Borders */
  --input: 214 32% 91%;               /* #E2E8F0 Form Input Boundaries */
  --ring: 158 64% 20%;                /* #0D5A3E Accessible Focus Halo */

  /* Radii & Elevation */
  --radius: 0.75rem;                  /* 12px Standard Corner Radius */
}

/* Dark Theme Tokens: Titanium & Deep Space */
.dark {
  --background: 224 71% 4%;           /* #020617 Deep Obsidian Void */
  --foreground: 210 40% 98%;          /* #F8FAFC Primary Light Text */
  --card: 222 47% 7%;                 /* #0B1120 Elevated Dark Slate */
  --card-foreground: 210 40% 98%;
  --popover: 222 47% 7%;
  --popover-foreground: 210 40% 98%;
  
  --primary: 158 64% 45%;             /* #22C55E Radiant Mint */
  --primary-foreground: 224 71% 4%;   /* #020617 */

  --secondary: 217 33% 15%;
  --secondary-foreground: 210 40% 98%;
  --muted: 217 33% 15%;
  --muted-foreground: 215 20% 65%;
  --accent: 158 64% 12%;
  --accent-foreground: 158 64% 45%;

  --success: 142 71% 45%;
  --warning: 38 92% 50%;
  --destructive: 0 84% 60%;
  --info: 217 91% 60%;

  --border: 217 33% 17%;              /* #1E293B */
  --input: 217 33% 17%;
  --ring: 158 64% 45%;
}
```

---

## 3. Typography Scale & Hierarchy

| Role | Font Family | Size (Desktop / Mobile) | Weight | Line Height | Tracking | Tailwind Class |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Hero Display** | Sans (`Inter`) | 44px / 32px | Bold (700) | 1.15 | `-0.025em` | `text-3xl md:text-5xl font-bold tracking-tight` |
| **Page Title (H1)** | Sans (`Inter`) | 28px / 24px | SemiBold (600)| 1.25 | `-0.02em` | `text-2xl md:text-3xl font-semibold tracking-tight` |
| **Card Header (H2)**| Sans (`Inter`) | 20px / 18px | SemiBold (600)| 1.30 | `-0.01em` | `text-lg md:text-xl font-semibold` |
| **Section Label (H3)**| Sans (`Inter`) | 16px / 15px | Medium (500) | 1.40 | Normal | `text-base font-medium` |
| **Body Standard** | Sans (`Inter`) | 15px / 14px | Normal (400) | 1.50 | Normal | `text-sm md:text-base text-foreground` |
| **Muted Caption** | Sans (`Inter`) | 13px / 12px | Normal (400) | 1.40 | Normal | `text-xs md:text-sm text-muted-foreground` |
| **Financial Balance (Hero)** | Mono (`JetBrains Mono`) | 36px / 28px | Bold (700) | 1.20 | `-0.02em` | `font-mono text-2xl md:text-4xl font-bold tabular-nums` |
| **Financial Amount (Row)** | Mono (`JetBrains Mono`) | 16px / 15px | SemiBold (600)| 1.30 | Normal | `font-mono text-base font-semibold tabular-nums` |
| **Crypto Address / Hash** | Mono (`JetBrains Mono`) | 13px / 12px | Regular (400) | 1.40 | Normal | `font-mono text-xs md:text-sm break-all` |

---

## 4. Spacing Scale, Layout Widths & Breakpoints

### 4.1 Spacing Scale (4px Base Grid)
- `space-1`: 4px (`p-1`, `gap-1`) — Micro badges, inline tags.
- `space-2`: 8px (`p-2`, `gap-2`) — Icon buttons, dense rows.
- `space-3`: 12px (`p-3`, `gap-3`) — Input internal padding, list item gaps.
- `space-4`: 16px (`p-4`, `gap-4`) — Standard container padding, form field gaps.
- `space-6`: 24px (`p-6`, `gap-6`) — Card padding, modal internal spacing.
- `space-8`: 32px (`p-8`, `gap-8`) — Section breaks on mobile.
- `space-12`: 48px (`p-12`, `gap-12`) — Section breaks on desktop.

### 4.2 Standard Layout Containers
- **Max Content Width (Dashboard):** `1200px` (`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`).
- **Modal / Card Width (Forms):** `480px` (`max-w-md w-full`).
- **Responsive Viewport Targets:**
  - `Mobile Small`: 360px - 375px (iPhone SE / entry Android).
  - `Mobile Large`: 390px - 430px (iPhone Pro Max, Samsung Galaxy).
  - `Tablet`: 768px (iPad portrait).
  - `Desktop`: 1024px - 1280px (MacBook / Laptop).
  - `Wide`: 1440px+ (External Monitors).

---

## 5. Component Style Standards & API Conventions

### 5.1 Buttons (`Button.tsx`)
- **Primary:** `bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.99] font-medium shadow-sm transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2`.
- **Secondary:** `bg-secondary text-secondary-foreground hover:bg-secondary/80 font-medium`.
- **Outline:** `border border-border bg-card hover:bg-muted text-foreground font-medium`.
- **Destructive:** `bg-destructive text-destructive-foreground hover:bg-destructive/90 font-medium`.
- **Ghost:** `hover:bg-muted hover:text-foreground`.
- **Heights:** Default: 44px (`h-11 px-4`); Small: 36px (`h-9 px-3`); Large: 48px (`h-12 px-6`).

### 5.2 Form Inputs (`Input.tsx`, `AmountInput.tsx`)
- Standard 44px touch height (`h-11`).
- Border: `border border-input bg-card px-3 py-2 text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded-md`.
- Error state: `border-destructive focus-visible:ring-destructive`.
- Disabled state: `opacity-50 cursor-not-allowed bg-muted/50`.

### 5.3 Financial Badges (`TransactionStatusBadge.tsx`)
```typescript
type FinancialStatus = 
  | 'DRAFT' 
  | 'PENDING' 
  | 'PROCESSING' 
  | 'COMPLETED' 
  | 'FAILED' 
  | 'CANCELLED' 
  | 'EXPIRED' 
  | 'RECONCILIATION_REQUIRED';
```
- **Completed:** Emerald badge (`bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800`).
- **Pending / Processing:** Amber/Sky badge with subtle animated pulse.
- **Failed / Cancelled:** Red/Zinc badge with alert icon.
- **Expired:** Orange badge with clock icon.

---

## 6. Motion & Transition Conventions
- Default Transition Duration: `150ms` (`duration-150 ease-in-out`).
- Hover Lift: `hover:-translate-y-0.5 transition-transform duration-150`.
- Accordion & Modal Transitions: Native CSS keyframes (`animate-in fade-in-0 zoom-in-95 duration-200`).
- **Reduced Motion Support:** All animations automatically disabled when `prefers-reduced-motion: reduce` is detected via `@media (prefers-reduced-motion)`.

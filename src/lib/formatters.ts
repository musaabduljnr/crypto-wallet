/**
 * Centralized Financial & Regional Formatting Engine
 * Provides deterministic, non-floating-point currency and crypto formatting,
 * locale-aware date/time presentation, and exchange rate displays.
 */

import { DEFAULT_LOCALE, DEFAULT_FIAT_CURRENCY } from "./config/regions";

export interface CurrencyFormatOptions {
  locale?: string;
  displaySymbol?: boolean;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}

export const ASSET_PRECISION: Record<string, number> = {
  USD: 2,
  NGN: 2,
  GBP: 2,
  EUR: 2,
  USDT: 2,
  USDC: 2,
  BTC: 8,
  ETH: 6,
  SOL: 4,
};

export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  NGN: "₦",
  GBP: "£",
  EUR: "€",
  USDT: "₮",
  USDC: "USDC ",
  ETH: "Ξ",
  BTC: "₿",
  SOL: "◎",
};

/**
 * Formats fiat or token amounts into currency strings.
 * Defaults to USD and en-US.
 * Separates transaction denomination from display currency.
 */
export function formatCurrency(
  amount: string | number,
  currency: string = DEFAULT_FIAT_CURRENCY,
  locale: string = DEFAULT_LOCALE,
  options?: CurrencyFormatOptions
): string {
  const str = String(amount).trim();
  if (!str || isNaN(Number(str))) return "0.00";

  const upperCurrency = (currency || DEFAULT_FIAT_CURRENCY).toUpperCase();
  const decimals =
    options?.maximumFractionDigits ??
    ASSET_PRECISION[upperCurrency] ??
    2;

  const parts = str.split(".");
  const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  let decPart = parts[1] || "";
  if (decPart.length > decimals) {
    decPart = decPart.slice(0, decimals);
  } else {
    decPart = decPart.padEnd(decimals, "0");
  }

  const showSymbol = options?.displaySymbol ?? true;
  const symbol = showSymbol ? (CURRENCY_SYMBOLS[upperCurrency] || `${upperCurrency} `) : "";

  return `${symbol}${intPart}.${decPart}`;
}

/**
 * Formats a crypto balance with authentic ticker precision.
 * Example: 0.450000 ETH, 1250.50 USDT, 0.05120000 BTC
 */
export function formatCrypto(
  amount: string | number,
  ticker: string
): string {
  const upperTicker = ticker.toUpperCase();
  const decimals = ASSET_PRECISION[upperTicker] ?? 4;
  const str = String(amount).trim();
  if (!str || isNaN(Number(str))) return `0.${"0".repeat(decimals)} ${upperTicker}`;

  const parts = str.split(".");
  const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  let decPart = parts[1] || "";
  if (decPart.length > decimals) {
    decPart = decPart.slice(0, decimals);
  } else {
    decPart = decPart.padEnd(decimals, "0");
  }

  return `${intPart}.${decPart} ${upperTicker}`;
}

/**
 * Formats an exchange rate with clear source and target representation.
 * Example: "1 USD ≈ ₦1,450.00" or "1 ETH ≈ $2,640.50"
 */
export function formatExchangeRate(
  rate: number | string,
  baseCurrency = "USD",
  quoteCurrency = "NGN",
  locale = DEFAULT_LOCALE
): string {
  const numRate = typeof rate === "string" ? parseFloat(rate) : rate;
  if (!numRate || isNaN(numRate)) return "Rate Unavailable";

  const formattedQuote = formatCurrency(numRate, quoteCurrency, locale);
  return `1 ${baseCurrency.toUpperCase()} ≈ ${formattedQuote}`;
}

/**
 * Formats a Date object or ISO timestamp according to US/Regional conventions.
 */
export function formatDate(
  dateInput: string | Date | number,
  locale = DEFAULT_LOCALE,
  options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
  }
): string {
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return "Invalid Date";
    return new Intl.DateTimeFormat(locale, options).format(d);
  } catch {
    return String(dateInput);
  }
}

/**
 * Formats date and time into user-friendly standard format.
 * Example: "Oct 16, 2026, 4:30 PM"
 */
export function formatDateTime(
  dateInput: string | Date | number,
  locale = DEFAULT_LOCALE,
  timeZone?: string
): string {
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return "Invalid Date";
    return new Intl.DateTimeFormat(locale, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: timeZone || undefined,
    }).format(d);
  } catch {
    return String(dateInput);
  }
}

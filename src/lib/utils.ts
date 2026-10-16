import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines conditional class names with Tailwind CSS class resolution.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Formats a numeric string or number into currency formatted string.
 * Uses integer/fixed point string splitting to avoid floating point inaccuracies.
 */
export function formatCurrency(
  amount: string | number,
  currency: 'USD' | 'NGN' | 'GBP' | 'EUR' | 'USDT' | 'ETH' = 'USD'
): string {
  const str = String(amount).trim();
  if (!str || isNaN(Number(str))) return '0.00';

  const parts = str.split('.');
  const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  
  let decimals = 2;
  if (currency === 'ETH') decimals = 6;
  if (currency === 'USDT') decimals = 2;

  let decPart = parts[1] || '';
  if (decPart.length > decimals) {
    decPart = decPart.slice(0, decimals);
  } else {
    decPart = decPart.padEnd(decimals, '0');
  }

  const symbolMap: Record<string, string> = {
    NGN: '₦',
    USD: '$',
    USDT: '₮',
    ETH: 'Ξ',
  };

  const symbol = symbolMap[currency] || '';
  return `${symbol}${intPart}.${decPart}`;
}

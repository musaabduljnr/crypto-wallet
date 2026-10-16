/**
 * Centralized Regional & Localization Configuration
 * Defines supported countries, regional payment capabilities, default locales, and currencies.
 */

export interface RegionCapability {
  code: string;
  name: string;
  dialCode: string;
  defaultCurrency: string;
  defaultLocale: string;
  supportedCurrencies: string[];
  fiatOnRampStatus: "LIVE" | "SANDBOX_ONLY" | "PENDING_PARTNER";
  fiatOnRampProvider?: string;
  fiatPaymentMethods: string[];
  cryptoDepositSupported: boolean;
  cryptoWithdrawalSupported: boolean;
  internalTransfersSupported: boolean;
  swapsSupported: boolean;
  phoneFormatHelp: string;
  phonePlaceholder: string;
  phoneRegex: RegExp;
  stateOrRegionLabel: string;
  sampleState: string;
  disclosures: string;
}

export const REGIONS: Record<string, RegionCapability> = {
  US: {
    code: "US",
    name: "United States",
    dialCode: "+1",
    defaultCurrency: "USD",
    defaultLocale: "en-US",
    supportedCurrencies: ["USD", "USDT", "USDC", "BTC", "ETH", "SOL"],
    fiatOnRampStatus: "PENDING_PARTNER",
    fiatOnRampProvider: undefined, // E.g., Plaid/ZeroHash/Stripe in roadmap
    fiatPaymentMethods: ["ACH Transfer (Roadmap)", "Wire Transfer (Roadmap)", "Debit Card (Roadmap)"],
    cryptoDepositSupported: true,
    cryptoWithdrawalSupported: true,
    internalTransfersSupported: true,
    swapsSupported: true,
    phoneFormatHelp: "US phone format: 10 digits e.g. (555) 234-5678 or +15552345678",
    phonePlaceholder: "(555) 234-5678",
    phoneRegex: /^(\+1)?[2-9]\d{2}[2-9]\d{6}$/,
    stateOrRegionLabel: "State of Residence",
    sampleState: "California",
    disclosures: "Custodial crypto services provided by institutional MPC partners. Digital assets are not FDIC insured and are subject to market volatility. Available in eligible US jurisdictions.",
  },
  NG: {
    code: "NG",
    name: "Nigeria",
    dialCode: "+234",
    defaultCurrency: "NGN",
    defaultLocale: "en-NG",
    supportedCurrencies: ["NGN", "USDT", "USDC", "BTC", "ETH", "SOL"],
    fiatOnRampStatus: "SANDBOX_ONLY", // Korapay sandbox configured; commercial ARIP pending
    fiatOnRampProvider: "KORAPAY",
    fiatPaymentMethods: ["Dedicated Virtual Bank Account Transfer"],
    cryptoDepositSupported: true,
    cryptoWithdrawalSupported: true,
    internalTransfersSupported: true,
    swapsSupported: true,
    phoneFormatHelp: "Nigerian phone format: e.g. 08012345678 or +2348012345678",
    phonePlaceholder: "08012345678",
    phoneRegex: /^(\+234|0)[789][01]\d{8}$/,
    stateOrRegionLabel: "State of Residence",
    sampleState: "Lagos State",
    disclosures: "Custodial wallets provided through institutional partners and do not constitute NDIC deposit insurance. Subject to compliance with Nigerian SEC & CBN regulations.",
  },
  GB: {
    code: "GB",
    name: "United Kingdom",
    dialCode: "+44",
    defaultCurrency: "GBP",
    defaultLocale: "en-GB",
    supportedCurrencies: ["USD", "USDT", "USDC", "BTC", "ETH", "SOL"],
    fiatOnRampStatus: "PENDING_PARTNER",
    fiatPaymentMethods: ["Faster Payments (Roadmap)"],
    cryptoDepositSupported: true,
    cryptoWithdrawalSupported: true,
    internalTransfersSupported: true,
    swapsSupported: true,
    phoneFormatHelp: "UK phone format: e.g. +447123456789",
    phonePlaceholder: "07123 456789",
    phoneRegex: /^(\+44|0)7\d{9}$/,
    stateOrRegionLabel: "County / Region",
    sampleState: "Greater London",
    disclosures: "Digital assets are unregulated in the UK for consumer protection. Crypto asset values can fluctuate significantly.",
  },
  GLOBAL: {
    code: "GLOBAL",
    name: "International / Other",
    dialCode: "+",
    defaultCurrency: "USD",
    defaultLocale: "en-US",
    supportedCurrencies: ["USD", "USDT", "USDC", "BTC", "ETH", "SOL"],
    fiatOnRampStatus: "PENDING_PARTNER",
    fiatPaymentMethods: ["International Wire (Roadmap)"],
    cryptoDepositSupported: true,
    cryptoWithdrawalSupported: true,
    internalTransfersSupported: true,
    swapsSupported: true,
    phoneFormatHelp: "International E.164 format: e.g. +14155552671",
    phonePlaceholder: "+1 555 234 5678",
    phoneRegex: /^\+[1-9]\d{7,14}$/,
    stateOrRegionLabel: "Province / State / Region",
    sampleState: "International",
    disclosures: "Cryptocurrency custody and services are subject to jurisdictional availability and AML/sanctions screening.",
  },
};

export const DEFAULT_REGION_CODE = "US";
export const DEFAULT_LOCALE = "en-US";
export const DEFAULT_FIAT_CURRENCY = "USD";

export function getRegionConfig(countryCode?: string): RegionCapability {
  if (!countryCode) return REGIONS[DEFAULT_REGION_CODE];
  const upper = countryCode.toUpperCase();
  return REGIONS[upper] || REGIONS.GLOBAL;
}

/**
 * Validates international phone numbers based on country code or fallback E.164.
 */
export function validatePhoneNumber(phone: string, countryCode?: string): boolean {
  const cleaned = phone.replace(/[\s()-]/g, "");
  if (!cleaned) return false;

  // If country specific
  if (countryCode && REGIONS[countryCode.toUpperCase()]) {
    const region = REGIONS[countryCode.toUpperCase()];
    if (region.phoneRegex.test(cleaned)) return true;
  }

  // General E.164 check (starts with +, followed by 8-15 digits)
  if (/^\+[1-9]\d{7,14}$/.test(cleaned)) return true;

  // Standard US 10-digit number without country code
  if (/^[2-9]\d{2}[2-9]\d{6}$/.test(cleaned)) return true;

  // Standard Nigerian 11-digit number without country code
  if (/^0[789][01]\d{8}$/.test(cleaned)) return true;

  return false;
}

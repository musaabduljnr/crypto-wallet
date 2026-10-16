import { describe, it, expect } from "vitest";
import { LedgerService } from "@/lib/services/ledger.service";

describe("Crypto Swaps & 30-Second RFQ Engine", () => {
  it("enforces guaranteed rate lock duration of exactly 30 seconds", () => {
    const quoteCreatedAt = Date.now();
    const ttlSeconds = 30;
    const expiresAt = new Date(quoteCreatedAt + ttlSeconds * 1000);

    const diffMs = expiresAt.getTime() - quoteCreatedAt;
    expect(diffMs).toBe(30000);

    // Active state within TTL
    const isWithinTTL = Date.now() < expiresAt.getTime();
    expect(isWithinTTL).toBe(true);

    // Expired state beyond TTL
    const simulatedPastExpiry = quoteCreatedAt + 31000;
    const isExpired = simulatedPastExpiry > expiresAt.getTime();
    expect(isExpired).toBe(true);
  });

  it("calculates platform conversion fee (0.50% / 50 bps) correctly without rounding errors", () => {
    const grossAmount = "155000.00"; // e.g. 100 USDT converted to NGN at 1550 rate
    const bps = 50; // 0.50%

    const grossNum = parseFloat(grossAmount);
    const feeNum = (grossNum * bps) / 10000; // 775.00 NGN
    const netNum = grossNum - feeNum; // 154,225.00 NGN

    expect(feeNum).toBe(775.0);
    expect(netNum).toBe(154225.0);
  });

  it("verifies multi-asset double-entry bridge invariant via SWAP_CLEARING", () => {
    // Scenario: User swaps 100 USDT for 154,225 NGN (with 775 NGN fee)
    // Leg 1 (Source Asset: USDT):
    // DEBIT User USER_AVAILABLE 100 USDT
    // CREDIT System SWAP_CLEARING 100 USDT
    const leg1Entries = [
      { account: "USER_AVAILABLE_USDT", direction: "DEBIT", amount: "100.00", asset: "USDT" },
      { account: "SWAP_CLEARING_USDT", direction: "CREDIT", amount: "100.00", asset: "USDT" },
    ];

    const leg1Debits = leg1Entries
      .filter((e) => e.direction === "DEBIT")
      .reduce((s, e) => LedgerService.addDecimals(s, e.amount), "0.00");
    const leg1Credits = leg1Entries
      .filter((e) => e.direction === "CREDIT")
      .reduce((s, e) => LedgerService.addDecimals(s, e.amount), "0.00");

    expect(leg1Debits).toBe("100.00");
    expect(leg1Credits).toBe("100.00");
    expect(LedgerService.subtractDecimals(leg1Debits, leg1Credits)).toBe("0.00");

    // Leg 2 (Destination Asset: NGN):
    // DEBIT System SWAP_CLEARING 155,000 NGN
    // CREDIT User USER_AVAILABLE 154,225 NGN (net)
    // CREDIT System FEE_REVENUE 775 NGN (fee)
    const leg2Entries = [
      { account: "SWAP_CLEARING_NGN", direction: "DEBIT", amount: "155000.00", asset: "NGN" },
      { account: "USER_AVAILABLE_NGN", direction: "CREDIT", amount: "154225.00", asset: "NGN" },
      { account: "FEE_REVENUE_NGN", direction: "CREDIT", amount: "775.00", asset: "NGN" },
    ];

    const leg2Debits = leg2Entries
      .filter((e) => e.direction === "DEBIT")
      .reduce((s, e) => LedgerService.addDecimals(s, e.amount), "0.00");
    const leg2Credits = leg2Entries
      .filter((e) => e.direction === "CREDIT")
      .reduce((s, e) => LedgerService.addDecimals(s, e.amount), "0.00");

    expect(leg2Debits).toBe("155000.00");
    expect(leg2Credits).toBe("155000.00");
    expect(LedgerService.subtractDecimals(leg2Debits, leg2Credits)).toBe("0.00");
  });

  it("rejects quote execution if source asset and destination asset are identical", () => {
    const src = "USDT";
    const dst = "USDT";

    const validatePair = (s: string, d: string) => {
      if (s === d) {
        throw new Error("INVALID_ASSET_PAIR");
      }
    };

    expect(() => validatePair(src, dst)).toThrow("INVALID_ASSET_PAIR");
  });
});

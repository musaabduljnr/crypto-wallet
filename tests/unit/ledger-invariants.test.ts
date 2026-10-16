import { describe, it, expect } from "vitest";
import { LedgerService } from "@/lib/services/ledger.service";

describe("Financial Ledger Math & Invariants", () => {
  it("eliminates floating point binary distortion using exact decimal arithmetic", () => {
    // Classic JavaScript float bug: 0.1 + 0.2 = 0.30000000000000004
    const floatResult = 0.1 + 0.2;
    expect(floatResult).not.toBe(0.3);

    // Exact decimal arithmetic
    const exactSum = LedgerService.addDecimals("0.10", "0.20");
    expect(exactSum).toBe("0.30");

    const exactDiff = LedgerService.subtractDecimals("100.50", "49.25");
    expect(exactDiff).toBe("51.25");
  });

  it("handles high-precision crypto decimal strings without rounding loss", () => {
    const amountA = "1.000000000000000001";
    const amountB = "0.000000000000000002";
    const sum = LedgerService.addDecimals(amountA, amountB);
    expect(sum).toBe("1.000000000000000003");
  });

  it("enforces debit/credit equilibrium invariant on balanced double-entry transactions", () => {
    // Scenario: NGN 50,000 Fiat Deposit
    const entries = [
      { account: "FIAT_CLEARING", direction: "DEBIT", amount: "50000.00", asset: "NGN" },
      { account: "USER_AVAILABLE", direction: "CREDIT", amount: "50000.00", asset: "NGN" },
    ];

    const totalDebits = entries
      .filter((e) => e.direction === "DEBIT")
      .reduce((acc, e) => LedgerService.addDecimals(acc, e.amount), "0.00");

    const totalCredits = entries
      .filter((e) => e.direction === "CREDIT")
      .reduce((acc, e) => LedgerService.addDecimals(acc, e.amount), "0.00");

    expect(totalDebits).toBe("50000.00");
    expect(totalCredits).toBe("50000.00");
    expect(LedgerService.subtractDecimals(totalDebits, totalCredits)).toBe("0.00");
  });

  it("detects and flags imbalanced ledger entries", () => {
    // Malicious or corrupted entry: debits != credits
    const imbalancedEntries = [
      { account: "FIAT_CLEARING", direction: "DEBIT", amount: "50000.00", asset: "NGN" },
      { account: "USER_AVAILABLE", direction: "CREDIT", amount: "49950.00", asset: "NGN" }, // ₦50 discrepancy
    ];

    const totalDebits = imbalancedEntries
      .filter((e) => e.direction === "DEBIT")
      .reduce((acc, e) => LedgerService.addDecimals(acc, e.amount), "0.00");

    const totalCredits = imbalancedEntries
      .filter((e) => e.direction === "CREDIT")
      .reduce((acc, e) => LedgerService.addDecimals(acc, e.amount), "0.00");

    const discrepancy = LedgerService.subtractDecimals(totalDebits, totalCredits);
    expect(discrepancy).not.toBe("0.00");
    expect(discrepancy).toBe("50.00");
  });
});

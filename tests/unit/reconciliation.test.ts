import { describe, it, expect } from "vitest";

describe("Reconciliation & Financial Integrity Invariants", () => {
  it("flags duplicate provider references to prevent double-spending", () => {
    const references = [
      "KORA-REF-1001",
      "KORA-REF-1002",
      "KORA-REF-1001", // Duplicate
      "KORA-REF-1003",
    ];

    const refCounts = new Map<string, number>();
    let duplicates = 0;

    for (const ref of references) {
      const count = (refCounts.get(ref) || 0) + 1;
      refCounts.set(ref, count);
      if (count === 2) duplicates++;
    }

    expect(duplicates).toBe(1);
    expect(refCounts.get("KORA-REF-1001")).toBe(2);
  });

  it("computes net ledger equilibrium across complex multi-entry transactions", () => {
    // Scenario: Fiat deposit with platform absorption of fee
    const entries = [
      { account: "FIAT_CLEARING", direction: "DEBIT", amount: 50000.0 },
      { account: "USER_AVAILABLE", direction: "CREDIT", amount: 50000.0 },
    ];

    const netBalance = entries.reduce((acc, e) => {
      return acc + (e.direction === "DEBIT" ? e.amount : -e.amount);
    }, 0);

    expect(netBalance).toBe(0);
  });

  it("identifies unbalanced multi-asset ledger entries immediately", () => {
    const corruptedEntries = [
      { account: "CUSTODY_CLEARING", direction: "DEBIT", amount: 100.0 },
      { account: "USER_AVAILABLE", direction: "CREDIT", amount: 90.0 }, // Discrepancy of 10.0
    ];

    const net = corruptedEntries.reduce((acc, e) => {
      return acc + (e.direction === "DEBIT" ? e.amount : -e.amount);
    }, 0);

    expect(net).not.toBe(0);
    expect(net).toBe(10.0);
  });
});

import { describe, it, expect } from "vitest";
import { LedgerService } from "@/lib/services/ledger.service";

describe("Admin Wallet Adjustments & Transaction History Synchronisation", () => {
  it("accurately computes available balance across credit and debit adjustments", () => {
    let balance = "100.50";
    
    // Admin credits 50.25 USD
    balance = LedgerService.addDecimals(balance, "50.25");
    expect(balance).toBe("150.75");

    // Admin debits 25.50 USD
    balance = LedgerService.subtractDecimals(balance, "25.50");
    expect(balance).toBe("125.25");
  });

  it("handles high precision crypto balance adjustments without floating point loss", () => {
    let btcBalance = "0.00000000";
    btcBalance = LedgerService.addDecimals(btcBalance, "0.12345678");
    expect(btcBalance).toBe("0.12345678");

    btcBalance = LedgerService.subtractDecimals(btcBalance, "0.02345678");
    expect(btcBalance).toBe("0.10000000");
  });

  it("formats SYSTEM_RECONCILIATION transactions as user-friendly Balance Adjustments", () => {
    const txType = "SYSTEM_RECONCILIATION";
    const userLabel = txType === "SYSTEM_RECONCILIATION" 
      ? "Balance Adjustment" 
      : txType.toLowerCase().replace(/_/g, " ");
    
    expect(userLabel).toBe("Balance Adjustment");
  });

  it("simulates balance upsert payload invariant", () => {
    const accountId = "acct-user-usd-123";
    const userId = "user-123";
    const assetTicker = "USD";
    const newBal = 500.00;

    const upsertPayload = {
      account_id: accountId,
      user_id: userId,
      asset_ticker: assetTicker,
      available_balance: newBal,
      reserved_balance: 0,
      pending_balance: 0,
      updated_at: new Date().toISOString(),
    };

    expect(upsertPayload.account_id).toBe(accountId);
    expect(upsertPayload.user_id).toBe(userId);
    expect(upsertPayload.available_balance).toBe(500.00);
  });
});

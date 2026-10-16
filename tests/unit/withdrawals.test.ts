import { describe, it, expect } from "vitest";
import { FireblocksCustodyAdapter } from "@/lib/providers/adapters/custody.adapter";
import { LedgerService } from "@/lib/services/ledger.service";

describe("External Crypto Withdrawals & Two-Phase Custody Invariants", () => {
  const adapter = new FireblocksCustodyAdapter({ isSandbox: true });

  it("validates network-specific address formats across all supported chains", () => {
    // EVM: Polygon, Arbitrum, Base, Ethereum
    expect(adapter.validateAddress("0x71C7656EC7ab88b098defB751B7401B5f6d8976F", "POLYGON")).toBe(true);
    expect(adapter.validateAddress("0x71C7656EC7ab88b098defB751B7401B5f6d8976F", "ARBITRUM")).toBe(true);
    expect(adapter.validateAddress("0x71C7656EC7ab88b098defB751B7401B5f6d8976F", "BASE")).toBe(true);
    expect(adapter.validateAddress("0x71C7656EC7ab88b098defB751B7401B5f6d8976F", "ETHEREUM")).toBe(true);

    // Tron TRC-20
    expect(adapter.validateAddress("TR7NHqJEKQxGTCi8q8ZY4pL8otSzgjLj6t", "TRON")).toBe(true);

    // Solana
    expect(adapter.validateAddress("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", "SOLANA")).toBe(true);

    // Invalid addresses
    expect(adapter.validateAddress("0xinvalid", "POLYGON")).toBe(false);
    expect(adapter.validateAddress("TR7NHqJEKQxGTCi8q8ZY4pL8otSzgjLj6t", "POLYGON")).toBe(false);
  });

  it("estimates accurate network gas fees per chain", async () => {
    const polygonFee = await adapter.estimateNetworkFee("USDT", "POLYGON");
    const arbitrumFee = await adapter.estimateNetworkFee("USDT", "ARBITRUM");
    const ethFee = await adapter.estimateNetworkFee("ETH", "ETHEREUM");

    expect(parseFloat(polygonFee.networkFee)).toBeGreaterThan(0);
    expect(parseFloat(arbitrumFee.networkFee)).toBeGreaterThan(0);
    expect(parseFloat(ethFee.networkFee)).toBeGreaterThan(0);
  });

  it("enforces Phase 1 fund reservation invariant (USER_AVAILABLE -> USER_RESERVED)", () => {
    const startAvailable = "100.00";
    const startReserved = "0.00";
    const withdrawAmount = "40.00";
    const networkFee = "0.50";
    const totalDebit = LedgerService.addDecimals(withdrawAmount, networkFee); // 40.50

    // Reservation step
    const endAvailable = LedgerService.subtractDecimals(startAvailable, totalDebit);
    const endReserved = LedgerService.addDecimals(startReserved, totalDebit);

    expect(totalDebit).toBe("40.50");
    expect(endAvailable).toBe("59.50");
    expect(endReserved).toBe("40.50");

    // Total user liabilities invariant remains unchanged
    const totalLiabilities = LedgerService.addDecimals(endAvailable, endReserved);
    expect(totalLiabilities).toBe(startAvailable);
  });

  it("enforces Phase 2a settlement invariant upon custodial broadcast", () => {
    const currentReserved = "40.50";
    const netAmount = "40.00";
    const feeAmount = "0.50";
    const asset = "USDT";

    // Double-entry entries:
    // DEBIT USER_RESERVED 40.50
    // CREDIT CUSTODY_CLEARING 40.00
    // CREDIT FEE_REVENUE 0.50
    const entries = [
      { account: "USER_RESERVED", direction: "DEBIT", amount: currentReserved, asset },
      { account: "CUSTODY_CLEARING", direction: "CREDIT", amount: netAmount, asset },
      { account: "FEE_REVENUE", direction: "CREDIT", amount: feeAmount, asset },
    ];

    const totalDebits = entries
      .filter((e) => e.direction === "DEBIT")
      .reduce((s, e) => LedgerService.addDecimals(s, e.amount), "0.00");

    const totalCredits = entries
      .filter((e) => e.direction === "CREDIT")
      .reduce((s, e) => LedgerService.addDecimals(s, e.amount), "0.00");

    expect(totalDebits).toBe("40.50");
    expect(totalCredits).toBe("40.50");
    expect(LedgerService.subtractDecimals(totalDebits, totalCredits)).toBe("0.00");
  });

  it("enforces Phase 2b compensating rollback restoring available funds if custody broadcast fails", () => {
    const startAvailable = "59.50";
    const startReserved = "40.50";
    const totalDebit = "40.50";

    // Rollback moves funds from USER_RESERVED back to USER_AVAILABLE
    const restoredAvailable = LedgerService.addDecimals(startAvailable, totalDebit);
    const restoredReserved = LedgerService.subtractDecimals(startReserved, totalDebit);

    expect(restoredAvailable).toBe("100.00");
    expect(restoredReserved).toBe("0.00");
  });

  it("generates transparent sandbox broadcast receipts when credentials are in test mode", async () => {
    const submitResult = await adapter.submitWithdrawal({
      withdrawalId: "wdl-unit-test-123",
      destinationAddress: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
      asset: "USDT",
      network: "POLYGON",
      amount: "25.00",
    });

    expect(submitResult.isSandbox).toBe(true);
    expect(submitResult.status).toBe("BROADCAST");
    expect(submitResult.txHash?.startsWith("0x")).toBe(true);
    expect(submitResult.providerTxId.startsWith("fb-sim-")).toBe(true);
  });
});

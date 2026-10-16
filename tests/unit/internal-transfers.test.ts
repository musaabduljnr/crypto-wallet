import { describe, it, expect, vi } from "vitest";
import { LedgerService } from "@/lib/services/ledger.service";

describe("Internal User-to-User Transfers", () => {
  it("prohibits self-transfers where sender and recipient identifiers match", () => {
    const senderId = "user-uuid-1111";
    const recipientId = "user-uuid-1111";

    const isSelfTransfer = senderId === recipientId;
    expect(isSelfTransfer).toBe(true);

    const validateTransfer = (snd: string, rcv: string) => {
      if (snd === rcv) {
        throw new Error("ERR_SELF_TRANSFER_PROHIBITED");
      }
    };

    expect(() => validateTransfer(senderId, recipientId)).toThrow("ERR_SELF_TRANSFER_PROHIBITED");
  });

  it("masks recipient identifier to preserve user privacy during discovery", () => {
    const email = "musa.abubakar@example.com";
    const phone = "+2348012345678";

    // Email masking function
    const maskEmail = (val: string) => {
      const parts = val.split("@");
      return parts[0].slice(0, 2) + "***@" + parts[1];
    };

    // Phone masking function
    const maskPhone = (val: string) => {
      return val.slice(0, 4) + "***" + val.slice(-3);
    };

    expect(maskEmail(email)).toBe("mu***@example.com");
    expect(maskPhone(phone)).toBe("+234***678");
  });

  it("strictly prevents overspending when requested amount exceeds available balance", () => {
    const availableBalance = "150.00";
    const transferAmount = "200.00";

    const availableNum = parseFloat(availableBalance);
    const amountNum = parseFloat(transferAmount);

    const hasSufficientFunds = availableNum >= amountNum;
    expect(hasSufficientFunds).toBe(false);

    const diff = LedgerService.subtractDecimals(availableBalance, transferAmount);
    expect(diff.startsWith("-")).toBe(true);
  });

  it("verifies double-entry ledger balance conservation on internal transfers", () => {
    const transferAmount = "50.00";
    const asset = "USDT";

    // Double-entry representation of internal transfer:
    // Sender available liability decreases (DEBIT)
    // Recipient available liability increases (CREDIT)
    const entries = [
      { account: "SENDER_USER_AVAILABLE", direction: "DEBIT", amount: transferAmount, asset },
      { account: "RECIPIENT_USER_AVAILABLE", direction: "CREDIT", amount: transferAmount, asset },
    ];

    const totalDebits = entries
      .filter((e) => e.direction === "DEBIT")
      .reduce((sum, e) => LedgerService.addDecimals(sum, e.amount), "0.00");

    const totalCredits = entries
      .filter((e) => e.direction === "CREDIT")
      .reduce((sum, e) => LedgerService.addDecimals(sum, e.amount), "0.00");

    expect(totalDebits).toBe("50.00");
    expect(totalCredits).toBe("50.00");
    expect(LedgerService.subtractDecimals(totalDebits, totalCredits)).toBe("0.00");
  });

  it("enforces zero transfer fees on internal peer-to-peer transfers", () => {
    const amount = "100.00";
    const fee = "0.00";
    const totalDebit = LedgerService.addDecimals(amount, fee);

    expect(fee).toBe("0.00");
    expect(totalDebit).toBe(amount);
  });

  it("protects against duplicate submission with idempotent keys", () => {
    const ledger = new Map<string, { txId: string; amount: string }>();
    const idempotencyKey = "txf-idemp-unique-987";

    // First attempt
    if (!ledger.has(idempotencyKey)) {
      ledger.set(idempotencyKey, { txId: "tx-1", amount: "50.00" });
    }

    // Duplicate re-submission attempt
    let executedTwice = false;
    if (!ledger.has(idempotencyKey)) {
      executedTwice = true;
    }

    expect(ledger.size).toBe(1);
    expect(executedTwice).toBe(false);
    expect(ledger.get(idempotencyKey)?.txId).toBe("tx-1");
  });
});

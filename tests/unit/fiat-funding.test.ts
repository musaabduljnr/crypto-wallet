import { describe, it, expect } from "vitest";
import crypto from "crypto";
import { KorapayFundingAdapter } from "@/lib/providers/adapters/korapay.adapter";

describe("Fiat Funding & Korapay Adapter Integration", () => {
  const secretKey = "test_kora_secret_key_123456789";
  const adapter = new KorapayFundingAdapter({
    secretKey,
    isSandbox: true,
  });

  it("enforces minimum funding threshold of NGN 100", async () => {
    await expect(
      adapter.createFundingSession({
        userId: "user-123",
        userEmail: "user@test.ng",
        userName: "Test User",
        amountNgn: "50.00", // Below ₦100
        idempotencyKey: "test-idem-1",
      })
    ).rejects.toThrow("Minimum funding amount is ₦100.00");
  });

  it("enforces maximum funding threshold of NGN 5,000,000", async () => {
    await expect(
      adapter.createFundingSession({
        userId: "user-123",
        userEmail: "user@test.ng",
        userName: "Test User",
        amountNgn: "6000000.00", // Above ₦5M
        idempotencyKey: "test-idem-2",
      })
    ).rejects.toThrow("Maximum single funding amount is ₦5,000,000.00");
  });

  it("creates valid virtual account details in sandbox mode", async () => {
    const session = await adapter.createFundingSession({
      userId: "user-123",
      userEmail: "user@test.ng",
      userName: "Musa Abubakar",
      amountNgn: "50000.00",
      idempotencyKey: "test-idem-3",
    });

    expect(session.paymentMethod).toBe("VIRTUAL_ACCOUNT");
    expect(session.virtualAccount).toBeDefined();
    expect(session.virtualAccount?.bankName).toContain("Bank");
    expect(session.virtualAccount?.accountNumber).toHaveLength(10);
    expect(session.virtualAccount?.accountName).toContain("MUSA ABUBAKAR");
    expect(session.feeAmountNgn).toBe("50.00");
    expect(session.isSandbox).toBe(true);
  });

  it("verifies valid HMAC-SHA256 webhook signatures", () => {
    const rawBody = JSON.stringify({
      event: "charge.success",
      data: {
        reference: "KORA-REF-12345",
        amount: 50000,
        currency: "NGN",
      },
    });

    const validSignature = crypto
      .createHmac("sha256", secretKey)
      .update(rawBody)
      .digest("hex");

    const isValid = adapter.verifyWebhookSignature({
      rawBody,
      signature: validSignature,
    });

    expect(isValid).toBe(true);
  });

  it("rejects forged or tampered webhook signatures", () => {
    const rawBody = JSON.stringify({ event: "charge.success", amount: 50000 });
    const forgedSignature = "0000000000000000000000000000000000000000000000000000000000000000";

    const isValid = adapter.verifyWebhookSignature({
      rawBody,
      signature: forgedSignature,
    });

    expect(isValid).toBe(false);
  });

  it("parses valid webhook payload into strongly-typed event", () => {
    const rawBody = JSON.stringify({
      event_id: "EVT-99999",
      data: {
        reference: "KORA-REF-99999",
        amount: 25000,
        fee: 50,
        paid_at: "2026-10-16T12:00:00Z",
        payer_bank: "Guaranty Trust Bank",
        payer_name: "John Doe",
      },
    });

    const event = adapter.parseFundingWebhook({
      rawBody,
      signature: "valid",
    });

    expect(event.externalEventId).toBe("EVT-99999");
    expect(event.providerReference).toBe("KORA-REF-99999");
    expect(event.amountNgn).toBe("25000.00");
    expect(event.feeNgn).toBe("50.00");
    expect(event.senderBank).toBe("Guaranty Trust Bank");
  });
});

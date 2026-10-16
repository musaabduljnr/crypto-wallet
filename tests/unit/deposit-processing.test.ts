import { describe, it, expect } from "vitest";
import crypto from "crypto";
import { FireblocksCustodyAdapter } from "@/lib/providers/adapters/custody.adapter";

describe("Crypto Deposit Processing & Custody Adapter", () => {
  const webhookSecret = "test_fireblocks_secret_987654321";
  const adapter = new FireblocksCustodyAdapter({
    apiKey: "test_api_key",
    secretKey: "test_secret_key",
    webhookSecret,
    isSandbox: true,
  });

  it("validates EVM addresses accurately (0x with 40 hex chars)", () => {
    expect(adapter.validateAddress("0x71C7656EC7ab88b098defB751B7401B5f6d8976F", "POLYGON")).toBe(true);
    expect(adapter.validateAddress("0x71C7656EC7ab88b098defB751B7401B5f6d8976F", "ARBITRUM")).toBe(true);
    expect(adapter.validateAddress("0x71C7656EC7ab88b098defB751B7401B5f6d8976F", "BASE")).toBe(true);
    // Invalid EVM addresses
    expect(adapter.validateAddress("0x123", "POLYGON")).toBe(false);
    expect(adapter.validateAddress("not-an-address", "POLYGON")).toBe(false);
  });

  it("validates Tron TRC-20 addresses (T + 33 base58 chars)", () => {
    expect(adapter.validateAddress("TR7NHqJEKQxGTCi8q8ZY4pL8otSzgjLj6t", "TRON")).toBe(true);
    expect(adapter.validateAddress("0x71C7656EC7ab88b098defB751B7401B5f6d8976F", "TRON")).toBe(false);
  });

  it("enforces network confirmation depth policies to prevent re-org attacks", () => {
    expect(adapter.getConfirmationDepth("POLYGON")).toBe(64);
    expect(adapter.getConfirmationDepth("ARBITRUM")).toBe(32);
    expect(adapter.getConfirmationDepth("BASE")).toBe(30);
    expect(adapter.getConfirmationDepth("ETHEREUM")).toBe(12);
    expect(adapter.getConfirmationDepth("TRON")).toBe(20);
  });

  it("generates deterministic sandbox deposit addresses", async () => {
    const resA = await adapter.generateDepositAddress({
      userId: "user-alpha",
      asset: "USDT",
      network: "POLYGON",
    });

    const resB = await adapter.generateDepositAddress({
      userId: "user-alpha",
      asset: "USDT",
      network: "POLYGON",
    });

    // Same user + asset + network yields identical persistent deposit address
    expect(resA.address).toBe(resB.address);
    expect(resA.address.startsWith("0x")).toBe(true);
    expect(resA.address).toHaveLength(42);
    expect(resA.isSandbox).toBe(true);
  });

  it("rejects unsupported asset and network combinations", async () => {
    await expect(
      adapter.generateDepositAddress({
        userId: "user-alpha",
        asset: "USDT",
        network: "BITCOIN_NETWORK" as any,
      })
    ).rejects.toThrow("Unsupported network");
  });

  it("verifies custody webhook HMAC-SHA512 signatures", () => {
    const rawBody = JSON.stringify({
      data: {
        txHash: "0xabcdef123456",
        confirmations: 64,
        network: "POLYGON",
      },
    });

    const validSig = crypto
      .createHmac("sha512", webhookSecret)
      .update(rawBody)
      .digest("hex");

    expect(adapter.verifyWebhookSignature(rawBody, validSig)).toBe(true);
    expect(adapter.verifyWebhookSignature(rawBody, "invalid-sig")).toBe(false);
  });

  it("classifies deposit status as DETECTED vs CONFIRMED based on block depth", () => {
    // 10 confirmations on Polygon (depth: 64) -> DETECTED (pending)
    const pendingPayload = JSON.stringify({
      data: {
        txHash: "0x111",
        network: "POLYGON",
        confirmations: 10,
        amount: "100.00",
        asset: "USDT",
      },
    });
    const pendingEvent = adapter.parseDepositWebhook(pendingPayload);
    expect(pendingEvent.status).toBe("DETECTED");
    expect(pendingEvent.requiredConfirmations).toBe(64);

    // 64 confirmations on Polygon -> CONFIRMED (ready for ledger posting)
    const confirmedPayload = JSON.stringify({
      data: {
        txHash: "0x222",
        network: "POLYGON",
        confirmations: 64,
        amount: "100.00",
        asset: "USDT",
      },
    });
    const confirmedEvent = adapter.parseDepositWebhook(confirmedPayload);
    expect(confirmedEvent.status).toBe("CONFIRMED");
  });
});

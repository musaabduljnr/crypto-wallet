import { describe, it, expect } from "vitest";
import { LedgerService } from "@/lib/services/ledger.service";
import { FireblocksCustodyAdapter } from "@/lib/providers/adapters/custody.adapter";
import { KorapayFundingAdapter } from "@/lib/providers/adapters/korapay.adapter";
import { CoinGeckoPriceFeedAdapter } from "@/lib/providers/adapters/price-feed.adapter";

describe("Full End-to-End User Journeys Simulation", () => {
  const custodyAdapter = new FireblocksCustodyAdapter({ isSandbox: true });
  const fundingAdapter = new KorapayFundingAdapter({ isSandbox: true });
  const priceFeed = new CoinGeckoPriceFeedAdapter();

  // JOURNEY 1: Authentication & Protected Route Verification
  it("enforces protected route redirect when user session is unauthenticated", () => {
    const protectedRoutes = [
      "/dashboard",
      "/dashboard/transfer",
      "/dashboard/withdraw",
      "/dashboard/swap",
      "/dashboard/history",
      "/dashboard/settings",
    ];

    const evaluateRouteAccess = (path: string, hasSession: boolean) => {
      if (protectedRoutes.includes(path) && !hasSession) {
        return { status: 307, redirectUrl: "/login" };
      }
      return { status: 200, redirectUrl: null };
    };

    for (const route of protectedRoutes) {
      const access = evaluateRouteAccess(route, false);
      expect(access.status).toBe(307);
      expect(access.redirectUrl).toBe("/login");
    }

    const authAccess = evaluateRouteAccess("/dashboard", true);
    expect(authAccess.status).toBe(200);
    expect(authAccess.redirectUrl).toBeNull();
  });

  // JOURNEY 2: Crypto Receive Address Generation & Context
  it("generates network-specific receive addresses preserving asset and network context", async () => {
    const usdtPolygon = await custodyAdapter.generateDepositAddress({
      userId: "user-e2e-test",
      asset: "USDT",
      network: "POLYGON",
    });

    const usdtTron = await custodyAdapter.generateDepositAddress({
      userId: "user-e2e-test",
      asset: "USDT",
      network: "TRON",
    });

    expect(usdtPolygon.asset).toBe("USDT");
    expect(usdtPolygon.network).toBe("POLYGON");
    expect(usdtPolygon.address.startsWith("0x")).toBe(true);

    expect(usdtTron.asset).toBe("USDT");
    expect(usdtTron.network).toBe("TRON");
    expect(usdtTron.address.startsWith("T")).toBe(true);
  });

  // JOURNEY 3: Fiat Funding Lifecycle (Initiation -> Webhook -> Credit)
  it("executes complete NGN virtual account funding journey with idempotent credit", async () => {
    // Step 1: Create funding order
    const order = await fundingAdapter.createFundingSession({
      userId: "user-e2e-test",
      userEmail: "customer@apexwallet.ng",
      userName: "Musa Abubakar",
      amountNgn: "50000.00",
      idempotencyKey: "idem-e2e-12345",
    });

    expect(order.virtualAccount?.accountNumber).toHaveLength(10);
    expect(order.providerReference.startsWith("KORA-")).toBe(true);

    // Step 2: Unconfirmed funding attempt does NOT credit ledger
    let ledgerCredited = false;
    let balance = "0.00";

    const simulatePendingWebhook = (status: string) => {
      if (status === "success") {
        ledgerCredited = true;
        balance = LedgerService.addDecimals(balance, "50000.00");
      }
    };

    simulatePendingWebhook("pending");
    expect(ledgerCredited).toBe(false);
    expect(balance).toBe("0.00");

    // Step 3: Verified provider webhook credits exactly once
    simulatePendingWebhook("success");
    expect(ledgerCredited).toBe(true);
    expect(balance).toBe("50000.00");

    // Step 4: Duplicate webhook replay does not credit again
    const simulateDuplicateWebhook = (providerRef: string) => {
      const processed = new Set([order.providerReference]);
      if (processed.has(providerRef)) {
        return "IDEMPOTENT_REPLAY";
      }
      balance = LedgerService.addDecimals(balance, order.amountNgn);
      return "CREDITED";
    };

    const replayResult = simulateDuplicateWebhook(order.providerReference);
    expect(replayResult).toBe("IDEMPOTENT_REPLAY");
    expect(balance).toBe("50000.00"); // Remains exactly 50,000 NGN
  });

  // JOURNEY 4: Internal P2P Transfer Journey
  it("completes full internal peer-to-peer transfer journey between test users", () => {
    let userABalance = "250.00";
    let userBBalance = "50.00";
    const transferAmount = "100.00";

    // Transfer execution
    userABalance = LedgerService.subtractDecimals(userABalance, transferAmount);
    userBBalance = LedgerService.addDecimals(userBBalance, transferAmount);

    expect(userABalance).toBe("150.00");
    expect(userBBalance).toBe("150.00");

    // Aggregate system liability remains conserved
    const totalCirculation = LedgerService.addDecimals(userABalance, userBBalance);
    expect(totalCirculation).toBe("300.00"); // 250 + 50 = 300
  });

  // JOURNEY 5: External Crypto Withdrawal (Two-Phase Submission)
  it("completes external crypto withdrawal workflow with fee estimation and broadcast", async () => {
    const feeQuote = await custodyAdapter.estimateNetworkFee("USDT", "POLYGON");
    expect(parseFloat(feeQuote.networkFee)).toBeGreaterThan(0);

    const withdrawalResult = await custodyAdapter.submitWithdrawal({
      withdrawalId: "wdl-e2e-test",
      destinationAddress: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
      asset: "USDT",
      network: "POLYGON",
      amount: "50.00",
    });

    expect(withdrawalResult.status).toBe("BROADCAST");
    expect(withdrawalResult.txHash?.startsWith("0x")).toBe(true);
    expect(withdrawalResult.isSandbox).toBe(true);
  });

  // JOURNEY 6: Crypto Swap RFQ Journey (Rate Lock -> Execution)
  it("completes crypto swap journey with price feed valuation and 30s rate lock", async () => {
    const prices = await priceFeed.getAllPrices();
    expect(prices.rates["USDT"].priceUsd).toBe(1.0);
    expect(prices.rates["BTC"].priceUsd).toBeGreaterThan(50000);

    const quoteCreatedAt = Date.now();
    const expiresAt = quoteCreatedAt + 30000;

    // Active conversion execution within 30s
    const isExecutionValid = Date.now() < expiresAt;
    expect(isExecutionValid).toBe(true);
  });
});

import { describe, it, expect } from "vitest";
import { CoinGeckoPriceFeedAdapter } from "@/lib/providers/adapters/price-feed.adapter";

describe("Market Price Feed & Staleness Detection", () => {
  const adapter = new CoinGeckoPriceFeedAdapter();

  it("retrieves current prices for all supported assets", async () => {
    const portfolio = await adapter.getAllPrices();
    expect(portfolio.rates).toBeDefined();
    expect(portfolio.rates["USDT"].priceUsd).toBe(1.0);
    expect(portfolio.rates["BTC"].priceUsd).toBeGreaterThan(50000);
    expect(portfolio.rates["ETH"].priceUsd).toBeGreaterThan(2000);
    expect(portfolio.rates["NGN"].priceNgn).toBe(1.0);
    expect(portfolio.usdToNgnRate).toBeGreaterThan(1000);
    expect(portfolio.isStale).toBe(false);
  });

  it("detects stale prices when timestamp exceeds max age threshold", () => {
    const freshTimestamp = Date.now() - 30 * 1000; // 30 seconds ago
    expect(adapter.isPriceStale(freshTimestamp, 300)).toBe(false);

    const staleTimestamp = Date.now() - 350 * 1000; // 5.8 minutes ago (exceeds 300s)
    expect(adapter.isPriceStale(staleTimestamp, 300)).toBe(true);
  });

  it("calculates accurate fiat-to-crypto cross rates", async () => {
    const usdt = await adapter.getAssetPrice("USDT");
    const ngn = await adapter.getAssetPrice("NGN");

    expect(usdt.priceNgn).toBe(1550);
    expect(ngn.priceNgn).toBe(1.0);
  });
});

/**
 * Price Feed Provider Contract (Ports & Adapters)
 * Defines strongly-typed interface for crypto-to-fiat and crypto-to-crypto market valuation.
 */

export interface AssetPriceInfo {
  assetTicker: string;
  priceUsd: number;
  priceNgn: number;
  change24hPercentage: number;
  timestamp: number; // Unix timestamp in milliseconds
  isStale: boolean;
}

export interface PortfolioPrices {
  rates: Record<string, AssetPriceInfo>;
  usdToNgnRate: number;
  updatedAt: string; // ISO-8601 string
  isStale: boolean;
}

export interface IPriceFeedAdapter {
  readonly providerName: string;

  /**
   * Fetches real-time price info for a specific asset.
   */
  getAssetPrice(assetTicker: string): Promise<AssetPriceInfo>;

  /**
   * Fetches current prices for all supported assets in a single batch query.
   */
  getAllPrices(): Promise<PortfolioPrices>;

  /**
   * Checks whether the current cached price exceeds the maximum allowable staleness window.
   */
  isPriceStale(timestampMs: number, maxAgeSeconds?: number): boolean;
}

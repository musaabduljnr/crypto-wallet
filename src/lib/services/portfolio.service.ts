import { ledgerService, AccountBalance, LedgerTransactionSummary } from "./ledger.service";
import { providers } from "@/lib/providers/registry";

export interface AssetValuation {
  ticker: string;
  name: string;
  availableBalance: string;
  reservedBalance: string;
  pendingBalance: string;
  priceUsd: number;
  priceNgn: number;
  valueUsd: number;
  valueNgn: number;
  change24h: number;
}

export interface PortfolioOverview {
  totalValueUsd: number;
  totalValueNgn: number;
  usdToNgnRate: number;
  isStale: boolean;
  priceTimestamp: string;
  assets: AssetValuation[];
  recentTransactions: LedgerTransactionSummary[];
}

export class PortfolioService {
  private readonly ASSET_NAMES: Record<string, string> = {
    NGN: "Nigerian Naira",
    USDT: "Tether USD",
    USDC: "USD Coin",
    BTC: "Bitcoin",
    ETH: "Ethereum",
    SOL: "Solana",
  };

  async getPortfolioOverview(userId: string): Promise<PortfolioOverview> {
    const [balances, prices, transactions] = await Promise.all([
      ledgerService.getUserBalances(userId),
      providers.getPriceFeedAdapter().getAllPrices(),
      ledgerService.getUserTransactions(userId, 5),
    ]);

    let totalValueUsd = 0;
    let totalValueNgn = 0;
    const assets: AssetValuation[] = [];

    for (const [ticker, bal] of Object.entries(balances)) {
      const priceInfo = prices.rates[ticker] || {
        priceUsd: ticker === "NGN" ? 1 / prices.usdToNgnRate : 1.0,
        priceNgn: ticker === "NGN" ? 1.0 : prices.usdToNgnRate,
        change24hPercentage: 0,
      };

      const availableNum = parseFloat(bal.availableBalance) || 0;
      const reservedNum = parseFloat(bal.reservedBalance) || 0;
      const totalUnits = availableNum + reservedNum;

      let valueUsd: number;
      let valueNgn: number;

      if (ticker === "NGN") {
        valueNgn = totalUnits;
        valueUsd = totalUnits / prices.usdToNgnRate;
      } else {
        valueUsd = totalUnits * priceInfo.priceUsd;
        valueNgn = totalUnits * priceInfo.priceNgn;
      }

      totalValueUsd += valueUsd;
      totalValueNgn += valueNgn;

      assets.push({
        ticker,
        name: this.ASSET_NAMES[ticker] || ticker,
        availableBalance: bal.availableBalance,
        reservedBalance: bal.reservedBalance,
        pendingBalance: bal.pendingBalance,
        priceUsd: priceInfo.priceUsd,
        priceNgn: priceInfo.priceNgn,
        valueUsd,
        valueNgn,
        change24h: priceInfo.change24hPercentage,
      });
    }

    return {
      totalValueUsd,
      totalValueNgn,
      usdToNgnRate: prices.usdToNgnRate,
      isStale: prices.isStale,
      priceTimestamp: prices.updatedAt,
      assets,
      recentTransactions: transactions,
    };
  }
}

export const portfolioService = new PortfolioService();

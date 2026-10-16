import { IFiatFundingAdapter } from "./contracts/fiat-funding.interface";
import { ICustodyWalletAdapter } from "./contracts/custody-wallet.interface";
import { IPriceFeedAdapter } from "./contracts/price-feed.interface";
import { KorapayFundingAdapter } from "./adapters/korapay.adapter";
import { FireblocksCustodyAdapter } from "./adapters/custody.adapter";
import { CoinGeckoPriceFeedAdapter } from "./adapters/price-feed.adapter";

class ProviderRegistry {
  private fiatFundingAdapter?: IFiatFundingAdapter;
  private custodyWalletAdapter?: ICustodyWalletAdapter;
  private priceFeedAdapter?: IPriceFeedAdapter;

  getFiatFundingAdapter(): IFiatFundingAdapter {
    if (!this.fiatFundingAdapter) {
      this.fiatFundingAdapter = new KorapayFundingAdapter();
    }
    return this.fiatFundingAdapter;
  }

  getCustodyWalletAdapter(): ICustodyWalletAdapter {
    if (!this.custodyWalletAdapter) {
      this.custodyWalletAdapter = new FireblocksCustodyAdapter();
    }
    return this.custodyWalletAdapter;
  }

  getPriceFeedAdapter(): IPriceFeedAdapter {
    if (!this.priceFeedAdapter) {
      this.priceFeedAdapter = new CoinGeckoPriceFeedAdapter();
    }
    return this.priceFeedAdapter;
  }
}

export const providers = new ProviderRegistry();

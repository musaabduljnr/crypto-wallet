/**
 * Custody Wallet Provider Contract (Ports & Adapters)
 * Defines strongly-typed interface for managed crypto deposit addresses and on-chain monitoring.
 */

export interface GenerateAddressParams {
  userId: string;
  asset: string; // 'USDT', 'USDC', 'BTC', 'ETH', 'SOL'
  network: string; // 'POLYGON', 'ARBITRUM', 'BASE', 'TRON', 'ETHEREUM', 'SOLANA'
}

export interface DepositAddressResult {
  address: string; // Checksummed / valid recipient address
  network: string;
  asset: string;
  memoOrTag?: string;
  isSandbox: boolean;
}

export interface InboundDepositWebhookEvent {
  externalTxHash: string;
  toAddress: string;
  fromAddress: string;
  amount: string; // Exact decimal string
  asset: string;
  network: string;
  blockNumber: number;
  confirmations: number;
  requiredConfirmations: number;
  status: 'DETECTED' | 'CONFIRMED';
  rawPayload: Record<string, unknown>;
}

export interface SubmitWithdrawalParams {
  withdrawalId: string;
  destinationAddress: string;
  asset: string;
  network: string;
  amount: string;
}

export interface SubmitWithdrawalResult {
  providerTxId: string;
  txHash?: string;
  status: 'BROADCAST' | 'PENDING' | 'FAILED';
  isSandbox: boolean;
}

export interface NetworkFeeEstimate {
  networkFee: string;
  estimatedGasUsd: string;
}

export interface ICustodyWalletAdapter {
  readonly providerName: string;
  readonly isSandbox: boolean;

  /**
   * Generates or retrieves a persistent user deposit address for the asset and network.
   */
  generateDepositAddress(params: GenerateAddressParams): Promise<DepositAddressResult>;

  /**
   * Validates address formatting (EIP-55 for EVM, Base58 for Tron/Solana, Bech32 for BTC).
   */
  validateAddress(address: string, network: string): boolean;

  /**
   * Returns required block confirmation depth for the network.
   */
  getConfirmationDepth(network: string): number;

  /**
   * Estimates network gas/mining fee for an outbound withdrawal.
   */
  estimateNetworkFee(asset: string, network: string): Promise<NetworkFeeEstimate>;

  /**
   * Submits an outbound withdrawal to the custodial MPC or network.
   */
  submitWithdrawal(params: SubmitWithdrawalParams): Promise<SubmitWithdrawalResult>;

  /**
   * Cryptographically verifies inbound custody deposit webhook signature.
   */
  verifyWebhookSignature(rawBody: string, signature: string): boolean;

  /**
   * Parses and validates raw custody deposit webhook into strongly-typed event.
   */
  parseDepositWebhook(rawBody: string): InboundDepositWebhookEvent;
}


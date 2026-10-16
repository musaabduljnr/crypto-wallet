/**
 * Fiat Funding Provider Contract (Ports & Adapters)
 * Defines strongly-typed interface for Nigerian fiat on-ramp (DVA & checkout).
 */

export interface CreateFundingParams {
  userId: string;
  userEmail: string;
  userName: string;
  amountNgn: string; // Exact fixed-point numeric string (e.g. "50000.00")
  idempotencyKey: string;
}

export interface VirtualAccountDetails {
  bankName: string;
  accountNumber: string;
  accountName: string;
  expiresAt: string; // ISO-8601 string
}

export interface FundingSessionResult {
  providerReference: string;
  paymentMethod: 'VIRTUAL_ACCOUNT' | 'CHECKOUT_URL';
  virtualAccount?: VirtualAccountDetails;
  checkoutUrl?: string;
  feeAmountNgn: string;
  status: 'PENDING';
  isSandbox: boolean;
}

export interface WebhookFundingPayload {
  rawBody: string;
  signature: string;
  timestampHeader?: string;
}

export interface VerifiedFundingEvent {
  externalEventId: string;
  providerReference: string;
  amountNgn: string;
  feeNgn: string;
  paidAt: string;
  senderBank?: string;
  senderAccountName?: string;
  rawPayload: Record<string, unknown>;
}

export interface PaymentStatusResult {
  providerReference: string;
  status: 'PENDING' | 'SUCCESSFUL' | 'FAILED';
  amountNgn: string;
  feeNgn: string;
  settledAt?: string;
}

export interface IFiatFundingAdapter {
  readonly providerName: string;
  readonly isSandbox: boolean;

  /**
   * Generates a dedicated virtual bank account or checkout link for the user.
   */
  createFundingSession(params: CreateFundingParams): Promise<FundingSessionResult>;

  /**
   * Cryptographically verifies inbound webhook signature against provider secret.
   */
  verifyWebhookSignature(payload: WebhookFundingPayload): boolean;

  /**
   * Parses and validates raw webhook event payload into a strongly-typed funding event.
   */
  parseFundingWebhook(payload: WebhookFundingPayload): VerifiedFundingEvent;

  /**
   * Queries provider directly for authoritative payment resolution during timeouts.
   */
  queryPaymentStatus(providerReference: string): Promise<PaymentStatusResult>;
}

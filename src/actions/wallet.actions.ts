"use server";

import { createServerClient } from "@/lib/supabase/server";
import { portfolioService, PortfolioOverview } from "@/lib/services/portfolio.service";
import { fundingService, FundingOrderOutput } from "@/lib/services/funding.service";
import { depositService, DepositAddressOutput, CryptoDepositRecord } from "@/lib/services/deposit.service";
import { ledgerService, LedgerTransactionSummary } from "@/lib/services/ledger.service";
import { AppError } from "@/lib/errors";

export interface ActionResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

async function getAuthenticatedUser() {
  const supabase = await createServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    throw new AppError("Authentication required", "UNAUTHENTICATED", 401);
  }
  return user;
}

/**
 * Fetches server-authoritative portfolio overview with live market valuation.
 */
export async function getPortfolioAction(): Promise<ActionResponse<PortfolioOverview>> {
  try {
    const user = await getAuthenticatedUser();
    const data = await portfolioService.getPortfolioOverview(user.id);
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to load portfolio" };
  }
}

/**
 * Creates an NGN funding order returning virtual bank account details.
 */
export async function createFundingSessionAction(
  prevState: any,
  formData: FormData
): Promise<ActionResponse<FundingOrderOutput>> {
  try {
    const user = await getAuthenticatedUser();
    const amountNgn = String(formData.get("amount") || "").trim();
    const paymentMethod = (formData.get("paymentMethod") as any) || "VIRTUAL_ACCOUNT";

    if (!amountNgn) {
      return { success: false, error: "Please enter an amount to fund" };
    }

    const order = await fundingService.createFundingOrder({
      userId: user.id,
      userEmail: user.email || "customer@apexwallet.ng",
      userName: user.user_metadata?.full_name || "Valued Customer",
      amountNgn,
      paymentMethod,
    });

    return { success: true, data: order };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to create funding session" };
  }
}

/**
 * Retrieves or provisions a user deposit address for a given asset and network.
 */
export async function getDepositAddressAction(
  asset: string,
  network: string
): Promise<ActionResponse<DepositAddressOutput>> {
  try {
    const user = await getAuthenticatedUser();
    const result = await depositService.getOrCreateDepositAddress({
      userId: user.id,
      asset,
      network,
    });
    return { success: true, data: result };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to generate deposit address" };
  }
}

/**
 * Fetches recent deposits and confirmations for the authenticated user.
 */
export async function getUserDepositsAction(): Promise<ActionResponse<CryptoDepositRecord[]>> {
  try {
    const user = await getAuthenticatedUser();
    const deposits = await depositService.getUserDeposits(user.id);
    return { success: true, data: deposits };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to fetch deposits" };
  }
}

/**
 * Fetches complete ledger transaction history for the user.
 */
export async function getTransactionHistoryAction(
  limit: number = 50
): Promise<ActionResponse<LedgerTransactionSummary[]>> {
  try {
    const user = await getAuthenticatedUser();
    const history = await ledgerService.getUserTransactions(user.id, limit);
    return { success: true, data: history };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to fetch transaction history" };
  }
}

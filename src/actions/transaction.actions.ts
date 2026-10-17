"use server";

import { createServerClient } from "@/lib/supabase/server";
import { transferService, ResolvedRecipient, TransferResult } from "@/lib/services/transfer.service";
import { withdrawalService, WithdrawalFeeQuote, WithdrawalExecutionResult } from "@/lib/services/withdrawal.service";
import { swapService, SwapQuoteResult, SwapExecutionReceipt } from "@/lib/services/swap.service";
import { ledgerService, LedgerTransactionSummary } from "@/lib/services/ledger.service";
import { notificationService, InAppNotification } from "@/lib/services/notification.service";
import { AppError } from "@/lib/errors";

export interface ActionResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

async function getAuthenticatedUser() {
  const supabase = await createServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new AppError("Authentication required", "UNAUTHENTICATED", 401);
  }
  return user;
}

// ==========================================
// A. INTERNAL USER-TO-USER TRANSFERS
// ==========================================

export async function resolveRecipientAction(
  identifier: string
): Promise<ActionResponse<ResolvedRecipient>> {
  try {
    const user = await getAuthenticatedUser();
    const recipient = await transferService.resolveRecipient(user.id, identifier);
    return { success: true, data: recipient };
  } catch (err: any) {
    return { success: false, error: err.message || "Recipient not found" };
  }
}

export async function executeTransferAction(params: {
  recipientId: string;
  asset: string;
  amount: string;
  idempotencyKey: string;
  note?: string;
}): Promise<ActionResponse<TransferResult>> {
  try {
    const user = await getAuthenticatedUser();
    const result = await transferService.executeTransfer({
      senderId: user.id,
      recipientId: params.recipientId,
      asset: params.asset,
      amount: params.amount,
      idempotencyKey: params.idempotencyKey,
      note: params.note,
    });
    return { success: true, data: result };
  } catch (err: any) {
    return { success: false, error: err.message || "Transfer failed" };
  }
}

// ==========================================
// B. EXTERNAL CRYPTO WITHDRAWALS
// ==========================================

export async function getWithdrawalFeeQuoteAction(
  asset: string,
  network: string
): Promise<ActionResponse<WithdrawalFeeQuote>> {
  try {
    await getAuthenticatedUser();
    const quote = await withdrawalService.getWithdrawalFeeQuote(asset, network);
    return { success: true, data: quote };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to calculate withdrawal fees" };
  }
}

export async function executeWithdrawalAction(params: {
  asset: string;
  network: string;
  destinationAddress: string;
  amount: string;
  idempotencyKey: string;
  pin?: string;
}): Promise<ActionResponse<WithdrawalExecutionResult>> {
  try {
    const user = await getAuthenticatedUser();

    // Payment PIN validation if set on user profile/metadata
    const expectedPin = user.user_metadata?.payment_pin;
    if (expectedPin) {
      if (!params.pin || params.pin.trim() !== expectedPin) {
        return { success: false, error: "Invalid payment PIN. Please check your PIN and try again." };
      }
    }

    const result = await withdrawalService.executeWithdrawal({
      userId: user.id,
      asset: params.asset,
      network: params.network,
      destinationAddress: params.destinationAddress,
      amount: params.amount,
      idempotencyKey: params.idempotencyKey,
    });
    return { success: true, data: result };
  } catch (err: any) {
    return { success: false, error: err.message || "Withdrawal failed" };
  }
}

export async function getWithdrawalEligibilityAction(): Promise<
  ActionResponse<{ eligible: boolean; reason?: string; remainingHours?: number }>
> {
  try {
    const user = await getAuthenticatedUser();
    const result = await withdrawalService.checkWithdrawalEligibility(user.id);
    return { success: true, data: result };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to check withdrawal eligibility" };
  }
}

// ==========================================
// C. CRYPTO SWAPS (30s RFQ RATE LOCK)
// ==========================================

export async function requestSwapQuoteAction(params: {
  sourceAsset: string;
  destinationAsset: string;
  sourceAmount: string;
}): Promise<ActionResponse<SwapQuoteResult>> {
  try {
    const user = await getAuthenticatedUser();
    const quote = await swapService.requestQuote({
      userId: user.id,
      sourceAsset: params.sourceAsset,
      destinationAsset: params.destinationAsset,
      sourceAmount: params.sourceAmount,
    });
    return { success: true, data: quote };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to generate swap quote" };
  }
}

export async function executeSwapAction(params: {
  quoteId: string;
  idempotencyKey: string;
}): Promise<ActionResponse<SwapExecutionReceipt>> {
  try {
    const user = await getAuthenticatedUser();
    const receipt = await swapService.executeSwap({
      userId: user.id,
      quoteId: params.quoteId,
      idempotencyKey: params.idempotencyKey,
    });
    return { success: true, data: receipt };
  } catch (err: any) {
    return { success: false, error: err.message || "Swap execution failed" };
  }
}

// ==========================================
// D. TRANSACTION HISTORY AND DETAILS
// ==========================================

export async function getUserTransactionsAction(options: {
  type?: string;
  asset?: string;
  searchQuery?: string;
  limit?: number;
} = {}): Promise<ActionResponse<{ transactions: LedgerTransactionSummary[]; totalCount: number }>> {
  try {
    const user = await getAuthenticatedUser();
    const result = await ledgerService.getUserTransactionsFiltered(user.id, options);
    return { success: true, data: result };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to fetch transactions" };
  }
}


export async function getTransactionDetailAction(
  txIdOrRef: string
): Promise<ActionResponse<Record<string, unknown>>> {
  try {
    const user = await getAuthenticatedUser();
    const detail = await ledgerService.getTransactionDetail(user.id, txIdOrRef);
    if (!detail) {
      return { success: false, error: "Transaction record not found or access denied" };
    }
    return { success: true, data: detail };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to fetch transaction details" };
  }
}

// ==========================================
// E. IN-APP NOTIFICATIONS
// ==========================================

export async function getNotificationsAction(options?: {
  unreadOnly?: boolean;
  limit?: number;
}): Promise<ActionResponse<{ notifications: InAppNotification[]; unreadCount: number }>> {
  try {
    const user = await getAuthenticatedUser();
    const data = await notificationService.getNotifications(user.id, options);
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to load notifications" };
  }
}

export async function markNotificationReadAction(
  notificationId: string
): Promise<ActionResponse<boolean>> {
  try {
    const user = await getAuthenticatedUser();
    const success = await notificationService.markAsRead(user.id, notificationId);
    return { success: true, data: success };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to update notification" };
  }
}

export async function markAllNotificationsReadAction(): Promise<ActionResponse<boolean>> {
  try {
    const user = await getAuthenticatedUser();
    const success = await notificationService.markAllAsRead(user.id);
    return { success: true, data: success };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to mark notifications read" };
  }
}

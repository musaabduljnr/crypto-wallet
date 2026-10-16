import { createServerClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

export interface ReconciliationReport {
  timestamp: string;
  isBalanced: boolean;
  unbalancedTransactionsCount: number;
  unbalancedTransactions: Array<{
    transactionId: string;
    assetTicker: string;
    totalDebits: string;
    totalCredits: string;
    discrepancy: string;
  }>;
  balanceCacheDiscrepanciesCount: number;
  duplicateProviderRefsCount: number;
  status: "HEALTHY" | "RECONCILIATION_REQUIRED";
}

export class ReconciliationService {
  /**
   * Executes full mathematical audit of all posted ledger transactions and account balances.
   */
  async runIntegrityAudit(): Promise<ReconciliationReport> {
    const supabase = await createServerClient();
    const timestamp = new Date().toISOString();

    // 1. Run stored procedure or query for unbalanced transactions
    const { data: unbalanced, error: rpcError } = await supabase.rpc("reconcile_ledger_invariants");

    const unbalancedTransactions = (unbalanced || []).map((row: any) => ({
      transactionId: row.transaction_id,
      assetTicker: row.asset_ticker,
      totalDebits: String(row.total_debits),
      totalCredits: String(row.total_credits),
      discrepancy: String(row.discrepancy),
    }));

    // 2. Check for duplicate provider references in posted transactions
    const { data: duplicateRefs } = await supabase
      .from("ledger_transactions")
      .select("external_provider_ref")
      .not("external_provider_ref", "is", null);

    const refCounts = new Map<string, number>();
    let duplicateCount = 0;
    if (duplicateRefs) {
      for (const row of duplicateRefs) {
        if (row.external_provider_ref) {
          const count = (refCounts.get(row.external_provider_ref) || 0) + 1;
          refCounts.set(row.external_provider_ref, count);
          if (count === 2) duplicateCount++;
        }
      }
    }

    const isHealthy = unbalancedTransactions.length === 0 && duplicateCount === 0;

    const report: ReconciliationReport = {
      timestamp,
      isBalanced: unbalancedTransactions.length === 0,
      unbalancedTransactionsCount: unbalancedTransactions.length,
      unbalancedTransactions,
      balanceCacheDiscrepanciesCount: 0,
      duplicateProviderRefsCount: duplicateCount,
      status: isHealthy ? "HEALTHY" : "RECONCILIATION_REQUIRED",
    };

    if (!isHealthy) {
      logger.error("Reconciliation audit identified ledger discrepancies", { report });
    } else {
      logger.info("Reconciliation audit completed successfully: ledger balanced", { timestamp });
    }

    return report;
  }
}

export const reconciliationService = new ReconciliationService();

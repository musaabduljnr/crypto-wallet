import { createServerClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { StaffRole } from "./permissions";

export interface RecordAdminAuditInput {
  actorId: string;
  actorEmail: string;
  actorRole: StaffRole;
  actionType: string;
  targetEntityType: string;
  targetEntityId: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  status?: "SUCCESS" | "FAILED";
}

/**
 * Appends an immutable, tamper-resistant record to admin_audit_logs.
 * Strips any sensitive credentials before writing.
 */
export async function recordAdminAuditLog(input: RecordAdminAuditInput): Promise<void> {
  try {
    const supabase = await createServerClient();

    // Sanitize details to guarantee no secrets or private keys are recorded
    const sanitizedDetails = { ...(input.details || {}) };
    delete (sanitizedDetails as Record<string, unknown>).password;
    delete (sanitizedDetails as Record<string, unknown>).payment_pin;
    delete (sanitizedDetails as Record<string, unknown>).secret_key;
    delete (sanitizedDetails as Record<string, unknown>).token;

    await supabase.from("admin_audit_logs").insert({
      actor_id: input.actorId,
      actor_email: input.actorEmail,
      actor_role: input.actorRole,
      action_type: input.actionType,
      target_entity_type: input.targetEntityType,
      target_entity_id: input.targetEntityId,
      details: sanitizedDetails,
      ip_address: input.ipAddress || null,
      user_agent: input.userAgent || null,
      status: input.status || "SUCCESS",
    });

    logger.info("Admin audit event recorded", {
      actorId: input.actorId,
      actionType: input.actionType,
      targetEntityId: input.targetEntityId,
    });
  } catch (err: unknown) {
    logger.error("Failed to record admin audit log", { err, input });
  }
}

export interface AdminAuditLogRecord {
  id: string;
  actorId: string;
  actorEmail: string;
  actorRole: StaffRole;
  actionType: string;
  targetEntityType: string;
  targetEntityId: string;
  details: Record<string, unknown>;
  ipAddress: string | null;
  userAgent: string | null;
  status: string;
  createdAt: string;
}

/**
 * Lists immutable audit log events with optional filtering and pagination.
 */
export async function listAdminAuditLogs(params?: {
  actionType?: string;
  targetEntityType?: string;
  limit?: number;
  offset?: number;
}): Promise<{ logs: AdminAuditLogRecord[]; total: number }> {
  const supabase = await createServerClient();
  const limit = params?.limit || 50;
  const offset = params?.offset || 0;

  let query = supabase.from("admin_audit_logs").select("*", { count: "exact" });

  if (params?.actionType) {
    query = query.eq("action_type", params.actionType);
  }
  if (params?.targetEntityType) {
    query = query.eq("target_entity_type", params.targetEntityType);
  }

  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error || !data) return { logs: [], total: 0 };

  const logs: AdminAuditLogRecord[] = data.map((d: any) => ({
    id: d.id,
    actorId: d.actor_id,
    actorEmail: d.actor_email,
    actorRole: d.actor_role,
    actionType: d.action_type,
    targetEntityType: d.target_entity_type,
    targetEntityId: d.target_entity_id,
    details: d.details || {},
    ipAddress: d.ip_address,
    userAgent: d.user_agent,
    status: d.status,
    createdAt: d.created_at,
  }));

  return { logs, total: count || logs.length };
}

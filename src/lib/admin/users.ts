import { createAdminClient } from "@/lib/supabase/server";
import { AppError } from "@/lib/errors";
import { recordAdminAuditLog } from "./audit";
import { AuthenticatedStaff } from "./auth";
import { ledgerService, LedgerTransactionSummary } from "@/lib/services/ledger.service";
import { AccountRestrictionRecord, getUserRestrictions } from "./restrictions";

export interface AdminUserListItem {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  kycTier: number;
  status: "ACTIVE" | "RESTRICTED" | "SUSPENDED";
  createdAt: string;
  hasActiveRestrictions: boolean;
}

export interface AdminUserDetails {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  stateOfResidence?: string;
  kycTier: number;
  preferredCurrency: string;
  createdAt: string;
  updatedAt: string;
  balances: Record<string, { available: string; reserved: string; pending: string }>;
  restrictions: AccountRestrictionRecord[];
  transactions: LedgerTransactionSummary[];
  notes: AdminNoteRecord[];
}

export interface AdminNoteRecord {
  id: string;
  targetEntityType: string;
  targetEntityId: string;
  authorId: string;
  authorEmail: string;
  noteText: string;
  isConfidential: boolean;
  createdAt: string;
}

export interface CreateAdminUserInput {
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  password?: string;
  kycTier?: number;
}

export interface UpdateAdminUserProfileInput {
  userId: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  stateOfResidence?: string;
  kycTier?: number;
}

/**
 * Lists users with search, pagination, and restriction status indicators.
 */
export async function listAdminUsers(params?: {
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ users: AdminUserListItem[]; total: number }> {
  const supabase = createAdminClient();
  const limit = params?.limit || 25;
  const offset = params?.offset || 0;

  let query = supabase
    .from("user_profiles")
    .select("*, auth_users:id(email, created_at)", { count: "exact" });

  if (params?.search) {
    const s = params.search.trim();
    query = query.or(`first_name.ilike.%${s}%,last_name.ilike.%${s}%,phone_number.ilike.%${s}%`);
  }

  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error || !data) return { users: [], total: 0 };

  // Fetch active restrictions for these users in batch
  const userIds = data.map((d) => d.id);
  const { data: activeRestrictions } = await supabase
    .from("account_restrictions")
    .select("user_id, restriction_type")
    .in("user_id", userIds)
    .eq("status", "ACTIVE");

  const restrictedMap = new Map<string, string[]>();
  activeRestrictions?.forEach((r) => {
    const list = restrictedMap.get(r.user_id) || [];
    list.push(r.restriction_type);
    restrictedMap.set(r.user_id, list);
  });

  const users: AdminUserListItem[] = data.map((u: any) => {
    const userRestrictions = restrictedMap.get(u.id) || [];
    const isSuspended = userRestrictions.includes("FULL_SUSPENSION");
    const isRestricted = userRestrictions.length > 0;

    let status: AdminUserListItem["status"] = "ACTIVE";
    if (isSuspended) status = "SUSPENDED";
    else if (isRestricted) status = "RESTRICTED";

    return {
      id: u.id,
      email: u.auth_users?.email || "user@apexwallet.io",
      firstName: u.first_name || "",
      lastName: u.last_name || "",
      phoneNumber: u.phone_number || "",
      kycTier: u.kyc_tier || 1,
      status,
      createdAt: u.created_at,
      hasActiveRestrictions: isRestricted,
    };
  });

  return { users, total: count || users.length };
}

/**
 * Returns comprehensive administrative detail for an individual user.
 */
export async function getAdminUserDetails(userId: string): Promise<AdminUserDetails> {
  const supabase = createAdminClient();

  // 1. Profile & auth data
  const { data: profile, error: profileErr } = await supabase
    .from("user_profiles")
    .select("*, auth_users:id(email)")
    .eq("id", userId)
    .maybeSingle();

  if (profileErr || !profile) {
    throw new AppError("User not found", "USER_NOT_FOUND", 404);
  }

  // 2. Balances across all supported assets via double-entry ledger
  const rawBalances = await ledgerService.getUserBalances(userId);
  const balances: Record<string, { available: string; reserved: string; pending: string }> = {};
  for (const [ticker, b] of Object.entries(rawBalances)) {
    balances[ticker] = {
      available: b.availableBalance,
      reserved: b.reservedBalance,
      pending: b.pendingBalance,
    };
  }

  // 3. Active restrictions
  const restrictions = await getUserRestrictions(userId);

  // 4. Recent ledger transactions
  const transactions = await ledgerService.getUserTransactions(userId, 20);

  // 5. Admin notes
  const notes = await getAdminNotes("USER", userId);

  return {
    id: profile.id,
    email: (profile as any).auth_users?.email || "user@apexwallet.io",
    firstName: profile.first_name,
    lastName: profile.last_name,
    phoneNumber: profile.phone_number,
    stateOfResidence: profile.state_of_residence,
    kycTier: profile.kyc_tier,
    preferredCurrency: profile.preferred_currency,
    createdAt: profile.created_at,
    updatedAt: profile.updated_at,
    balances,
    restrictions,
    transactions,
    notes,
  };
}

/**
 * Creates a new customer account through the administrative workflow.
 */
export async function createAdminUser(
  staff: AuthenticatedStaff,
  input: CreateAdminUserInput
): Promise<{ userId: string; email: string }> {
  const supabase = createAdminClient();

  const tempPassword = input.password || `ApexTemp${Math.random().toString(36).slice(2, 8)}!2026`;

  const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
    email: input.email.trim(),
    password: tempPassword,
    email_confirm: true,
    user_metadata: {
      first_name: input.firstName.trim(),
      last_name: input.lastName.trim(),
      phone_number: input.phoneNumber.trim(),
      created_by_staff_id: staff.id,
    },
  });

  if (authErr || !authData.user) {
    throw new AppError(`Failed to create user identity: ${authErr?.message}`, "USER_CREATION_FAILED", 400);
  }

  const userId = authData.user.id;

  // Ensure profile is created
  await supabase.from("user_profiles").upsert({
    id: userId,
    first_name: input.firstName.trim(),
    last_name: input.lastName.trim(),
    phone_number: input.phoneNumber.trim(),
    kyc_tier: input.kycTier || 1,
    preferred_currency: "USD",
  });

  await recordAdminAuditLog({
    actorId: staff.id,
    actorEmail: staff.email,
    actorRole: staff.role,
    actionType: "USER_CREATED_BY_ADMIN",
    targetEntityType: "USER",
    targetEntityId: userId,
    details: {
      email: input.email,
      firstName: input.firstName,
      lastName: input.lastName,
      kycTier: input.kycTier || 1,
    },
    status: "SUCCESS",
  });

  return { userId, email: input.email };
}

/**
 * Updates approved user profile fields and records before/after audit diff.
 */
export async function updateAdminUserProfile(
  staff: AuthenticatedStaff,
  input: UpdateAdminUserProfileInput
): Promise<void> {
  const supabase = createAdminClient();

  const { data: existing, error: fetchErr } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", input.userId)
    .maybeSingle();

  if (fetchErr || !existing) {
    throw new AppError("User profile not found", "USER_NOT_FOUND", 404);
  }

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.firstName !== undefined) updates.first_name = input.firstName.trim();
  if (input.lastName !== undefined) updates.last_name = input.lastName.trim();
  if (input.phoneNumber !== undefined) updates.phone_number = input.phoneNumber.trim();
  if (input.stateOfResidence !== undefined) updates.state_of_residence = input.stateOfResidence.trim();
  if (input.kycTier !== undefined) updates.kyc_tier = input.kycTier;

  const { error: updateErr } = await supabase
    .from("user_profiles")
    .update(updates)
    .eq("id", input.userId);

  if (updateErr) {
    throw new AppError(`Failed to update profile: ${updateErr.message}`, "UPDATE_FAILED", 500);
  }

  await recordAdminAuditLog({
    actorId: staff.id,
    actorEmail: staff.email,
    actorRole: staff.role,
    actionType: "USER_PROFILE_UPDATED",
    targetEntityType: "USER",
    targetEntityId: input.userId,
    details: {
      before: {
        firstName: existing.first_name,
        lastName: existing.last_name,
        phoneNumber: existing.phone_number,
        kycTier: existing.kyc_tier,
      },
      after: updates,
    },
    status: "SUCCESS",
  });
}

/**
 * Adds an internal administrative note on a user or transaction.
 */
export async function addAdminNote(
  staff: AuthenticatedStaff,
  params: {
    targetEntityType: "USER" | "TRANSACTION" | "ADJUSTMENT";
    targetEntityId: string;
    noteText: string;
    isConfidential?: boolean;
  }
): Promise<AdminNoteRecord> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("admin_notes")
    .insert({
      target_entity_type: params.targetEntityType,
      target_entity_id: params.targetEntityId,
      author_id: staff.id,
      author_email: staff.email,
      note_text: params.noteText.trim(),
      is_confidential: params.isConfidential || false,
    })
    .select()
    .single();

  if (error || !data) {
    throw new AppError("Failed to add internal note", "NOTE_CREATION_FAILED", 500);
  }

  await recordAdminAuditLog({
    actorId: staff.id,
    actorEmail: staff.email,
    actorRole: staff.role,
    actionType: "ADMIN_NOTE_ADDED",
    targetEntityType: params.targetEntityType,
    targetEntityId: params.targetEntityId,
    details: { noteId: data.id, isConfidential: params.isConfidential },
    status: "SUCCESS",
  });

  return {
    id: data.id,
    targetEntityType: data.target_entity_type,
    targetEntityId: data.target_entity_id,
    authorId: data.author_id,
    authorEmail: data.author_email,
    noteText: data.note_text,
    isConfidential: data.is_confidential,
    createdAt: data.created_at,
  };
}

/**
 * Retrieves internal notes for a target entity.
 */
export async function getAdminNotes(
  targetEntityType: string,
  targetEntityId: string
): Promise<AdminNoteRecord[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("admin_notes")
    .select("*")
    .eq("target_entity_type", targetEntityType)
    .eq("target_entity_id", targetEntityId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data.map((n) => ({
    id: n.id,
    targetEntityType: n.target_entity_type,
    targetEntityId: n.target_entity_id,
    authorId: n.author_id,
    authorEmail: n.author_email,
    noteText: n.note_text,
    isConfidential: n.is_confidential,
    createdAt: n.created_at,
  }));
}

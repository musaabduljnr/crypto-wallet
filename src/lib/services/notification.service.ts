import { createServerClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";

export type NotificationType =
  | "FUNDING_CONFIRMED"
  | "DEPOSIT_DETECTED"
  | "DEPOSIT_CONFIRMED"
  | "TRANSFER_SENT"
  | "TRANSFER_RECEIVED"
  | "WITHDRAWAL_INITIATED"
  | "WITHDRAWAL_CONFIRMED"
  | "WITHDRAWAL_FAILED"
  | "SWAP_COMPLETED"
  | "SECURITY_ALERT";

export interface InAppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  linkUrl?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface UserNotificationPreferences {
  userId: string;
  emailFundingNotifications: boolean;
  emailTransferNotifications: boolean;
  emailWithdrawalNotifications: boolean;
  emailSecurityAlerts: boolean;
  inAppFundingNotifications: boolean;
  inAppTransferNotifications: boolean;
  inAppWithdrawalNotifications: boolean;
}

export class NotificationService {
  /**
   * Safely dispatches an in-app notification from a trusted server-side event.
   * Utilizes idempotencyKey to prevent duplicate notifications during retries.
   */
  async createNotification(params: {
    userId: string;
    title: string;
    message: string;
    type: NotificationType;
    linkUrl?: string;
    idempotencyKey?: string;
    metadata?: Record<string, unknown>;
  }): Promise<InAppNotification | null> {
    try {
      const supabase = await createServerClient();

      // Check idempotency if key provided
      if (params.idempotencyKey) {
        const { data: existing } = await supabase
          .from("notifications")
          .select("id, user_id, title, message, type, is_read, link_url, metadata, created_at")
          .eq("idempotency_key", params.idempotencyKey)
          .maybeSingle();

        if (existing) {
          return {
            id: existing.id,
            userId: existing.user_id,
            title: existing.title,
            message: existing.message,
            type: existing.type as NotificationType,
            isRead: existing.is_read,
            linkUrl: existing.link_url || undefined,
            metadata: existing.metadata,
            createdAt: existing.created_at,
          };
        }
      }

      const { data, error } = await supabase
        .from("notifications")
        .insert({
          user_id: params.userId,
          title: params.title,
          message: params.message,
          type: params.type,
          link_url: params.linkUrl || null,
          idempotency_key: params.idempotencyKey || null,
          metadata: params.metadata || {},
          is_read: false,
        })
        .select("id, user_id, title, message, type, is_read, link_url, metadata, created_at")
        .single();

      if (error) {
        logger.error("Failed to insert notification", { error: error.message, userId: params.userId });
        return null;
      }

      return {
        id: data.id,
        userId: data.user_id,
        title: data.title,
        message: data.message,
        type: data.type as NotificationType,
        isRead: data.is_read,
        linkUrl: data.link_url || undefined,
        metadata: data.metadata,
        createdAt: data.created_at,
      };
    } catch (err: unknown) {
      logger.error("Unexpected error creating notification", { err, userId: params.userId });
      return null;
    }
  }

  /**
   * Retrieves paginated notifications for the specified authenticated user.
   */
  async getNotifications(
    userId: string,
    options: { unreadOnly?: boolean; limit?: number } = {}
  ): Promise<{ notifications: InAppNotification[]; unreadCount: number }> {
    const supabase = await createServerClient();
    const limit = options.limit || 20;

    let query = supabase
      .from("notifications")
      .select("id, user_id, title, message, type, is_read, link_url, metadata, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (options.unreadOnly) {
      query = query.eq("is_read", false);
    }

    const { data: list, error } = await query;
    if (error) {
      logger.error("Failed to load notifications", { error: error.message, userId });
      return { notifications: [], unreadCount: 0 };
    }

    // Query unread count
    const { count } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_read", false);

    const notifications: InAppNotification[] = (list || []).map((row) => ({
      id: row.id,
      userId: row.user_id,
      title: row.title,
      message: row.message,
      type: row.type as NotificationType,
      isRead: row.is_read,
      linkUrl: row.link_url || undefined,
      metadata: row.metadata,
      createdAt: row.created_at,
    }));

    return {
      notifications,
      unreadCount: count || 0,
    };
  }

  /**
   * Marks a single notification as read, enforcing user isolation.
   */
  async markAsRead(userId: string, notificationId: string): Promise<boolean> {
    const supabase = await createServerClient();
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notificationId)
      .eq("user_id", userId);

    return !error;
  }

  /**
   * Marks all notifications as read for a given user.
   */
  async markAllAsRead(userId: string): Promise<boolean> {
    const supabase = await createServerClient();
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("is_read", false);

    return !error;
  }

  /**
   * Retrieves notification preferences for a user, initializing defaults if absent.
   */
  async getPreferences(userId: string): Promise<UserNotificationPreferences> {
    const supabase = await createServerClient();
    const { data } = await supabase
      .from("user_notification_preferences")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (data) {
      return {
        userId: data.user_id,
        emailFundingNotifications: data.email_funding_notifications,
        emailTransferNotifications: data.email_transfer_notifications,
        emailWithdrawalNotifications: data.email_withdrawal_notifications,
        emailSecurityAlerts: data.email_security_alerts,
        inAppFundingNotifications: data.in_app_funding_notifications,
        inAppTransferNotifications: data.in_app_transfer_notifications,
        inAppWithdrawalNotifications: data.in_app_withdrawal_notifications,
      };
    }

    // Default preferences
    return {
      userId,
      emailFundingNotifications: true,
      emailTransferNotifications: true,
      emailWithdrawalNotifications: true,
      emailSecurityAlerts: true,
      inAppFundingNotifications: true,
      inAppTransferNotifications: true,
      inAppWithdrawalNotifications: true,
    };
  }

  /**
   * Updates notification preferences for the user.
   */
  async updatePreferences(
    userId: string,
    updates: Partial<Omit<UserNotificationPreferences, "userId">>
  ): Promise<UserNotificationPreferences> {
    const supabase = await createServerClient();
    const dbPayload: Record<string, unknown> = {
      user_id: userId,
      updated_at: new Date().toISOString(),
    };

    if (updates.emailFundingNotifications !== undefined) {
      dbPayload.email_funding_notifications = updates.emailFundingNotifications;
    }
    if (updates.emailTransferNotifications !== undefined) {
      dbPayload.email_transfer_notifications = updates.emailTransferNotifications;
    }
    if (updates.emailWithdrawalNotifications !== undefined) {
      dbPayload.email_withdrawal_notifications = updates.emailWithdrawalNotifications;
    }
    if (updates.emailSecurityAlerts !== undefined) {
      dbPayload.email_security_alerts = updates.emailSecurityAlerts;
    }
    if (updates.inAppFundingNotifications !== undefined) {
      dbPayload.in_app_funding_notifications = updates.inAppFundingNotifications;
    }
    if (updates.inAppTransferNotifications !== undefined) {
      dbPayload.in_app_transfer_notifications = updates.inAppTransferNotifications;
    }
    if (updates.inAppWithdrawalNotifications !== undefined) {
      dbPayload.in_app_withdrawal_notifications = updates.inAppWithdrawalNotifications;
    }

    const { data, error } = await supabase
      .from("user_notification_preferences")
      .upsert(dbPayload)
      .select("*")
      .single();

    if (error || !data) {
      logger.error("Failed to update notification preferences", { error, userId });
      return this.getPreferences(userId);
    }

    return {
      userId: data.user_id,
      emailFundingNotifications: data.email_funding_notifications,
      emailTransferNotifications: data.email_transfer_notifications,
      emailWithdrawalNotifications: data.email_withdrawal_notifications,
      emailSecurityAlerts: data.email_security_alerts,
      inAppFundingNotifications: data.in_app_funding_notifications,
      inAppTransferNotifications: data.in_app_transfer_notifications,
      inAppWithdrawalNotifications: data.in_app_withdrawal_notifications,
    };
  }
}

export const notificationService = new NotificationService();

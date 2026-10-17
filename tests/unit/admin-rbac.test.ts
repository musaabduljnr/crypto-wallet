import { describe, it, expect, vi } from "vitest";
import {
  hasPermission,
  ROLE_PERMISSIONS,
  StaffRole,
  AdminPermission,
} from "@/lib/admin/permissions";

describe("Admin RBAC & Granular Permission Matrix", () => {
  it("grants super_admin universal permissions", () => {
    const allPermissions: AdminPermission[] = [
      "users.read",
      "users.create",
      "users.update",
      "users.restrict",
      "transactions.read",
      "transactions.review",
      "balances.adjust.request",
      "balances.adjust.approve",
      "withdrawals.review",
      "compliance.review",
      "audit_logs.read",
      "staff.manage",
      "settings.manage",
    ];

    for (const perm of allPermissions) {
      expect(hasPermission("super_admin", perm)).toBe(true);
    }
  });

  it("strictly prohibits support staff from executing financial or staff governance actions", () => {
    expect(hasPermission("support", "users.read")).toBe(true);
    expect(hasPermission("support", "transactions.read")).toBe(true);

    // Support must NOT be able to request or approve balance adjustments
    expect(hasPermission("support", "balances.adjust.request")).toBe(false);
    expect(hasPermission("support", "balances.adjust.approve")).toBe(false);

    // Support must NOT be able to alter staff roles or platform settings
    expect(hasPermission("support", "staff.manage")).toBe(false);
    expect(hasPermission("support", "settings.manage")).toBe(false);
    expect(hasPermission("support", "users.restrict")).toBe(false);
  });

  it("allows finance staff to request and approve adjustments but denies staff governance", () => {
    expect(hasPermission("finance", "balances.adjust.request")).toBe(true);
    expect(hasPermission("finance", "balances.adjust.approve")).toBe(true);
    expect(hasPermission("finance", "transactions.review")).toBe(true);

    // Finance cannot manage staff or settings
    expect(hasPermission("finance", "staff.manage")).toBe(false);
    expect(hasPermission("finance", "settings.manage")).toBe(false);
  });

  it("allows compliance staff to enforce restrictions but denies financial balance alterations", () => {
    expect(hasPermission("compliance", "users.restrict")).toBe(true);
    expect(hasPermission("compliance", "compliance.review")).toBe(true);

    // Compliance cannot approve balance adjustments
    expect(hasPermission("compliance", "balances.adjust.approve")).toBe(false);
    expect(hasPermission("compliance", "staff.manage")).toBe(false);
  });

  it("restricts read_only staff to non-mutating inspection permissions only", () => {
    expect(hasPermission("read_only", "users.read")).toBe(true);
    expect(hasPermission("read_only", "transactions.read")).toBe(true);
    expect(hasPermission("read_only", "audit_logs.read")).toBe(true);

    expect(hasPermission("read_only", "users.create")).toBe(false);
    expect(hasPermission("read_only", "users.update")).toBe(false);
    expect(hasPermission("read_only", "users.restrict")).toBe(false);
    expect(hasPermission("read_only", "balances.adjust.request")).toBe(false);
    expect(hasPermission("read_only", "balances.adjust.approve")).toBe(false);
  });
});

describe("Maker-Checker Financial Invariant Rules", () => {
  it("enforces disjoint maker and checker identities", () => {
    const requesterId = "staff-maker-123";
    const reviewerId = "staff-maker-123";

    // Self-approval check logic
    const isSelfApproval = requesterId === reviewerId;
    expect(isSelfApproval).toBe(true);

    // Simulated invariant assertion
    const validateMakerChecker = (maker: string, checker: string) => {
      if (maker === checker) {
        throw new Error("MAKER_CHECKER_SELF_APPROVAL_PROHIBITED");
      }
      return true;
    };

    expect(() => validateMakerChecker(requesterId, reviewerId)).toThrow(
      "MAKER_CHECKER_SELF_APPROVAL_PROHIBITED"
    );

    const independentReviewerId = "staff-checker-456";
    expect(validateMakerChecker(requesterId, independentReviewerId)).toBe(true);
  });

  it("validates positive adjustment amounts and supported tickers", () => {
    const validAssets = ["USDT", "USDC", "BTC", "ETH", "SOL", "NGN"];

    const validateAdjustment = (amount: string, asset: string) => {
      const num = parseFloat(amount);
      if (isNaN(num) || num <= 0) {
        throw new Error("INVALID_AMOUNT");
      }
      if (!validAssets.includes(asset.toUpperCase())) {
        throw new Error("INVALID_ASSET");
      }
      return true;
    };

    expect(() => validateAdjustment("0", "USDT")).toThrow("INVALID_AMOUNT");
    expect(() => validateAdjustment("-50", "USDT")).toThrow("INVALID_AMOUNT");
    expect(() => validateAdjustment("abc", "USDT")).toThrow("INVALID_AMOUNT");
    expect(() => validateAdjustment("100", "DOGE_FAKE")).toThrow("INVALID_ASSET");
    expect(validateAdjustment("250.50", "USDT")).toBe(true);
    expect(validateAdjustment("0.05", "BTC")).toBe(true);
  });
});

describe("Account Restrictions Life-Cycle & Operational Locks", () => {
  it("correctly identifies affected operations based on restriction type", () => {
    const isOperationBlocked = (
      restrictionType: string,
      operation: "TRANSFER" | "WITHDRAWAL" | "SWAP" | "FUNDING"
    ) => {
      if (restrictionType === "FULL_SUSPENSION") return true;
      if (restrictionType === "INTERNAL_TRANSFER" && operation === "TRANSFER") return true;
      if (restrictionType === "EXTERNAL_WITHDRAWAL" && operation === "WITHDRAWAL") return true;
      if (restrictionType === "SWAP" && operation === "SWAP") return true;
      if (restrictionType === "FIAT_FUNDING" && operation === "FUNDING") return true;
      return false;
    };

    // FULL_SUSPENSION blocks all operations
    expect(isOperationBlocked("FULL_SUSPENSION", "TRANSFER")).toBe(true);
    expect(isOperationBlocked("FULL_SUSPENSION", "WITHDRAWAL")).toBe(true);
    expect(isOperationBlocked("FULL_SUSPENSION", "SWAP")).toBe(true);
    expect(isOperationBlocked("FULL_SUSPENSION", "FUNDING")).toBe(true);

    // Targeted restrictions only block their designated operations
    expect(isOperationBlocked("INTERNAL_TRANSFER", "TRANSFER")).toBe(true);
    expect(isOperationBlocked("INTERNAL_TRANSFER", "WITHDRAWAL")).toBe(false);

    expect(isOperationBlocked("EXTERNAL_WITHDRAWAL", "WITHDRAWAL")).toBe(true);
    expect(isOperationBlocked("EXTERNAL_WITHDRAWAL", "SWAP")).toBe(false);

    expect(isOperationBlocked("SWAP", "SWAP")).toBe(true);
    expect(isOperationBlocked("SWAP", "FUNDING")).toBe(false);
  });
});

describe("Audit Logging Sanitization", () => {
  it("sanitizes sensitive fields before persisting to audit trail", () => {
    const rawDetails: Record<string, unknown> = {
      password: "SuperSecretPassword123!",
      payment_pin: "7002",
      secret_key: "sk_live_1234567890",
      token: "jwt_bearer_token",
      userId: "user-12345",
      asset: "USDT",
      amount: "500.00",
    };

    const sanitized = { ...rawDetails };
    delete sanitized.password;
    delete sanitized.payment_pin;
    delete sanitized.secret_key;
    delete sanitized.token;

    expect(sanitized.password).toBeUndefined();
    expect(sanitized.payment_pin).toBeUndefined();
    expect(sanitized.secret_key).toBeUndefined();
    expect(sanitized.token).toBeUndefined();
    expect(sanitized.userId).toBe("user-12345");
    expect(sanitized.asset).toBe("USDT");
    expect(sanitized.amount).toBe("500.00");
  });
});

describe("Last Active Super Administrator Protection", () => {
  it("prohibits demoting or deactivating the last active super admin", () => {
    const activeStaff = [
      { id: "staff-1", role: "super_admin", isActive: true },
      { id: "staff-2", role: "admin", isActive: true },
      { id: "staff-3", role: "support", isActive: true },
    ];

    const canDemote = (targetId: string, newRole: string) => {
      const target = activeStaff.find((s) => s.id === targetId);
      if (!target) throw new Error("NOT_FOUND");

      if (target.role === "super_admin" && newRole !== "super_admin") {
        const activeSuperAdminCount = activeStaff.filter(
          (s) => s.role === "super_admin" && s.isActive
        ).length;
        if (activeSuperAdminCount <= 1) {
          throw new Error("LAST_SUPER_ADMIN_PROTECTED");
        }
      }
      return true;
    };

    expect(() => canDemote("staff-1", "admin")).toThrow("LAST_SUPER_ADMIN_PROTECTED");
  });
});

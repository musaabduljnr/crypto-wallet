import { describe, it, expect } from "vitest";
import {
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  updatePasswordSchema,
} from "@/lib/validation/auth";

describe("Authentication Validation Schemas", () => {
  describe("loginSchema", () => {
    it("accepts valid email and password", () => {
      const result = loginSchema.safeParse({
        email: "user@example.ng",
        password: "ValidPassword123!",
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid email formats", () => {
      const result = loginSchema.safeParse({
        email: "not-an-email",
        password: "ValidPassword123!",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toContain("valid email");
      }
    });

    it("rejects empty password", () => {
      const result = loginSchema.safeParse({
        email: "user@example.ng",
        password: "",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("registerSchema", () => {
    const validData = {
      firstName: "Chidi",
      lastName: "Bakare",
      email: "chidi@example.ng",
      phoneNumber: "08012345678",
      password: "StrongPassword123!",
      termsAccepted: true,
    };

    it("accepts valid Nigerian registration payload", () => {
      const result = registerSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it("accepts +234 international Nigerian phone format", () => {
      const result = registerSchema.safeParse({
        ...validData,
        phoneNumber: "+2348012345678",
      });
      expect(result.success).toBe(true);
    });

    it("accepts +1 international US phone format", () => {
      const result = registerSchema.safeParse({
        ...validData,
        phoneNumber: "+12025551234",
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid phone numbers", () => {
      const result = registerSchema.safeParse({
        ...validData,
        phoneNumber: "12345",
      });
      expect(result.success).toBe(false);
    });

    it("enforces strong password policy (rejects missing special char or numbers)", () => {
      const noNumber = registerSchema.safeParse({
        ...validData,
        password: "NoNumberPassword!",
      });
      expect(noNumber.success).toBe(false);

      const noSpecial = registerSchema.safeParse({
        ...validData,
        password: "NoSpecialPassword1",
      });
      expect(noSpecial.success).toBe(false);

      const shortPassword = registerSchema.safeParse({
        ...validData,
        password: "P1!",
      });
      expect(shortPassword.success).toBe(false);
    });

    it("enforces terms of service acceptance", () => {
      const result = registerSchema.safeParse({
        ...validData,
        termsAccepted: false,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("updatePasswordSchema", () => {
    it("accepts matching strong passwords", () => {
      const result = updatePasswordSchema.safeParse({
        password: "NewStrongPassword123!",
        confirmPassword: "NewStrongPassword123!",
      });
      expect(result.success).toBe(true);
    });

    it("rejects mismatched passwords", () => {
      const result = updatePasswordSchema.safeParse({
        password: "NewStrongPassword123!",
        confirmPassword: "DifferentPassword123!",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0].message).toBe("Passwords do not match");
      }
    });
  });
});

import { describe, it, expect } from "vitest";
import { formatCurrency, cn } from "@/lib/utils";

describe("Design System & Utility Tests", () => {
  describe("cn helper", () => {
    it("merges conditional class names correctly", () => {
      expect(cn("px-4 py-2", true && "bg-primary", false && "text-white")).toBe("px-4 py-2 bg-primary");
    });

    it("resolves conflicting Tailwind utilities", () => {
      expect(cn("px-2", "px-4")).toBe("px-4");
      expect(cn("bg-red-500", "bg-emerald-600")).toBe("bg-emerald-600");
    });
  });

  describe("formatCurrency utility", () => {
    it("formats NGN amounts with 2 decimals and commas without floating point errors", () => {
      expect(formatCurrency("1425850.00", "NGN")).toBe("₦1,425,850.00");
      expect(formatCurrency("50000", "NGN")).toBe("₦50,000.00");
      expect(formatCurrency("100.5", "NGN")).toBe("₦100.50");
    });

    it("formats USDT amounts with 2 decimals", () => {
      expect(formatCurrency("100.00", "USDT")).toBe("₮100.00");
      expect(formatCurrency("1250.75", "USDT")).toBe("₮1,250.75");
    });

    it("formats ETH amounts with 6 decimals", () => {
      expect(formatCurrency("1.5", "ETH")).toBe("Ξ1.500000");
      expect(formatCurrency("0.004523", "ETH")).toBe("Ξ0.004523");
    });

    it("safely handles invalid or empty values", () => {
      expect(formatCurrency("", "NGN")).toBe("0.00");
      expect(formatCurrency("invalid", "NGN")).toBe("0.00");
    });
  });
});

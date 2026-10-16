import { describe, it, expect } from "vitest";
import { sanitizeReturnUrl } from "@/lib/utils/redirects";

describe("Open-Redirect Sanitizer (sanitizeReturnUrl)", () => {
  it("allows safe internal application routes", () => {
    expect(sanitizeReturnUrl("/dashboard")).toBe("/dashboard");
    expect(sanitizeReturnUrl("/dashboard/settings")).toBe("/dashboard/settings");
    expect(sanitizeReturnUrl("/dashboard/receive?asset=USDT")).toBe("/dashboard/receive?asset=USDT");
  });

  it("rejects external absolute URLs and falls back to /dashboard", () => {
    expect(sanitizeReturnUrl("https://malicious-site.com")).toBe("/dashboard");
    expect(sanitizeReturnUrl("http://phishing.com/login")).toBe("/dashboard");
  });

  it("rejects protocol-relative URLs (//evil.com)", () => {
    expect(sanitizeReturnUrl("//evil.com")).toBe("/dashboard");
    expect(sanitizeReturnUrl("//google.com/phish")).toBe("/dashboard");
  });

  it("rejects URLs containing backslashes", () => {
    expect(sanitizeReturnUrl("/\\evil.com")).toBe("/dashboard");
    expect(sanitizeReturnUrl("\\evil.com")).toBe("/dashboard");
  });

  it("rejects javascript: and data: schemes", () => {
    expect(sanitizeReturnUrl("javascript:alert(1)")).toBe("/dashboard");
    expect(sanitizeReturnUrl("data:text/html,<script>alert(1)</script>")).toBe("/dashboard");
  });

  it("handles null, undefined and empty strings safely", () => {
    expect(sanitizeReturnUrl(null)).toBe("/dashboard");
    expect(sanitizeReturnUrl(undefined)).toBe("/dashboard");
    expect(sanitizeReturnUrl("")).toBe("/dashboard");
    expect(sanitizeReturnUrl("   ")).toBe("/dashboard");
  });
});

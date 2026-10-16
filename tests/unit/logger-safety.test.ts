import { describe, it, expect, vi } from "vitest";
import { logger } from "@/lib/logger";

describe("Safe Structured Logger & Sanitizer", () => {
  it("scrubs passwords and sensitive credentials from logs", () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    logger.info("User login attempt", {
      email: "user@example.ng",
      password: "SuperSecretPassword123!",
      token: "secret-bearer-token",
    });

    expect(consoleSpy).toHaveBeenCalled();
    const loggedOutput = consoleSpy.mock.calls[0][0];
    const parsed = JSON.parse(loggedOutput);

    expect(parsed.context.email).toBe("user@example.ng");
    expect(parsed.context.password).toBe("[REDACTED]");
    expect(parsed.context.token).toBe("[REDACTED]");

    consoleSpy.mockRestore();
  });

  it("scrubs nested sensitive objects and authorization headers", () => {
    const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    logger.warn("Suspicious request", {
      headers: {
        authorization: "Bearer eyJhbGciOi...",
      },
      bvn: "12345678901",
    });

    const loggedOutput = consoleSpy.mock.calls[0][0];
    const parsed = JSON.parse(loggedOutput);

    expect(parsed.context.headers.authorization).toBe("[REDACTED]");
    expect(parsed.context.bvn).toBe("[REDACTED]");

    consoleSpy.mockRestore();
  });
});

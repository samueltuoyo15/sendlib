import crypto from "crypto";
import { verifyRecoveryCode } from "@/lib/auth/twoFactor";
import { hashToken } from "@/lib/auth/utils";
import { decrypt, encrypt } from "@/lib/encryption";
import { isValidSubscriptionPayment } from "@/lib/paystack/validation";
import { rateLimit } from "@/lib/rateLimit";
import { connectToRedis } from "@/lib/redis";
import { isTrustedBrowserRequest } from "@/lib/requestSecurity";
import User from "@/models/User";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/redis", () => ({ connectToRedis: vi.fn() }));
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("subscription payment validation", () => {
  const user = { id: "owner", email: "owner@example.com" };
  const payment = {
    status: "success",
    amount: 400000,
    currency: "NGN",
    paid_at: new Date(Date.now() - 1000).toISOString(),
    customer: { email: user.email },
    metadata: { userId: user.id },
  };
  beforeEach(() => {
    vi.stubEnv("PAYSTACK_PLAN_CODE", "PLN_pro");
    vi.stubEnv("PAYSTACK_PRO_AMOUNT_KOBO", "400000");
    vi.stubEnv("PAYSTACK_PRO_CURRENCY", "NGN");
  });
  it("accepts the correct payment", () =>
    expect(isValidSubscriptionPayment(payment, user)).toBe(true));
  it.each([
    { metadata: { userId: "another-user" } },
    { amount: 100 },
    { currency: "USD" },
    { status: "failed" },
    { paid_at: "invalid" },
    { paid_at: new Date(Date.now() + 86400000).toISOString() },
    { plan: "PLN_unrelated" },
    { metadata: {}, customer: { email: "another@example.com" } },
  ])("rejects unrelated or invalid payments: %j", (change) => {
    expect(isValidSubscriptionPayment({ ...payment, ...change }, user)).toBe(false);
  });
  it("accepts provider-confirmed recurring payment by matching customer", () => {
    expect(
      isValidSubscriptionPayment({ ...payment, metadata: {}, plan: { plan_code: "PLN_pro" } }, user)
    ).toBe(true);
  });
});

describe("token encryption", () => {
  beforeEach(() => vi.stubEnv("ENCRYPTION_KEY", "ab".repeat(32)));
  it("round trips authenticated encryption", () => {
    const encrypted = encrypt("refresh-token");
    expect(encrypted.startsWith("v2:")).toBe(true);
    expect(decrypt(encrypted)).toBe("refresh-token");
  });
  it("rejects ciphertext tampering", () => {
    const parts = encrypt("refresh-token").split(":");
    parts[3] = (parts[3].startsWith("00") ? "01" : "00") + parts[3].slice(2);
    expect(() => decrypt(parts.join(":"))).toThrow();
  });
  it("still reads existing CBC tokens", () => {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from("ab".repeat(32), "hex"), iv);
    const payload = Buffer.concat([cipher.update("legacy"), cipher.final()]);
    expect(decrypt(`${iv.toString("hex")}:${payload.toString("hex")}`)).toBe("legacy");
  });
  it("rejects malformed encryption keys", () => {
    vi.stubEnv("ENCRYPTION_KEY", "short");
    expect(() => encrypt("token")).toThrow();
  });
});

describe("browser origin protection", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://app.example.com");
    vi.stubEnv("APP_URL", "");
  });
  it("rejects cross-origin browser writes", () => {
    expect(
      isTrustedBrowserRequest(
        new Request("https://app.example.com/api/user", {
          headers: { origin: "https://evil.example.com" },
        })
      )
    ).toBe(false);
  });
  it("rejects cross-site fetches without Origin", () => {
    expect(
      isTrustedBrowserRequest(
        new Request("https://app.example.com/api/user", {
          headers: { "sec-fetch-site": "cross-site" },
        })
      )
    ).toBe(false);
  });
  it("allows app requests and server clients", () => {
    expect(
      isTrustedBrowserRequest(
        new Request("https://app.example.com/api/user", {
          headers: { origin: "https://app.example.com" },
        })
      )
    ).toBe(true);
    expect(isTrustedBrowserRequest(new Request("https://app.example.com/api/user"))).toBe(true);
  });
});

describe("rate limits", () => {
  it("limits auth to ten requests per minute", async () => {
    vi.stubEnv("REDIS_URL", "");
    for (let n = 0; n < 10; n++) expect((await rateLimit("login", "test-user")).success).toBe(true);
    expect((await rateLimit("login", "test-user")).success).toBe(false);
  });
  it("blocks sending if Redis is unavailable", async () => {
    vi.stubEnv("REDIS_URL", "redis://test");
    vi.mocked(connectToRedis).mockImplementation(() => {
      throw new Error("offline");
    });
    expect((await rateLimit("send", "test-key", "pro")).success).toBe(false);
  });
});

it("rejects a recovery code consumed by a concurrent request", async () => {
  vi.spyOn(User, "updateOne").mockResolvedValue({ modifiedCount: 0 } as never);
  const user = {
    _id: "owner",
    twoFactor: { recoveryCodes: [{ hash: hashToken("0123456789ABCDEF") }] },
  };
  expect(await verifyRecoveryCode(user as never, "0123-4567-89AB-CDEF")).toBe(false);
});

describe("bounded JSON parsing", () => {
  it("rejects streamed bodies even without Content-Length", async () => {
    const { readJsonBody } = await import("@/lib/requestBody");
    const request = new Request("https://app.example.com/api/send", {
      method: "POST",
      body: JSON.stringify({ text: "x".repeat(100) }),
    });
    await expect(readJsonBody(request, 20)).rejects.toMatchObject({ status: 413 });
  });
  it("accepts a small valid body", async () => {
    const { readJsonBody } = await import("@/lib/requestBody");
    await expect(
      readJsonBody(
        new Request("https://app.example.com/api/send", {
          method: "POST",
          body: '{"text":"hello"}',
        }),
        100
      )
    ).resolves.toEqual({ text: "hello" });
  });
});

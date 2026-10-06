import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findUser: vi.fn(),
  createSession: vi.fn(),
  request: vi.fn(),
  requireAuth: vi.fn(),
  verifyPayment: vi.fn(),
  gmailCallback: vi.fn(),
  verifyState: vi.fn(),
}));
vi.mock("@/lib/db", () => ({ connectDB: vi.fn() }));
vi.mock("@/models/User", () => ({
  default: { findOne: mocks.findUser, findById: mocks.findUser },
}));
vi.mock("@/lib/auth/sessions", () => ({
  createSession: mocks.createSession,
  PENDING_SESSION_TTL_MS: 600000,
  SESSION_TTL_MS: 604800000,
}));
vi.mock("@/lib/auth", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  requireAuthUser: mocks.requireAuth,
}));
vi.mock("@/lib/axios", () => ({ default: { get: mocks.request, post: mocks.request } }));
vi.mock("@/lib/paystack", () => ({ verifyPaystackTransaction: mocks.verifyPayment }));
vi.mock("@/lib/gmail", () => ({
  handleGmailCallback: mocks.gmailCallback,
  verifyGmailState: mocks.verifyState,
}));

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://app.example.com");
  vi.stubEnv("PAYSTACK_PRO_AMOUNT_KOBO", "400000");
  vi.stubEnv("PAYSTACK_PRO_CURRENCY", "NGN");
  vi.stubEnv("NODE_ENV", "production");
  mocks.createSession.mockResolvedValue({ token: "opaque-token" });
});
afterEach(() => vi.unstubAllEnvs());

function oauthRequest(provider: string) {
  return new NextRequest(
    `https://app.example.com/api/auth/${provider}/callback?code=code&state=state`,
    { headers: { cookie: "oauth_state=state" } }
  );
}

describe.each(["google", "github"])("%s sign-in", (provider) => {
  async function setup(disabled = false, enabled = true) {
    const user = {
      _id: "507f1f77bcf86cd799439011",
      email: "user@example.com",
      disabled,
      twoFactor: { enabled, secret: "encrypted-secret" },
      save: vi.fn(),
    };
    mocks.findUser.mockResolvedValue(user);
    if (provider === "google") {
      mocks.request
        .mockResolvedValueOnce({ data: { access_token: "token" } })
        .mockResolvedValueOnce({
          data: { id: "google-id", email: user.email, verified_email: true },
        });
      return (await import("@/app/api/auth/google/callback/route")).GET;
    }
    mocks.request
      .mockResolvedValueOnce({ data: { access_token: "token" } })
      .mockResolvedValueOnce({ data: { id: 123, login: "user" } })
      .mockResolvedValueOnce({ data: [{ email: user.email, primary: true, verified: true }] });
    return (await import("@/app/api/auth/github/callback/route")).GET;
  }
  it("requires Sendlib's second factor before issuing an active session", async () => {
    const get = await setup();
    const response = await get(oauthRequest(provider));
    expect(mocks.createSession).toHaveBeenCalledWith(
      expect.objectContaining({ status: "pending", ttlMs: 600000 })
    );
    expect(response.cookies.get("pending_2fa")?.value).toBe("true");
    expect(response.cookies.get("logged_in")?.value).toBe("");
    expect(response.headers.get("location")).toBe("https://app.example.com/login?twoFactor=1");
    expect(response.cookies.get("oauth_state")?.value).toBe("");
  });
  it("continues normal OAuth login when 2FA is disabled", async () => {
    const get = await setup(false, false);
    const response = await get(oauthRequest(provider));
    expect(mocks.createSession).toHaveBeenCalledWith(expect.objectContaining({ status: "active" }));
    expect(response.cookies.get("logged_in")?.value).toBe("true");
  });
  it("does not create a session for disabled accounts", async () => {
    const get = await setup(true);
    const response = await get(oauthRequest(provider));
    expect(mocks.createSession).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toContain("account_disabled");
  });
});

it("does not grant Pro for another customer's successful payment", async () => {
  const save = vi.fn();
  const set = vi.fn();
  mocks.requireAuth.mockResolvedValue({
    id: "507f1f77bcf86cd799439011",
    email: "user@example.com",
  });
  mocks.findUser.mockResolvedValue({ plan: "free", save, set });
  mocks.verifyPayment.mockResolvedValue({
    status: "success",
    amount: 400000,
    currency: "NGN",
    paid_at: new Date(Date.now() - 1000).toISOString(),
    metadata: { userId: "another-user" },
    customer: { email: "user@example.com" },
  });
  const { GET } = await import("@/app/api/billing/verify/route");
  const response = await GET(
    new NextRequest("https://app.example.com/api/billing/verify?reference=stolen")
  );
  expect(response.status).toBe(400);
  expect(save).not.toHaveBeenCalled();
  expect(set).not.toHaveBeenCalled();
});

it("rejects a Gmail callback delivered to a different browser", async () => {
  const { GET } = await import("@/app/api/gmail/callback/route");
  const response = await GET(
    new NextRequest("https://app.example.com/api/gmail/callback?code=code&state=state")
  );
  expect(response.headers.get("location")).toContain("invalid_state");
  expect(mocks.gmailCallback).not.toHaveBeenCalled();
});

it("rejects Gmail state belonging to a different Sendlib user", async () => {
  mocks.requireAuth.mockResolvedValue({ id: "current-user" });
  mocks.verifyState.mockReturnValue("another-user");
  const { GET } = await import("@/app/api/gmail/callback/route");
  const response = await GET(
    new NextRequest("https://app.example.com/api/gmail/callback?code=code&state=state", {
      headers: { cookie: "gmail_oauth_state=state" },
    })
  );
  expect(response.headers.get("location")).toContain("invalid_state");
  expect(mocks.gmailCallback).not.toHaveBeenCalled();
});

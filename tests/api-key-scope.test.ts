import { NextRequest } from "next/server";
import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  accountExists: vi.fn(),
  account: vi.fn(),
  key: vi.fn(),
  create: vi.fn(),
  send: vi.fn(),
  enqueue: vi.fn(),
  job: vi.fn(),
}));
vi.mock("@/lib/db", () => ({ connectDB: vi.fn() }));
vi.mock("@/lib/auth", () => ({
  requireAuthUser: async () => ({ id: "507f1f77bcf86cd799439011" }),
}));
vi.mock("@/lib/paystack", () => ({ getEffectiveUserPlan: () => "pro" }));
vi.mock("@/lib/rateLimit", () => ({
  rateLimit: async () => ({ success: true, limit: 100, remaining: 99, resetTimestamp: 0 }),
}));
vi.mock("@/lib/gmail", () => ({
  sendGmailEmail: mocks.send,
  GmailBurstLimitError: class GmailBurstLimitError extends Error {
    retryAfterSeconds: number;
    constructor(senderEmail: string, retryAfterSeconds = 1) {
      super(`Too many concurrent send requests for Gmail account '${senderEmail}'.`);
      this.retryAfterSeconds = retryAfterSeconds;
    }
  },
}));
vi.mock("@/lib/batchWorker", () => ({ enqueueBatchJob: mocks.enqueue }));
vi.mock("argon2", () => ({ default: { verify: async () => true, hash: async () => "hash" } }));
vi.mock("@/models/User", () => ({
  default: { findById: () => ({ lean: async () => ({ plan: "pro" }) }) },
}));
vi.mock("@/models/GmailAccount", () => ({
  default: { exists: mocks.accountExists, findOne: mocks.account, countDocuments: async () => 2 },
}));
vi.mock("@/models/ApiKey", () => ({
  default: {
    find: async () => [mocks.key()],
    findOne: async () => mocks.key(),
    create: mocks.create,
    countDocuments: async () => 0,
  },
}));
vi.mock("@/models/BatchJob", () => ({ default: { create: mocks.job } }));

const owner = "507f1f77bcf86cd799439011";
const keyId = "507f1f77bcf86cd799439012";
let key: {
  _id: string;
  userId: string;
  senderEmail: string | null;
  allowedOrigins: string[];
  save: ReturnType<typeof vi.fn>;
  revoked: boolean;
  keyHash: string;
};
beforeEach(() => {
  vi.clearAllMocks();
  key = {
    _id: keyId,
    userId: owner,
    senderEmail: "assigned@gmail.com",
    allowedOrigins: [],
    save: vi.fn(),
    revoked: false,
    keyHash: "hash",
  };
  mocks.key.mockImplementation(() => key);
  mocks.accountExists.mockResolvedValue({ _id: "account" });
  mocks.account.mockResolvedValue({ gmailEmail: "assigned@gmail.com", connected: true });
  mocks.send.mockResolvedValue({ messageId: "sent" });
  mocks.create.mockImplementation(async (data) => ({ ...data, _id: keyId }));
});
const request = (path: string, body: unknown, method = "POST") =>
  new NextRequest(`https://example.com/api/${path}`, {
    method,
    headers: { "content-type": "application/json", "x-api-key": "sl_prefix_secret" },
    body: JSON.stringify(body),
  });
const payload = { to: "recipient@example.com", subject: "Hello", text: "Test" };

it("creates a restricted key only for an owned connected account", async () => {
  const { POST } = await import("@/app/api/keys/route");
  const response = await POST(
    request("keys", { name: "Client", senderEmail: " Assigned@gmail.com " })
  );
  expect(response.status).toBe(201);
  expect(mocks.accountExists).toHaveBeenCalledWith({
    userId: owner,
    gmailEmail: "assigned@gmail.com",
    connected: true,
  });
  expect(mocks.create).toHaveBeenCalledWith(
    expect.objectContaining({ senderEmail: "assigned@gmail.com" })
  );
  expect((await response.json()).data.senderEmail).toBe("assigned@gmail.com");
});
it("rejects foreign or disconnected accounts without creating a key", async () => {
  mocks.accountExists.mockResolvedValue(null);
  const { POST } = await import("@/app/api/keys/route");
  expect((await POST(request("keys", { senderEmail: "foreign@gmail.com" }))).status).toBe(400);
  expect(mocks.create).not.toHaveBeenCalled();
});
it("rejects malformed scope values", async () => {
  const { validateSenderScope } = await import("@/lib/apiKeyScope");
  for (const value of ["", "Name <assigned@gmail.com>", 123, {}]) {
    await expect(validateSenderScope(owner, value)).rejects.toBeInstanceOf(Response);
  }
  expect(mocks.accountExists).not.toHaveBeenCalled();
});
it("updates an existing key's sender without revoking or regenerating it", async () => {
  const { PATCH } = await import("@/app/api/keys/[id]/route");
  const response = await PATCH(
    request(`keys/${keyId}`, { senderEmail: "new@gmail.com" }, "PATCH"),
    { params: Promise.resolve({ id: keyId }) }
  );
  expect(response.status).toBe(200);
  expect(key.senderEmail).toBe("new@gmail.com");
  expect(key.revoked).toBe(false);
  expect(key.save).toHaveBeenCalledOnce();
});
it("allows explicitly restoring all-account scope", async () => {
  const { PATCH } = await import("@/app/api/keys/[id]/route");
  expect(
    (
      await PATCH(request(`keys/${keyId}`, { senderEmail: null }, "PATCH"), {
        params: Promise.resolve({ id: keyId }),
      })
    ).status
  ).toBe(200);
  expect(key.senderEmail).toBeNull();
  expect(key.revoked).toBe(false);
});
it("single send rejects another sender with 403 before delivery", async () => {
  const { POST } = await import("@/app/api/send/route");
  expect((await POST(request("send", { ...payload, from: "other@gmail.com" }))).status).toBe(403);
  expect(mocks.send).not.toHaveBeenCalled();
});
it("single send defaults to the assigned account when from is omitted", async () => {
  const { POST } = await import("@/app/api/send/route");
  const response = await POST(request("send", payload));
  expect(response.status).toBe(200);
  expect(mocks.send).toHaveBeenCalledWith(
    owner,
    expect.objectContaining({ from: "assigned@gmail.com" })
  );
  expect(mocks.account).not.toHaveBeenCalled();
});
it("returns a retryable 429 when the Gmail burst wait is exhausted", async () => {
  const { GmailBurstLimitError } = await import("@/lib/gmail");
  mocks.send.mockRejectedValueOnce(new GmailBurstLimitError("assigned@gmail.com", 1));
  const { POST } = await import("@/app/api/send/route");
  const response = await POST(request("send", payload));
  expect(response.status).toBe(429);
  expect(response.headers.get("retry-after")).toBe("1");
});
it("allows display names and case differences for the assigned sender", async () => {
  const { POST } = await import("@/app/api/send/route");
  expect(
    (await POST(request("send", { ...payload, from: "Client <ASSIGNED@gmail.com>" }))).status
  ).toBe(200);
});
it("keeps unrestricted legacy keys working with other senders", async () => {
  key.senderEmail = null;
  const { POST } = await import("@/app/api/send/route");
  expect((await POST(request("send", { ...payload, from: "other@gmail.com" }))).status).toBe(200);
});
it("batch rejects a different sender before creating or enqueueing a job", async () => {
  const { POST } = await import("@/app/api/batch/route");
  const response = await POST(
    request("batch", {
      from: "other@gmail.com",
      subject: "Hello",
      text: "Test",
      recipients: [{ email: "recipient@example.com" }],
    })
  );
  expect(response.status).toBe(403);
  expect(mocks.job).not.toHaveBeenCalled();
  expect(mocks.enqueue).not.toHaveBeenCalled();
});

it("rejects multiple sender addresses rather than checking only the first bracketed email", async () => {
  const { POST } = await import("@/app/api/send/route");
  const response = await POST(
    request("send", { ...payload, from: "Allowed <assigned@gmail.com>, Other <other@gmail.com>" })
  );
  expect(response.status).toBeGreaterThanOrEqual(400);
  expect(mocks.send).not.toHaveBeenCalled();
});

it("rejects scope edits to an account the user does not own", async () => {
  mocks.accountExists.mockResolvedValue(null);
  const { PATCH } = await import("@/app/api/keys/[id]/route");
  const response = await PATCH(
    request(`keys/${keyId}`, { senderEmail: "foreign@gmail.com" }, "PATCH"),
    { params: Promise.resolve({ id: keyId }) }
  );
  expect(response.status).toBe(400);
  expect(key.senderEmail).toBe("assigned@gmail.com");
  expect(key.save).not.toHaveBeenCalled();
});

it("creates unrestricted keys when older clients omit the new scope field", async () => {
  const { POST } = await import("@/app/api/keys/route");
  expect((await POST(request("keys", { name: "Legacy" }))).status).toBe(201);
  expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ senderEmail: null }));
});

it("queues a batch from the assigned account", async () => {
  mocks.job.mockResolvedValue({ _id: keyId, total: 1 });
  const { POST } = await import("@/app/api/batch/route");
  const response = await POST(
    request("batch", {
      from: "Client <ASSIGNED@gmail.com>",
      subject: "Hello",
      text: "Test",
      recipients: [{ email: "recipient@example.com" }],
    })
  );
  expect(response.status).toBe(202);
  expect(mocks.account).toHaveBeenCalledWith({ userId: owner, gmailEmail: "assigned@gmail.com" });
  expect(mocks.enqueue).toHaveBeenCalledWith(keyId);
});

it("preserves legacy multiple-address From headers for unrestricted keys", async () => {
  key.senderEmail = null;
  const { POST } = await import("@/app/api/send/route");
  const from = "Allowed <assigned@gmail.com>, Other <other@gmail.com>";
  expect((await POST(request("send", { ...payload, from }))).status).toBe(200);
  expect(mocks.send).toHaveBeenCalledWith(owner, expect.objectContaining({ from }));
});

import { afterEach, beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  user: vi.fn(),
  update: vi.fn(),
  post: vi.fn(),
  account: vi.fn(),
  log: vi.fn(),
  redis: vi.fn(),
  key: vi.fn(),
}));
vi.mock("@/lib/db", () => ({ connectDB: vi.fn() }));
vi.mock("@/lib/axios", () => ({ default: { post: mocks.post } }));
vi.mock("@/lib/encryption", () => ({ decrypt: () => "token", encrypt: (s: string) => s }));
vi.mock("@/lib/redis", () => ({ connectToRedis: mocks.redis }));
vi.mock("@/models/ApiKey", () => ({ default: { findOne: mocks.key } }));
vi.mock("@/models/User", () => ({ default: { findById: mocks.user, updateOne: mocks.update } }));
vi.mock("@/models/GmailAccount", () => ({ default: { findOne: mocks.account } }));
vi.mock("@/models/EmailLog", () => ({
  default: { countDocuments: async () => 0, create: mocks.log },
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NODE_ENV", "development");
  vi.stubEnv("REDIS_URL", "");
  const user = {
    _id: "owner",
    plan: "free",
    monthlySentCount: 3499,
    monthlyLimitResetAt: new Date(Date.now() + 86400000),
  };
  mocks.user.mockImplementation(() =>
    Object.assign(Promise.resolve(user), { select: () => ({ lean: async () => user }) })
  );
  mocks.account.mockResolvedValue({
    gmailEmail: "owner@gmail.com",
    connected: true,
    userId: "owner",
    tokenExpiresAt: new Date(Date.now() + 3600000),
    encryptedAccessToken: "encrypted",
  });
  mocks.post.mockResolvedValue({ data: { id: "message-id" } });
});
afterEach(() => vi.unstubAllEnvs());
const options = {
  from: "owner@gmail.com",
  to: "recipient@example.com",
  subject: "Test",
  text: "Hello",
};

it("does not send if another request already reserved the last monthly slot", async () => {
  mocks.update
    .mockResolvedValueOnce({ modifiedCount: 0 })
    .mockResolvedValueOnce({ modifiedCount: 0 });
  const { sendGmailEmail } = await import("@/lib/gmail");
  await expect(sendGmailEmail("owner", options)).rejects.toThrow("Monthly limit reached");
  expect(mocks.post).not.toHaveBeenCalled();
  expect(mocks.update).toHaveBeenLastCalledWith(
    expect.objectContaining({ monthlySentCount: { $lt: 3500 } }),
    { $inc: { monthlySentCount: 1 } }
  );
});

it("reserves before sending and releases the slot when the provider rejects", async () => {
  mocks.update.mockResolvedValueOnce({ modifiedCount: 0 }).mockResolvedValue({ modifiedCount: 1 });
  mocks.post.mockRejectedValue(new Error("Provider rejected"));
  const { sendGmailEmail } = await import("@/lib/gmail");
  await expect(sendGmailEmail("owner", options)).rejects.toThrow("Provider rejected");
  expect(mocks.update).toHaveBeenLastCalledWith(
    expect.objectContaining({ monthlyLimitResetAt: expect.any(Date) }),
    { $inc: { monthlySentCount: -1 } }
  );
});

it("does not fall back to non-atomic sending caps when production Redis fails", async () => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("REDIS_URL", "redis://test");
  mocks.redis.mockImplementation(() => {
    throw new Error("offline");
  });
  mocks.update.mockResolvedValue({ modifiedCount: 0 });
  const { sendGmailEmail } = await import("@/lib/gmail");
  await expect(sendGmailEmail("owner", options)).rejects.toThrow("Sending temporarily unavailable");
  expect(mocks.post).not.toHaveBeenCalled();
});

it("waits for a Gmail burst slot, then records a retryable pre-send failure", async () => {
  vi.useFakeTimers();
  try {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("REDIS_URL", "redis://test");
    const evalMock = vi.fn(async (script: string) =>
      script.includes('redis.call("INCR"') ? 1 : [0, 1000]
    );
    const decr = vi.fn().mockResolvedValue(0);
    mocks.redis.mockReturnValue({ eval: evalMock, decr });
    mocks.update.mockResolvedValue({ modifiedCount: 0 });

    const { GmailBurstLimitError, sendGmailEmail } = await import("@/lib/gmail");
    const rejection = expect(sendGmailEmail("owner", options)).rejects.toBeInstanceOf(
      GmailBurstLimitError
    );

    await vi.advanceTimersByTimeAsync(3100);
    await rejection;

    expect(mocks.post).not.toHaveBeenCalled();
    expect(decr).toHaveBeenCalledOnce();
    expect(mocks.log).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "owner@gmail.com",
        to: "recipient@example.com",
        status: "failed",
        error: expect.stringContaining("Too many concurrent send requests"),
      })
    );
  } finally {
    vi.useRealTimers();
  }
});

it("continues sending when a Gmail burst slot opens during the wait", async () => {
  vi.useFakeTimers();
  try {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("REDIS_URL", "redis://test");
    let burstChecks = 0;
    const evalMock = vi.fn(async (script: string) => {
      if (script.includes('redis.call("INCR"')) return 1;
      burstChecks += 1;
      return burstChecks === 1 ? [0, 1000] : [1, 0];
    });
    mocks.redis.mockReturnValue({ eval: evalMock, decr: vi.fn() });
    mocks.update
      .mockResolvedValueOnce({ modifiedCount: 0 })
      .mockResolvedValue({ modifiedCount: 1 });

    const { sendGmailEmail } = await import("@/lib/gmail");
    const result = sendGmailEmail("owner", options);
    await vi.advanceTimersByTimeAsync(1100);

    await expect(result).resolves.toMatchObject({ messageId: "message-id" });
    expect(mocks.post).toHaveBeenCalledOnce();
    expect(mocks.log).toHaveBeenCalledWith(expect.objectContaining({ status: "sent" }));
  } finally {
    vi.useRealTimers();
  }
});

it("rechecks sender scope at delivery, including queued jobs after key edits", async () => {
  mocks.key.mockResolvedValue({ senderEmail: "other@gmail.com" });
  const { sendGmailEmail } = await import("@/lib/gmail");
  await expect(sendGmailEmail("owner", { ...options, apiKeyId: "key" })).rejects.toThrow(
    "API key sender scope"
  );
  expect(mocks.post).not.toHaveBeenCalled();
  expect(mocks.update).not.toHaveBeenCalled();
});

it("never falls back when a scoped sender account is disconnected", async () => {
  mocks.account.mockResolvedValue({ gmailEmail: "owner@gmail.com", connected: false });
  const { sendGmailEmail } = await import("@/lib/gmail");
  await expect(sendGmailEmail("owner", { ...options, apiKeyId: "key" })).rejects.toThrow(
    "disconnected"
  );
  expect(mocks.post).not.toHaveBeenCalled();
});

it("delivers through the assigned account after checking the current key scope", async () => {
  mocks.key.mockResolvedValue({ senderEmail: "owner@gmail.com" });
  mocks.update.mockResolvedValueOnce({ modifiedCount: 0 }).mockResolvedValue({ modifiedCount: 1 });
  const { sendGmailEmail } = await import("@/lib/gmail");
  await expect(
    sendGmailEmail("owner", { ...options, from: "Owner <OWNER@gmail.com>", apiKeyId: "key" })
  ).resolves.toMatchObject({ messageId: "message-id" });
  expect(mocks.key).toHaveBeenCalledWith({ _id: "key", userId: "owner", revoked: false });
  expect(mocks.post).toHaveBeenCalledOnce();
});

it("preserves legacy first-account lookup and the original header for unrestricted delivery", async () => {
  mocks.key.mockResolvedValue({ senderEmail: null });
  mocks.update.mockResolvedValueOnce({ modifiedCount: 0 }).mockResolvedValue({ modifiedCount: 1 });
  const { sendGmailEmail } = await import("@/lib/gmail");
  await expect(
    sendGmailEmail("owner", {
      ...options,
      from: "Owner <owner@gmail.com>, Other <other@gmail.com>",
      apiKeyId: "key",
    })
  ).resolves.toMatchObject({ messageId: "message-id" });
  expect(mocks.account).toHaveBeenCalledWith({ userId: "owner", gmailEmail: "owner@gmail.com" });
});

it("rejects a multiple-address header at scoped delivery even when the first address matches", async () => {
  mocks.key.mockResolvedValue({ senderEmail: "owner@gmail.com" });
  const { sendGmailEmail } = await import("@/lib/gmail");
  await expect(
    sendGmailEmail("owner", {
      ...options,
      from: "Owner <owner@gmail.com>, Other <other@gmail.com>",
      apiKeyId: "key",
    })
  ).rejects.toThrow("API key sender scope");
  expect(mocks.post).not.toHaveBeenCalled();
});

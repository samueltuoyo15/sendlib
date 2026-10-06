import crypto from "crypto";
import dns from "dns";
import { assertSenderScope, senderEmailAddress } from "@/lib/apiKeyScope";
import axiosSrv from "@/lib/axios";
import type { DebugIssue, DebugReport, DebugStep } from "@/lib/emailDebugger";
import { buildDebugReport } from "@/lib/emailDebugger";
import { getEffectiveUserPlan } from "@/lib/paystack";
import { connectToRedis } from "@/lib/redis";
import ApiKey from "@/models/ApiKey";
import EmailLog from "@/models/EmailLog";
import GmailAccount from "@/models/GmailAccount";
import User from "@/models/User";
// googleapis removed - all Google API calls use axios directly
import axios, { isAxiosError } from "axios";
import mongoose from "mongoose";
import MailComposer from "nodemailer/lib/mail-composer";
import { connectDB } from "./db";
import { decrypt, encrypt } from "./encryption";

// Fix for Zeabur DNS resolution issue (IPv4 only)
dns.setDefaultResultOrder("ipv4first");
const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, JWT_SECRET } = process.env;

function getGmailCallbackUrl(): string {
  const explicit = process.env.GMAIL_CALLBACK_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (appUrl) return `${appUrl}/api/gmail/callback`;

  throw new Error(
    "Gmail OAuth redirect URI is missing. Set GMAIL_CALLBACK_URL (e.g. http://localhost:3000/api/gmail/callback) or NEXT_PUBLIC_APP_URL."
  );
}

export function buildGoogleAuthUrl(params: Record<string, string>): string {
  const base = "https://accounts.google.com/o/oauth2/v2/auth";
  const query = new URLSearchParams(params).toString();
  return `${base}?${query}`;
}

export function signGmailState(userId: string): string {
  const nonce = crypto.randomBytes(12).toString("hex");
  const timestamp = Date.now();
  const payload = `${userId}:${nonce}:${timestamp}`;
  const hmac = crypto.createHmac("sha256", JWT_SECRET!).update(payload).digest("hex");
  return Buffer.from(`${payload}:${hmac}`).toString("base64url");
}

export function verifyGmailState(state: string): string {
  let decoded: string;
  try {
    decoded = Buffer.from(state, "base64url").toString("utf8");
  } catch {
    throw new Error("Invalid state parameter");
  }
  const parts = decoded.split(":");
  if (parts.length < 4) throw new Error("Invalid state format");

  const hmac = parts[parts.length - 1];
  const payload = parts.slice(0, -1).join(":");
  const timestamp = Number.parseInt(parts[parts.length - 2], 10);
  const userId = parts[0];

  const expected = crypto.createHmac("sha256", JWT_SECRET!).update(payload).digest("hex");
  try {
    if (!crypto.timingSafeEqual(Buffer.from(hmac, "hex"), Buffer.from(expected, "hex"))) {
      throw new Error("State signature mismatch - possible CSRF attempt");
    }
  } catch {
    throw new Error("State signature mismatch - possible CSRF attempt");
  }

  if (
    !Number.isFinite(timestamp) ||
    timestamp > Date.now() ||
    Date.now() - timestamp > 10 * 60 * 1000
  ) {
    throw new Error("OAuth state has expired. Please try connecting your Gmail account again.");
  }

  return userId;
}

export function getGmailAuthUrl(userId: string): string {
  const redirectUri = getGmailCallbackUrl();
  return buildGoogleAuthUrl({
    client_id: GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: "code",
    access_type: "offline",
    prompt: "consent select_account",
    scope: "https://www.googleapis.com/auth/gmail.send email",
    state: signGmailState(userId),
  });
}

export async function handleGmailCallback(code: string, userId: string) {
  await connectDB();

  const tokenRes = await axiosSrv.post(
    "https://oauth2.googleapis.com/token",
    new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID!,
      client_secret: GOOGLE_CLIENT_SECRET!,
      redirect_uri: getGmailCallbackUrl(),
      grant_type: "authorization_code",
    }).toString(),
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
  );

  const tokens = tokenRes.data;
  if (!tokens.access_token) throw new Error("Failed to get access token from Google");

  const userInfoRes = await axiosSrv.get("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });

  const gmailEmail = userInfoRes.data.email;
  if (!gmailEmail) throw new Error("Failed to get Gmail email from Google");

  const tokenExpiresAt = tokens.expires_in
    ? new Date(Date.now() + tokens.expires_in * 1000)
    : new Date(Date.now() + 3600 * 1000);

  const existingAccount = await GmailAccount.findOne({ userId, gmailEmail });
  const isNew = !existingAccount;

  const encryptedRefreshToken = tokens.refresh_token
    ? encrypt(tokens.refresh_token)
    : existingAccount?.encryptedRefreshToken;

  if (!encryptedRefreshToken) {
    throw new Error(
      "No refresh token received from Google. Please revoke app access in your Google Account Security settings and try again."
    );
  }

  await GmailAccount.findOneAndUpdate(
    { userId, gmailEmail },
    {
      userId,
      gmailEmail,
      encryptedAccessToken: encrypt(tokens.access_token),
      encryptedRefreshToken,
      tokenExpiresAt,
      connected: true,
      lastError: null,
    },
    { upsert: true, new: true }
  );

  return { gmailEmail, isNew };
}

export type GmailSendOptions = {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  replyTo?: string;
  cc?: string | string[];
  bcc?: string | string[];
  from?: string;
  apiKeyId?: string | mongoose.Types.ObjectId;
  retentionDays?: number;
  plan?: "free" | "pro";
  attachments?: {
    filename: string;
    content: string;
    type?: string;
  }[];
  templateSlug?: string;
  debug?: {
    issues?: DebugIssue[];
    htmlBytes?: number;
    templateSlug?: string;
    preSteps?: DebugStep[];
  };
};

function finalizeDebug(
  options: GmailSendOptions,
  extraSteps: DebugStep[]
): DebugReport | undefined {
  if (!options.debug && extraSteps.length === 0) return undefined;
  return buildDebugReport({
    issues: options.debug?.issues ?? [],
    steps: [...(options.debug?.preSteps ?? []), ...extraSteps],
    html: options.html,
    text: options.text,
    templateSlug: options.templateSlug ?? options.debug?.templateSlug,
  });
}

const GMAIL_BURST_WINDOW_MS = 1000;
const GMAIL_BURST_MAX_WAIT_MS = 3000;

export class GmailBurstLimitError extends Error {
  readonly retryAfterSeconds: number;

  constructor(senderEmail: string, retryAfterSeconds = 1) {
    super(
      `Too many concurrent send requests for Gmail account '${senderEmail}'. Retry after ${retryAfterSeconds} second${retryAfterSeconds === 1 ? "" : "s"}.`
    );
    this.name = "GmailBurstLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function acquireBurstSlot(
  redis: ReturnType<typeof connectToRedis>,
  burstKey: string,
  burstMax: number
): Promise<boolean> {
  const deadline = Date.now() + GMAIL_BURST_MAX_WAIT_MS;
  const burstScript = `
    local now = tonumber(ARGV[1])
    local window = tonumber(ARGV[2])
    local max = tonumber(ARGV[3])
    redis.call("ZREMRANGEBYSCORE", KEYS[1], 0, now - window)
    local count = redis.call("ZCARD", KEYS[1])
    if count >= max then
      local oldest = redis.call("ZRANGE", KEYS[1], 0, 0, "WITHSCORES")
      local retry = window
      if oldest[2] then retry = math.max(1, tonumber(oldest[2]) + window - now) end
      return {0, retry}
    end
    redis.call("ZADD", KEYS[1], now, now .. "-" .. math.random(1000000))
    redis.call("EXPIRE", KEYS[1], 10)
    return {1, 0}
  `;

  while (true) {
    const result = (await redis.eval(
      burstScript,
      1,
      burstKey,
      Date.now(),
      GMAIL_BURST_WINDOW_MS,
      burstMax
    )) as [number | string, number | string];

    if (Number(result[0]) === 1) return true;

    const remainingMs = deadline - Date.now();
    if (remainingMs <= 0) return false;

    const retryMs = Math.max(1, Number(result[1]) || GMAIL_BURST_WINDOW_MS);
    await sleep(Math.min(retryMs + 25, remainingMs));
  }
}

async function recordPreSendFailure(
  userId: string,
  options: GmailSendOptions,
  senderEmail: string,
  error: Error
): Promise<void> {
  const toAddress = Array.isArray(options.to) ? options.to.join(", ") : options.to;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + (options.retentionDays ?? 5));
  const debug = finalizeDebug(options, [
    {
      key: "gmail",
      label: "Gmail accepted request",
      ok: false,
      skipped: true,
      detail: "Not attempted because Sendlib rejected the request before contacting Gmail.",
    },
    {
      key: "sent",
      label: "Message sent",
      ok: false,
      detail: error.message,
    },
  ]);

  try {
    await EmailLog.create({
      userId,
      apiKeyId: options.apiKeyId,
      from: senderEmail,
      to: toAddress,
      subject: options.subject,
      status: "failed",
      provider: "gmail",
      error: error.message,
      templateSlug: options.templateSlug,
      debug,
      expiresAt,
    });
  } catch (logError) {
    console.error(
      "Failed to record pre-send rejection:",
      logError instanceof Error ? logError.message : logError
    );
  }
}

export async function sendGmailEmail(
  userId: string,
  options: GmailSendOptions
): Promise<{ messageId: string | null; debug?: DebugReport }> {
  await connectDB();

  const lookupEmail = options.from ? senderEmailAddress(options.from) : "";

  let account;
  if (!lookupEmail) {
    throw new Error("The 'from' field is required.");
  }

  account = await GmailAccount.findOne({ userId, gmailEmail: lookupEmail });
  if (!account) {
    throw new Error(
      `Gmail account '${lookupEmail}' is not connected. Please go to your Sendlib dashboard, connect this Gmail account, and try again.`
    );
  }
  if (!account.connected)
    throw new Error(`Gmail account '${account.gmailEmail}' is disconnected. Please reconnect.`);

  const user = await User.findById(userId);
  if (!user || user.disabled) {
    throw new Error("User account is unavailable.");
  }

  if (options.apiKeyId) {
    const key = await ApiKey.findOne({ _id: options.apiKeyId, userId, revoked: false });
    if (!key) throw new Error("API key has been revoked.");
    assertSenderScope(key.senderEmail, options.from ?? "");
  }
  const isPro = getEffectiveUserPlan(user) === "pro";
  if (options.plan === "pro" && !isPro) throw new Error("Pro subscription is no longer active.");

  // Reset the monthly window conditionally so concurrent requests cannot
  // overwrite increments made after another request performed the reset.
  const now = new Date();
  const nextReset = new Date(user.monthlyLimitResetAt ?? now);
  while (nextReset <= now) nextReset.setMonth(nextReset.getMonth() + 1);
  await User.updateOne(
    { _id: user._id, $or: [{ monthlyLimitResetAt: { $lte: now } }, { monthlyLimitResetAt: null }] },
    { $set: { monthlySentCount: 0, monthlyLimitResetAt: nextReset } }
  );

  const senderEmail = account.gmailEmail;
  const isWorkspace =
    !senderEmail.endsWith("@gmail.com") && !senderEmail.endsWith("@googlemail.com");
  const limit = isWorkspace ? (isPro ? 2000 : 1000) : isPro ? 500 : 200;

  // Atomic per-Gmail daily cap using Redis INCR.
  // Key resets naturally via TTL; 25 hours covers timezone drift.
  const utcDate = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const dailyKey = `daily_cap:${senderEmail}:${utcDate}`;
  const burstKey = `gmail_burst:${senderEmail}`;
  // Burst: max 1 send/s for personal Gmail, 2 sends/s for Workspace.
  // A request waits up to 3 seconds for a slot before receiving a retryable 429.
  const burstMax = isWorkspace ? 2 : 1;

  let dailyCountAfterIncr = 0;
  let redisAvailable = false;

  if (process.env.REDIS_URL) {
    try {
      const redis = connectToRedis();

      // Lua script: atomically increment daily counter + set TTL on first call
      const dailyScript = `
        local c = redis.call("INCR", KEYS[1])
        if c == 1 then
          redis.call("EXPIRE", KEYS[1], ARGV[1])
        end
        return c
      `;
      dailyCountAfterIncr = (await redis.eval(dailyScript, 1, dailyKey, 90000)) as number;

      // If we just exceeded the limit, decrement so we don't eat from the
      // counter on a rejected request, then throw.
      if (dailyCountAfterIncr > limit) {
        await redis.decr(dailyKey);
        const limitError = new Error(
          `Daily limit reached: Connected Gmail '${senderEmail}' has already sent ${limit} of its ${limit} daily allowed emails today.${!isPro ? " Upgrade to Pro to unlock higher daily sending limits." : ""}`
        );
        await recordPreSendFailure(userId, options, senderEmail, limitError);
        throw limitError;
      }

      const burstAllowed = await acquireBurstSlot(redis, burstKey, burstMax);
      if (!burstAllowed) {
        // Decrement the daily counter we just incremented
        await redis.decr(dailyKey);
        const burstError = new GmailBurstLimitError(senderEmail);
        await recordPreSendFailure(userId, options, senderEmail, burstError);
        throw burstError;
      }

      redisAvailable = true;
    } catch (err) {
      // Re-throw our own limit/burst errors
      if (
        err instanceof Error &&
        (err.message.startsWith("Daily limit") || err instanceof GmailBurstLimitError)
      ) {
        throw err;
      }
      // Never remove sending caps during a Redis outage.
      const unavailableError = new Error(
        "Sending temporarily unavailable. Please try again later."
      );
      await recordPreSendFailure(userId, options, senderEmail, unavailableError);
      throw unavailableError;
      // Development fallback is used only when Redis is not configured.
    }
  }

  // MongoDB fallback (no Redis, or Redis unavailable). Still blocks, just not race-safe.
  if (!redisAvailable) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Sending temporarily unavailable: Redis is required in production.");
    }
    const startOfToday = new Date();
    startOfToday.setUTCHours(0, 0, 0, 0);
    const sentCount = await EmailLog.countDocuments({
      userId: account.userId,
      from: senderEmail,
      status: "sent",
      createdAt: { $gte: startOfToday },
    });
    if (sentCount >= limit) {
      throw new Error(
        `Daily limit reached: Connected Gmail '${senderEmail}' has already sent ${sentCount} of its ${limit} daily allowed emails today.${!isPro ? " Upgrade to Pro to unlock higher daily sending limits." : ""}`
      );
    }
  }

  const bufferMs = 5 * 60 * 1000;
  let accessToken = decrypt(account.encryptedAccessToken);

  if (account.tokenExpiresAt.getTime() - bufferMs <= Date.now()) {
    try {
      const refreshRes = await axiosSrv.post(
        "https://oauth2.googleapis.com/token",
        new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID!,
          client_secret: GOOGLE_CLIENT_SECRET!,
          refresh_token: decrypt(account.encryptedRefreshToken),
          grant_type: "refresh_token",
        }).toString(),
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
      );
      const refreshed = refreshRes.data;
      if (!refreshed.access_token) throw new Error("Refresh returned no access token");
      account.encryptedAccessToken = encrypt(refreshed.access_token);
      account.tokenExpiresAt = refreshed.expires_in
        ? new Date(Date.now() + refreshed.expires_in * 1000)
        : new Date(Date.now() + 3600 * 1000);
      await account.save();
      accessToken = refreshed.access_token;
    } catch (err) {
      account.connected = false;
      account.lastError = String(err);
      await account.save();
      throw new Error("Gmail token refresh failed. Please reconnect your Gmail account.");
    }
  }

  // Using direct axios instead of googleapis to avoid native fetch IPv4 DNS issues on Zeabur

  const toAddress = Array.isArray(options.to) ? options.to.join(", ") : options.to;
  const ccAddress = options.cc
    ? Array.isArray(options.cc)
      ? options.cc.join(", ")
      : options.cc
    : undefined;
  const bccAddress = options.bcc
    ? Array.isArray(options.bcc)
      ? options.bcc.join(", ")
      : options.bcc
    : undefined;

  const mailOptions = {
    disableFileAccess: true,
    disableUrlAccess: true,
    from: options.from ?? senderEmail,
    to: toAddress,
    cc: ccAddress,
    bcc: bccAddress,
    replyTo: options.replyTo,
    subject: options.subject,
    html: options.html,
    text: options.text,
    attachments: options.attachments?.map((att) => ({
      filename: att.filename,
      content: Buffer.from(att.content, "base64"),
      contentType: att.type,
    })),
  };

  const mail = new MailComposer(mailOptions);
  const messageBuffer = await mail.compile().build();
  const encodedMessage = messageBuffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  // Reserve quota before sending; a conditional increment prevents concurrent
  // requests from crossing the monthly cap. Release only if Gmail rejects.
  const quotaWindow = await User.findById(user._id).select("monthlyLimitResetAt").lean();
  const reservation = await User.updateOne(
    {
      _id: user._id,
      monthlyLimitResetAt: quotaWindow?.monthlyLimitResetAt,
      disabled: { $ne: true },
      ...(!isPro ? { monthlySentCount: { $lt: 3500 } } : {}),
    },
    { $inc: { monthlySentCount: 1 } }
  );
  if (reservation.modifiedCount !== 1)
    throw new Error("Monthly limit reached or account unavailable.");
  let acceptedByGmail = false;
  try {
    const result = await axiosSrv.post(
      "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
      { raw: encodedMessage },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    acceptedByGmail = true;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (options.retentionDays ?? 5));

    const debug = finalizeDebug(options, [
      {
        key: "gmail",
        label: "Gmail accepted request",
        ok: true,
        detail: `Queued through ${senderEmail}.`,
      },
      {
        key: "sent",
        label: "Message sent",
        ok: true,
        detail: result.data.id ? `Message ID ${result.data.id}.` : "Gmail accepted the message.",
      },
    ]);

    await EmailLog.create({
      userId,
      apiKeyId: options.apiKeyId,
      from: senderEmail,
      to: toAddress,
      subject: options.subject,
      status: "sent",
      provider: "gmail",
      messageId: result.data.id ?? null,
      templateSlug: options.templateSlug,
      debug,
      expiresAt,
    });

    return { messageId: result.data.id ?? null, debug };
  } catch (err: unknown) {
    if (!acceptedByGmail) {
      await User.updateOne(
        { _id: user._id, monthlyLimitResetAt: quotaWindow?.monthlyLimitResetAt },
        { $inc: { monthlySentCount: -1 } }
      );
    }
    let errMsg = "Unknown error";
    if (isAxiosError(err)) {
      errMsg = err.response?.data?.error?.message || err.message;
    } else if (err instanceof Error) {
      errMsg = err.message;
    }
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (options.retentionDays ?? 5));
    const debug = finalizeDebug(options, [
      { key: "gmail", label: "Gmail accepted request", ok: false, detail: errMsg },
      { key: "sent", label: "Message sent", ok: false, detail: "Gmail rejected the message." },
    ]);
    await EmailLog.create({
      userId,
      apiKeyId: options.apiKeyId,
      from: senderEmail,
      to: toAddress,
      subject: options.subject,
      status: "failed",
      provider: "gmail",
      error: errMsg,
      templateSlug: options.templateSlug,
      debug,
      expiresAt,
    });
    throw new Error(`Failed to send email via Gmail: ${errMsg}`);
  }
}

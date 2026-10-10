import { isOriginAllowed } from "@/lib/apiKeyOrigins";
import { assertSenderScope, senderEmailAddress } from "@/lib/apiKeyScope";
import { enqueueBatchJob } from "@/lib/batchWorker";
import { connectDB } from "@/lib/db";
import { getEffectiveUserPlan } from "@/lib/paystack";
import { rateLimit } from "@/lib/rateLimit";
import { readJsonBody } from "@/lib/requestBody";
import ApiKey, { IApiKey } from "@/models/ApiKey";
import BatchJob from "@/models/BatchJob";
import EmailLog from "@/models/EmailLog";
import GmailAccount from "@/models/GmailAccount";
import User from "@/models/User";
import argon2 from "argon2";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const MAX_SUBJECT_LENGTH = 998;
const MAX_HTML_BYTES = 5 * 1024 * 1024;
const MAX_TEXT_BYTES = 2 * 1024 * 1024;

function getMaxRecipients(fromEmail: string): number {
  // Workspace accounts get 2,000/day from Google; personal Gmail gets 500/day.
  // We cap personal at 450 so users have 50 left over for password resets, etc.
  const isWorkspace = !fromEmail.endsWith("@gmail.com") && !fromEmail.endsWith("@googlemail.com");
  return isWorkspace ? 2000 : 450;
}

const RecipientSchema = z.object({
  email: z.string().email("Each recipient must have a valid email address."),
  variables: z.record(z.string(), z.string()).optional(),
});

const BatchRequestSchema = z.object({
  from: z.string().min(1, "The 'from' field is required."),
  subject: z.string().min(1, "The 'subject' field is required.").max(MAX_SUBJECT_LENGTH),
  recipients: z.array(RecipientSchema).min(1, "At least one recipient is required.").max(5000),
  html: z.string().optional(),
  text: z.string().optional(),
  replyTo: z.string().email().optional(),
});

async function authenticateApiKey(rawKey: string): Promise<{
  userId: string;
  apiKeyId: mongoose.Types.ObjectId;
  matchedKey: IApiKey;
} | null> {
  const parts = rawKey.split("_");
  if (parts.length < 3) return null;

  const prefix = `${parts[0]}_${parts[1]}`;
  const candidates = await ApiKey.find({ keyPrefix: prefix, revoked: false });

  for (const candidate of candidates) {
    const valid = await argon2.verify(candidate.keyHash, rawKey);
    if (valid) {
      candidate.lastUsedAt = new Date();
      await candidate.save();
      return {
        userId: candidate.userId.toString(),
        apiKeyId: candidate._id as mongoose.Types.ObjectId,
        matchedKey: candidate,
      };
    }
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const rawKey =
      req.headers.get("x-api-key") ?? req.headers.get("authorization")?.replace(/^bearer\s+/i, "");

    if (!rawKey) {
      return NextResponse.json(
        {
          success: false,
          message: "API key required. Pass it in the x-api-key header or as a Bearer token.",
        },
        { status: 401 }
      );
    }

    await connectDB();

    const auth = await authenticateApiKey(rawKey);
    if (!auth) {
      return NextResponse.json(
        { success: false, message: "Invalid or revoked API key." },
        { status: 401 }
      );
    }

    const { userId, apiKeyId, matchedKey } = auth;
    if (
      !isOriginAllowed(
        req.headers.get("origin") || req.headers.get("referer"),
        matchedKey.allowedOrigins
      )
    ) {
      return NextResponse.json({ success: false, message: "Origin not allowed." }, { status: 403 });
    }

    // Load user and enforce Pro-only
    const user = await User.findById(userId).lean();
    if (!user || user.disabled) {
      return NextResponse.json(
        { success: false, message: "User account not found." },
        { status: 404 }
      );
    }

    if (getEffectiveUserPlan(user) !== "pro") {
      return NextResponse.json(
        {
          success: false,
          message:
            "Batch sending is a Pro feature. Upgrade at https://sendliberty.com/dashboard/settings to unlock it.",
        },
        { status: 403 }
      );
    }

    const rl = await rateLimit("send", apiKeyId.toString(), "pro");
    if (!rl.success) {
      const waitSeconds = Math.max(0, rl.resetTimestamp - Math.floor(Date.now() / 1000));
      return NextResponse.json(
        { success: false, message: `Rate limit exceeded. Retry in ${waitSeconds}s.` },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": String(rl.limit),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(rl.resetTimestamp),
            "Retry-After": String(waitSeconds),
          },
        }
      );
    }

    // Parse and validate body
    let body: unknown;
    try {
      body = await readJsonBody(req, 8 * 1024 * 1024);
    } catch (err) {
      if (err instanceof Response) return err;
      return NextResponse.json({ success: false, message: "Invalid JSON body." }, { status: 400 });
    }

    const parsed = BatchRequestSchema.safeParse(body);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      const path = first.path.join(".");
      const msg = path
        ? `Invalid input for '${path}': ${first.message}`
        : `Invalid input: ${first.message}`;
      return NextResponse.json({ success: false, message: msg }, { status: 400 });
    }

    const { from, subject, recipients, html, text, replyTo } = parsed.data;

    // Extract raw email from "Display Name <email>" format if needed
    try {
      assertSenderScope(matchedKey.senderEmail, from);
    } catch {
      return NextResponse.json(
        { success: false, message: "API key sender scope does not permit this email account." },
        { status: 403 }
      );
    }
    const fromEmail = senderEmailAddress(from);

    // Synchronous validation: ensure the Gmail account exists and is connected
    const account = await GmailAccount.findOne({ userId, gmailEmail: fromEmail });
    if (!account) {
      return NextResponse.json(
        {
          success: false,
          message: `Gmail account '${fromEmail}' is not connected. Please go to your Sendliberty dashboard, connect this Gmail account, and try again.`,
        },
        { status: 400 }
      );
    }
    if (!account.connected) {
      return NextResponse.json(
        {
          success: false,
          message: `Gmail account '${fromEmail}' is disconnected. Please reconnect it from your dashboard.`,
        },
        { status: 400 }
      );
    }

    const maxRecipients = getMaxRecipients(fromEmail);

    // Calculate how many they've already sent today from this account
    // (Used just to verify connection / general validity, though we no longer hard-block
    // if the batch exceeds this, because the worker handles drip-campaign pausing).
    const startOfToday = new Date();
    startOfToday.setUTCHours(0, 0, 0, 0);

    // We put a hard ceiling of 5,000 recipients per batch just to prevent
    // absolutely massive JSON payloads and DB documents.
    if (recipients.length > 5000) {
      return NextResponse.json(
        {
          success: false,
          message: `Batch too large. You are trying to send to ${recipients.length} recipients at once. The maximum allowed per single batch request is 5,000.`,
        },
        { status: 400 }
      );
    }

    if (!html && !text) {
      return NextResponse.json(
        { success: false, message: "Either 'html' or 'text' is required." },
        { status: 400 }
      );
    }

    if (html && Buffer.byteLength(html, "utf8") > MAX_HTML_BYTES) {
      return NextResponse.json(
        { success: false, message: "HTML body exceeds the 5MB limit." },
        { status: 413 }
      );
    }

    if (text && Buffer.byteLength(text, "utf8") > MAX_TEXT_BYTES) {
      return NextResponse.json(
        { success: false, message: "Text body exceeds the 2MB limit." },
        { status: 413 }
      );
    }

    // Deduplicate recipients by email
    const seen = new Set<string>();
    const deduped = recipients.filter((r) => {
      const key = r.email.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // 5. Create the job document
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 90);

    const job = await BatchJob.create({
      userId: new mongoose.Types.ObjectId(userId),
      apiKeyId,
      from,
      subject,
      html,
      text,
      replyTo,
      status: "queued",
      recipients: deduped.map((r) => ({
        email: r.email,
        variables: r.variables ?? {},
        status: "pending",
      })),
      total: deduped.length,
      sent: 0,
      failed: 0,
      expiresAt,
    });

    // 6. Push the job ID into the Redis queue - worker picks it up immediately
    await enqueueBatchJob(job._id.toString());
    console.log(`[API /batch] Successfully created and enqueued job: ${job._id.toString()}`);

    return NextResponse.json(
      {
        success: true,
        batchId: job._id.toString(),
        total: job.total,
        status: "queued",
        message: `Batch job queued. ${job.total} email(s) will be sent. Poll /api/batch/${job._id} for progress.`,
      },
      {
        status: 202,
        headers: {
          "X-RateLimit-Limit": String(rl.limit),
          "X-RateLimit-Remaining": String(rl.remaining),
          "X-RateLimit-Reset": String(rl.resetTimestamp),
        },
      }
    );
  } catch (err) {
    console.error("/api/batch POST error:", err);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}

import { isOriginAllowed } from "@/lib/apiKeyOrigins";
import { assertSenderScope } from "@/lib/apiKeyScope";
import { connectDB } from "@/lib/db";
import { type DebugStep, analyzeHtmlIssues } from "@/lib/emailDebugger";
import { GmailBurstLimitError, sendGmailEmail } from "@/lib/gmail";
import { getEffectiveUserPlan } from "@/lib/paystack";
import { rateLimit } from "@/lib/rateLimit";
import { readJsonBody } from "@/lib/requestBody";
import { interpolate, isValidSlug } from "@/lib/templates";
import ApiKey, { IApiKey } from "@/models/ApiKey";
import EmailTemplate from "@/models/EmailTemplate";
import GmailAccount from "@/models/GmailAccount";
import User from "@/models/User";
import argon2 from "argon2";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

const MAX_SUBJECT_LENGTH = 998;
const MAX_RECIPIENTS = 50;
const MAX_TOTAL_ATTACHMENT_BYTES = 25 * 1024 * 1024;

const PLAN_LIMITS = {
  free: {
    maxHtmlBytes: 2 * 1024 * 1024,
    maxTextBytes: 1 * 1024 * 1024,
    maxAttachments: 5,
    maxAttachmentBytes: 1 * 1024 * 1024,
  },
  pro: {
    maxHtmlBytes: 5 * 1024 * 1024,
    maxTextBytes: 2 * 1024 * 1024,
    maxAttachments: 20,
    maxAttachmentBytes: 10 * 1024 * 1024,
  },
};

function toArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String);
  if (typeof v === "string" && v.trim()) return [v];
  return [];
}

export async function POST(req: NextRequest) {
  try {
    const rawKey =
      req.headers.get("x-api-key") ?? req.headers.get("authorization")?.replace(/^bearer\s+/i, "");

    if (!rawKey) {
      return NextResponse.json(
        {
          success: false,
          message:
            "API key required. Pass it in the x-api-key header or as a Bearer token in the Authorization header.",
        },
        { status: 401 }
      );
    }

    await connectDB();

    const parts = rawKey.split("_");
    if (parts.length < 3) {
      return NextResponse.json(
        { success: false, message: "Invalid API key format." },
        { status: 401 }
      );
    }
    const prefix = `${parts[0]}_${parts[1]}`;

    const candidates = await ApiKey.find({ keyPrefix: prefix, revoked: false });
    let authenticatedUserId: string | null = null;
    let apiKeyId: mongoose.Types.ObjectId | null = null;
    let matchedKey: IApiKey | null = null;

    for (const candidate of candidates) {
      const valid = await argon2.verify(candidate.keyHash, rawKey);
      if (valid) {
        authenticatedUserId = candidate.userId.toString();
        apiKeyId = candidate._id as mongoose.Types.ObjectId;
        matchedKey = candidate;
        candidate.lastUsedAt = new Date();
        await candidate.save();
        break;
      }
    }

    if (!authenticatedUserId || !matchedKey) {
      return NextResponse.json(
        { success: false, message: "Invalid or revoked API key." },
        { status: 401 }
      );
    }

    const user = await User.findById(authenticatedUserId).lean();
    if (!user || user.disabled) {
      return NextResponse.json(
        { success: false, message: "User account not found." },
        { status: 404 }
      );
    }

    // --- Rate limit ---
    const plan = getEffectiveUserPlan(user);
    const rl = await rateLimit("send", apiKeyId?.toString() || "unknown", plan);

    if (!rl.success) {
      const waitSeconds = Math.max(0, rl.resetTimestamp - Math.floor(Date.now() / 1000));
      return NextResponse.json(
        {
          success: false,
          message: `Rate limit exceeded. You can send up to ${rl.limit} requests/minute per API key. Try again in ${waitSeconds} second${waitSeconds === 1 ? "" : "s"}.`,
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": String(rl.limit),
            "X-RateLimit-Remaining": String(rl.remaining),
            "X-RateLimit-Reset": String(rl.resetTimestamp),
            "Retry-After": String(waitSeconds),
          },
        }
      );
    }

    // --- Origin restriction ---
    if (matchedKey.allowedOrigins && matchedKey.allowedOrigins.length > 0) {
      const origin = req.headers.get("origin");
      const referer = req.headers.get("referer");
      const clientOrigin = origin || referer || null;

      if (!isOriginAllowed(clientOrigin, matchedKey.allowedOrigins)) {
        return NextResponse.json(
          {
            success: false,
            message: `Origin not allowed: '${clientOrigin || "unknown"}' is not in this API key's allowed origins list. Update it in your Sendliberty dashboard under API Keys.`,
          },
          { status: 403 }
        );
      }
    }

    const body = await readJsonBody(req, 40 * 1024 * 1024);
    const {
      to: rawTo,
      subject: rawSubject,
      html: rawHtml,
      text: rawText,
      replyTo,
      cc: rawCc,
      bcc: rawBcc,
      from: rawFrom,
      attachments,
      template: templateSlug,
      data: templateData,
    } = body as {
      to?: unknown;
      subject?: unknown;
      html?: string;
      text?: string;
      replyTo?: string;
      cc?: string | string[];
      bcc?: string | string[];
      from?: string;
      attachments?: { filename: string; content: string; type?: string }[];
      template?: string;
      data?: Record<string, unknown>;
    };

    const preSteps: DebugStep[] = [
      { key: "received", label: "Request received", ok: true, detail: "POST /api/send accepted." },
    ];

    let from = rawFrom;
    let subject = rawSubject;
    let html = rawHtml;
    const text = rawText;
    let usedTemplateSlug: string | undefined;
    let missingVars: string[] = [];
    let unresolvedVars: string[] = [];

    if (templateSlug) {
      const slug = String(templateSlug).trim().toLowerCase();
      if (!isValidSlug(slug)) {
        return NextResponse.json(
          {
            success: false,
            message: "Invalid template slug. Use lowercase letters, numbers, and hyphens.",
          },
          { status: 400 }
        );
      }
      const tpl = await EmailTemplate.findOne({
        userId: new mongoose.Types.ObjectId(authenticatedUserId),
        slug,
      });
      if (!tpl) {
        return NextResponse.json(
          {
            success: false,
            message: `Unknown template '${slug}'. Create it in Dashboard → Templates, or omit template and send html/subject instead.`,
          },
          { status: 404 }
        );
      }
      const data =
        templateData && typeof templateData === "object" && !Array.isArray(templateData)
          ? templateData
          : {};
      const subjectOut = interpolate(tpl.subject, data);
      const htmlOut = interpolate(tpl.html, data);
      missingVars = [...new Set([...subjectOut.missing, ...htmlOut.missing])];
      unresolvedVars = [...new Set([...subjectOut.unresolved, ...htmlOut.unresolved])];
      if (missingVars.length > 0) {
        return NextResponse.json(
          {
            success: false,
            message: `Template '${slug}' is missing data for: ${missingVars.map((v) => `{{${v}}}`).join(", ")}. Pass them in the data object.`,
            missing: missingVars,
          },
          { status: 400 }
        );
      }
      subject = subjectOut.result;
      html = htmlOut.result;
      usedTemplateSlug = slug;
      preSteps.push({
        key: "template",
        label: "Template rendered",
        ok: true,
        detail: `Built from ${slug}.`,
      });
      preSteps.push({
        key: "variables",
        label: "Variables resolved",
        ok: unresolvedVars.length === 0,
        detail:
          unresolvedVars.length === 0
            ? tpl.variables.length
              ? `Filled ${tpl.variables.join(", ")}.`
              : "No variables in this template."
            : `Still unresolved: ${unresolvedVars.map((v) => `{{${v}}}`).join(", ")}.`,
      });
    } else {
      preSteps.push({
        key: "template",
        label: "Template rendered",
        ok: true,
        skipped: true,
        detail: "Custom html/text used - no template.",
      });
      preSteps.push({
        key: "variables",
        label: "Variables resolved",
        ok: true,
        skipped: true,
        detail: "No template variables to fill.",
      });
    }

    if (!from && matchedKey?.senderEmail) from = matchedKey.senderEmail;
    if (from) assertSenderScope(matchedKey?.senderEmail, from);

    if (!from) {
      const firstAccount = await GmailAccount.findOne({
        userId: new mongoose.Types.ObjectId(authenticatedUserId),
        connected: true,
      }).sort({ createdAt: 1 });
      if (!firstAccount) {
        return NextResponse.json(
          {
            success: false,
            message: "No connected Gmail account. Connect one in the dashboard, or pass from.",
          },
          { status: 400 }
        );
      }
      from = firstAccount.gmailEmail;
    }

    // --- Required fields ---
    if (!rawTo || !subject || !from) {
      return NextResponse.json(
        {
          success: false,
          message: templateSlug
            ? "Missing required fields: to (and from if you have multiple Gmail accounts)."
            : "Missing required fields: from, to, subject.",
        },
        { status: 400 }
      );
    }
    if (!html && !text) {
      return NextResponse.json(
        { success: false, message: "Either html or text body is required (or send a template)." },
        { status: 400 }
      );
    }

    const subjectStr = String(subject);

    // --- Subject length ---
    if (subjectStr.length > MAX_SUBJECT_LENGTH) {
      return NextResponse.json(
        {
          success: false,
          message: `Subject too long. Max ${MAX_SUBJECT_LENGTH} characters (RFC 2822 limit).`,
        },
        { status: 413 }
      );
    }

    // --- Plan-based limits ---
    const planLimits = plan === "pro" ? PLAN_LIMITS.pro : PLAN_LIMITS.free;

    // --- Body size ---
    if (html && Buffer.byteLength(html, "utf8") > planLimits.maxHtmlBytes) {
      const maxMb = plan === "pro" ? "5MB" : "2MB";
      return NextResponse.json(
        {
          success: false,
          message: `HTML body too large. Your ${plan} plan allows up to ${maxMb}.${plan === "free" ? " Upgrade to Pro for larger payloads." : ""}`,
        },
        { status: 413 }
      );
    }
    if (text && Buffer.byteLength(text, "utf8") > planLimits.maxTextBytes) {
      const maxMb = plan === "pro" ? "2MB" : "1MB";
      return NextResponse.json(
        {
          success: false,
          message: `Text body too large. Your ${plan} plan allows up to ${maxMb}.${plan === "free" ? " Upgrade to Pro for larger payloads." : ""}`,
        },
        { status: 413 }
      );
    }

    // --- Recipient counts ---
    const toArr = toArray(rawTo);
    const ccArr = toArray(rawCc);
    const bccArr = toArray(rawBcc);

    if (toArr.length === 0) {
      return NextResponse.json(
        { success: false, message: "At least one 'to' recipient is required." },
        { status: 400 }
      );
    }
    if (toArr.length > MAX_RECIPIENTS) {
      return NextResponse.json(
        { success: false, message: `Too many 'to' recipients. Max ${MAX_RECIPIENTS} per request.` },
        { status: 400 }
      );
    }
    if (ccArr.length > MAX_RECIPIENTS) {
      return NextResponse.json(
        { success: false, message: `Too many 'cc' recipients. Max ${MAX_RECIPIENTS} per request.` },
        { status: 400 }
      );
    }
    if (bccArr.length > MAX_RECIPIENTS) {
      return NextResponse.json(
        {
          success: false,
          message: `Too many 'bcc' recipients. Max ${MAX_RECIPIENTS} per request.`,
        },
        { status: 400 }
      );
    }

    // --- Attachments ---
    if (attachments) {
      if (attachments.length > planLimits.maxAttachments) {
        return NextResponse.json(
          {
            success: false,
            message: `Too many attachments. Your ${plan} plan allows up to ${planLimits.maxAttachments} files per request.${plan === "free" ? " Upgrade to Pro to send more attachments." : ""}`,
          },
          { status: 400 }
        );
      }
      let totalBytes = 0;
      for (const att of attachments) {
        if (!att.filename || !att.content) {
          return NextResponse.json(
            {
              success: false,
              message: "Each attachment requires a filename and a base64-encoded content string.",
            },
            { status: 400 }
          );
        }
        const bytes = Buffer.byteLength(att.content, "base64");
        if (bytes > planLimits.maxAttachmentBytes) {
          const maxMb = plan === "pro" ? "10MB" : "1MB";
          return NextResponse.json(
            {
              success: false,
              message: `Attachment '${att.filename}' is too large. Your ${plan} plan allows up to ${maxMb} per file.${plan === "free" ? " Upgrade to Pro for larger attachments." : ""}`,
            },
            { status: 413 }
          );
        }
        totalBytes += bytes;
      }
      if (totalBytes > MAX_TOTAL_ATTACHMENT_BYTES) {
        return NextResponse.json(
          {
            success: false,
            message: "Total attachment size exceeds the 25MB limit (enforced by Gmail API).",
          },
          { status: 413 }
        );
      }
    }

    const retentionDays = plan === "pro" ? 90 : 5;
    const issues = analyzeHtmlIssues({
      html,
      text,
      subject: subjectStr,
      to: toArr,
      from,
      cc: ccArr,
      bcc: bccArr,
      missingVars,
      unresolvedVars,
      maxHtmlBytes: planLimits.maxHtmlBytes,
      templateSlug: usedTemplateSlug,
    });

    const result = await sendGmailEmail(authenticatedUserId, {
      to: toArr.length === 1 ? toArr[0] : toArr,
      subject: subjectStr,
      html,
      text,
      replyTo,
      cc: ccArr.length > 0 ? ccArr : undefined,
      bcc: bccArr.length > 0 ? bccArr : undefined,
      from,
      attachments,
      apiKeyId: apiKeyId || undefined,
      retentionDays,
      plan: plan as "free" | "pro",
      templateSlug: usedTemplateSlug,
      debug: {
        issues,
        htmlBytes: Buffer.byteLength(html || text || "", "utf8"),
        templateSlug: usedTemplateSlug,
        preSteps,
      },
    });

    return NextResponse.json(
      {
        success: true,
        messageId: result.messageId,
        debug: result.debug
          ? {
              health: result.debug.health,
              warnings: result.debug.issues.filter((i) => i.severity === "warning").length,
              issues: result.debug.issues,
            }
          : undefined,
      },
      {
        headers: {
          "X-RateLimit-Limit": String(rl.limit),
          "X-RateLimit-Remaining": String(rl.remaining),
          "X-RateLimit-Reset": String(rl.resetTimestamp),
        },
      }
    );
  } catch (err) {
    if (err instanceof Response) return err;
    const errMsg = err instanceof Error ? err.message : "Failed to send email";
    console.error("/api/send error:", err);

    let status = 400;
    const errorHeaders: Record<string, string> = {};
    const lower = errMsg.toLowerCase();
    if (err instanceof GmailBurstLimitError) {
      status = 429;
      errorHeaders["Retry-After"] = String(err.retryAfterSeconds);
    } else if (lower.includes("limit reached")) {
      status = 429;
    } else if (
      lower.includes("disconnected") ||
      lower.includes("refresh failed") ||
      lower.includes("permission") ||
      lower.includes("scope") ||
      lower.includes("reconnect") ||
      lower.includes("unauthorized")
    ) {
      status = 403;
    }

    return NextResponse.json(
      { success: false, message: errMsg },
      { status, headers: errorHeaders }
    );
  }
}

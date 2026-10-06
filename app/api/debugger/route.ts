import { requireAuthUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import {
  type DebugStep,
  analyzeHtmlIssues,
  buildDebugReport,
  formatHtmlSize,
} from "@/lib/emailDebugger";
import { sendGmailEmail } from "@/lib/gmail";
import { getEffectiveUserPlan } from "@/lib/paystack";
import { readJsonBody } from "@/lib/requestBody";
import { interpolate, isValidSlug } from "@/lib/templates";
import EmailLog from "@/models/EmailLog";
import EmailTemplate from "@/models/EmailTemplate";
import GmailAccount from "@/models/GmailAccount";
import User from "@/models/User";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuthUser(req);
    await connectDB();

    const dbUser = await User.findById(user.id)
      .select("plan currentPeriodEnd lastPaymentAt subscriptionStatus")
      .lean();
    const effectivePlan = getEffectiveUserPlan(dbUser);
    const retentionDays = effectivePlan === "pro" ? 90 : 5;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - retentionDays);

    const { searchParams } = new URL(req.url);
    const limit = Math.min(50, Math.max(1, Number.parseInt(searchParams.get("limit") ?? "20", 10)));

    const logs = await EmailLog.find({
      userId: new mongoose.Types.ObjectId(user.id),
      createdAt: { $gte: cutoff },
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select("from to subject status messageId error templateSlug debug createdAt")
      .lean();

    return NextResponse.json({
      success: true,
      data: logs.map((log) => ({
        id: log._id.toString(),
        from: log.from,
        to: log.to,
        subject: log.subject,
        status: log.status,
        messageId: log.messageId,
        error: log.error,
        templateSlug: log.templateSlug,
        debug: log.debug ?? null,
        createdAt: log.createdAt,
      })),
    });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("GET /api/debugger error:", err);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuthUser(req);
    await connectDB();
    const body = (await readJsonBody(req, 8 * 1024 * 1024).catch((err) => {
      if (err instanceof Response) throw err;
      return {};
    })) as Record<string, unknown>;
    const shouldSend = body.send === true;

    let html = typeof body.html === "string" ? body.html : "";
    const text = typeof body.text === "string" ? body.text : "";
    let subject = typeof body.subject === "string" ? body.subject : "";
    const to =
      typeof body.to === "string"
        ? body.to
        : Array.isArray(body.to) && body.to.every((value) => typeof value === "string")
          ? (body.to as string[])
          : undefined;
    let from = typeof body.from === "string" ? body.from : "";
    let missingVars: string[] = [];
    let unresolvedVars: string[] = [];
    let templateSlug: string | undefined;

    if (body.template) {
      const slug = String(body.template).trim().toLowerCase();
      if (!isValidSlug(slug)) {
        return NextResponse.json(
          { success: false, message: "Invalid template slug." },
          { status: 400 }
        );
      }
      const tpl = await EmailTemplate.findOne({
        userId: new mongoose.Types.ObjectId(user.id),
        slug,
      });
      if (!tpl) {
        return NextResponse.json(
          { success: false, message: `Unknown template '${slug}'.` },
          { status: 404 }
        );
      }
      const data =
        body.data && typeof body.data === "object" && !Array.isArray(body.data)
          ? (body.data as Record<string, unknown>)
          : {};
      const subjectOut = interpolate(tpl.subject, data);
      const htmlOut = interpolate(tpl.html, data);
      missingVars = [...new Set([...subjectOut.missing, ...htmlOut.missing])];
      unresolvedVars = [...new Set([...subjectOut.unresolved, ...htmlOut.unresolved])];
      if (!html.trim()) html = htmlOut.result;
      if (!subject.trim()) subject = subjectOut.result;
      templateSlug = slug;
    }

    if (!from) {
      const account = await GmailAccount.findOne({
        userId: new mongoose.Types.ObjectId(user.id),
        connected: true,
      }).sort({ createdAt: 1 });
      if (account) from = account.gmailEmail;
    }

    const issues = analyzeHtmlIssues({
      html,
      text,
      subject,
      to,
      from,
      missingVars,
      unresolvedVars,
      templateSlug,
    });

    const preSteps: DebugStep[] = [
      {
        key: "received",
        label: "Request received",
        ok: true,
        detail: shouldSend ? "Dashboard test send accepted." : "Inspected in the dashboard.",
      },
      {
        key: "template",
        label: "Template rendered",
        ok: true,
        detail: templateSlug ? `Built from ${templateSlug}.` : "HTML rendered from the editor.",
      },
      {
        key: "variables",
        label: "Variables resolved",
        ok: missingVars.length === 0 && unresolvedVars.length === 0,
        detail: missingVars.length
          ? `Missing: ${missingVars.map((v) => `{{${v}}}`).join(", ")}.`
          : unresolvedVars.length
            ? `Unresolved: ${unresolvedVars.map((v) => `{{${v}}}`).join(", ")}.`
            : "Placeholders filled from preview data.",
      },
    ];

    if (!shouldSend) {
      const steps = [
        ...preSteps,
        {
          key: "gmail",
          label: "Gmail accepted request",
          ok: true,
          skipped: true,
          detail: "Dry run - Gmail was not called.",
        },
        {
          key: "sent",
          label: "Message sent",
          ok: true,
          skipped: true,
          detail: "Dry run - no email was delivered.",
        },
      ];
      const report = buildDebugReport({ issues, steps, html, text, templateSlug });
      return NextResponse.json({
        success: true,
        sent: false,
        data: { ...report, htmlSize: formatHtmlSize(report.htmlBytes), subject },
      });
    }

    if (!to || (Array.isArray(to) ? to.length === 0 : !String(to).trim())) {
      return NextResponse.json(
        { success: false, message: "Add a recipient to send a test." },
        { status: 400 }
      );
    }
    if (!from) {
      return NextResponse.json(
        { success: false, message: "Connect a Gmail account first, then run the debugger." },
        { status: 400 }
      );
    }
    if (!subject || (!html && !text)) {
      return NextResponse.json(
        { success: false, message: "Subject and HTML are required to send." },
        { status: 400 }
      );
    }
    if (missingVars.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: `Fill ${missingVars.map((v) => `{{${v}}}`).join(", ")} before sending.`,
          missing: missingVars,
        },
        { status: 400 }
      );
    }

    const dbUser = await User.findById(user.id)
      .select("plan currentPeriodEnd lastPaymentAt subscriptionStatus")
      .lean();
    const plan = getEffectiveUserPlan(dbUser);
    const retentionDays = plan === "pro" ? 90 : 5;

    try {
      const result = await sendGmailEmail(user.id, {
        to: Array.isArray(to) ? to : String(to),
        from,
        subject,
        html,
        text: text || undefined,
        templateSlug,
        retentionDays,
        plan,
        debug: {
          issues,
          htmlBytes: Buffer.byteLength(html || text || "", "utf8"),
          templateSlug,
          preSteps,
        },
      });

      const report =
        result.debug ??
        buildDebugReport({
          issues,
          steps: [
            ...preSteps,
            {
              key: "gmail",
              label: "Gmail accepted request",
              ok: true,
              detail: `Queued through ${from}.`,
            },
            {
              key: "sent",
              label: "Message sent",
              ok: true,
              detail: result.messageId
                ? `Message ID ${result.messageId}.`
                : "Gmail accepted the message.",
            },
          ],
          html,
          text,
          templateSlug,
        });

      return NextResponse.json({
        success: true,
        sent: true,
        messageId: result.messageId,
        data: { ...report, htmlSize: formatHtmlSize(report.htmlBytes), subject },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to send test email.";
      const latest = await EmailLog.findOne({
        userId: new mongoose.Types.ObjectId(user.id),
      })
        .sort({ createdAt: -1 })
        .select("debug")
        .lean();

      const report =
        latest?.debug ??
        buildDebugReport({
          issues: [
            ...issues,
            { severity: "error", code: "send_failed", title: "Send failed", hint: message },
          ],
          steps: [
            ...preSteps,
            { key: "gmail", label: "Gmail accepted request", ok: false, detail: message },
            { key: "sent", label: "Message sent", ok: false, detail: "Not delivered." },
          ],
          html,
          text,
          templateSlug,
        });

      return NextResponse.json({
        success: false,
        sent: false,
        message,
        data: { ...report, htmlSize: formatHtmlSize(report.htmlBytes ?? 0), subject },
      });
    }
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("POST /api/debugger error:", err);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}

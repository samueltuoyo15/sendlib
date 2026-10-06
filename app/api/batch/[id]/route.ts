import { connectDB } from "@/lib/db";
import ApiKey from "@/models/ApiKey";
import BatchJob from "@/models/BatchJob";
import User from "@/models/User";
import argon2 from "argon2";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const rawKey =
      req.headers.get("x-api-key") ?? req.headers.get("authorization")?.replace(/^bearer\s+/i, "");

    if (!rawKey) {
      return NextResponse.json({ success: false, message: "API key required." }, { status: 401 });
    }

    await connectDB();

    // Authenticate the API key
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
    for (const candidate of candidates) {
      const valid = await argon2.verify(candidate.keyHash, rawKey);
      if (valid) {
        authenticatedUserId = candidate.userId.toString();
        break;
      }
    }

    if (!authenticatedUserId) {
      return NextResponse.json(
        { success: false, message: "Invalid or revoked API key." },
        { status: 401 }
      );
    }

    const user = await User.findById(authenticatedUserId).select("disabled").lean();
    if (!user || user.disabled) {
      return NextResponse.json(
        { success: false, message: "User account is unavailable." },
        { status: 403 }
      );
    }

    // Resolve the dynamic route param
    const { id } = await params;

    if (!mongoose.isValidObjectId(id)) {
      return NextResponse.json({ success: false, message: "Invalid batch ID." }, { status: 400 });
    }

    // Load job - only return jobs owned by this user (security)
    const job = await BatchJob.findOne({
      _id: new mongoose.Types.ObjectId(id),
      userId: new mongoose.Types.ObjectId(authenticatedUserId),
    })
      .select("status total sent failed createdAt updatedAt recipients")
      .lean();

    if (!job) {
      return NextResponse.json(
        { success: false, message: "Batch job not found or you do not have access to it." },
        { status: 404 }
      );
    }

    // Build a lightweight per-recipient summary (no body content, just status)
    const recipientSummary = job.recipients.map((r) => ({
      email: r.email,
      status: r.status,
      messageId: r.messageId ?? null,
      error: r.error ?? null,
      processedAt: r.processedAt ?? null,
    }));

    const progress = job.total > 0 ? Math.round(((job.sent + job.failed) / job.total) * 100) : 0;

    return NextResponse.json({
      success: true,
      batchId: id,
      status: job.status,
      total: job.total,
      sent: job.sent,
      failed: job.failed,
      progress,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      recipients: recipientSummary,
    });
  } catch (err) {
    console.error("/api/batch/[id] GET error:", err);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}

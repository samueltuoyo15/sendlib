import { requireAuthUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { getEffectiveUserPlan } from "@/lib/paystack";
import EmailLog, { IEmailLog } from "@/models/EmailLog";
import User from "@/models/User";
import mongoose, { FilterQuery } from "mongoose";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuthUser(req);
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(
      100,
      Math.max(1, Number.parseInt(searchParams.get("limit") ?? "20", 10))
    );
    const skip = (page - 1) * limit;

    const search = searchParams.get("search")?.trim() ?? "";
    const status = searchParams.get("status")?.trim() ?? "";
    const from = searchParams.get("from")?.trim() ?? "";

    await connectDB();

    const dbUser = await User.findById(user.id)
      .select("plan currentPeriodEnd lastPaymentAt subscriptionStatus")
      .lean();
    const effectivePlan = getEffectiveUserPlan(dbUser);
    const retentionDays = effectivePlan === "pro" ? 90 : 5;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - retentionDays);

    const query: FilterQuery<IEmailLog> = {
      userId: new mongoose.Types.ObjectId(user.id),
      createdAt: { $gte: cutoff },
    };

    if (status) {
      if (!["sent", "failed"].includes(status)) {
        return NextResponse.json(
          { success: false, message: "Invalid status filter. Must be 'sent' or 'failed'." },
          { status: 400 }
        );
      }
      query.status = status;
    }
    if (from) {
      query.from = from;
    }
    const openedParam = searchParams.get("opened")?.trim();
    if (openedParam === "true") {
      query.opened = true;
    } else if (openedParam === "false") {
      query.opened = false;
    }
    if (search) {
      const escapedSearch = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      query.$or = [
        { to: { $regex: escapedSearch, $options: "i" } },
        { subject: { $regex: escapedSearch, $options: "i" } },
        { from: { $regex: escapedSearch, $options: "i" } },
      ];
    }

    const [logs, total] = await Promise.all([
      EmailLog.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select(
          "from to subject status provider messageId error apiKeyId templateSlug debug trackingId trackOpens opened openCount firstOpenedAt lastOpenedAt openEvents createdAt"
        )
        .lean(),
      EmailLog.countDocuments(query),
    ]);

    return NextResponse.json({
      success: true,
      data: logs.map((log) => ({
        ...log,
        id: log._id.toString(),
      })),
      meta: { page, limit, total, totalPages: Math.ceil(total / limit), retentionDays },
    });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("GET api/logs error:", err);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}

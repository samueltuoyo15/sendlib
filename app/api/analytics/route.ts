import { requireAuthUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import EmailLog from "@/models/EmailLog";
import GmailAccount from "@/models/GmailAccount";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuthUser(req);
    const userId = new mongoose.Types.ObjectId(user.id);
    await connectDB();

    // Fetch connected Gmail accounts
    const accounts = await GmailAccount.find({ userId });

    // Fetch daily cap usage for each connected account (resetting daily at UTC midnight)
    const startOfToday = new Date();
    startOfToday.setUTCHours(0, 0, 0, 0);
    const caps = await Promise.all(
      accounts.map(async (account) => {
        const sentCount = await EmailLog.countDocuments({
          userId,
          from: account.gmailEmail,
          status: "sent",
          createdAt: { $gte: startOfToday },
        });
        const isWorkspace =
          !account.gmailEmail.endsWith("@gmail.com") &&
          !account.gmailEmail.endsWith("@googlemail.com");
        const limit = isWorkspace ? 2000 : 500;
        return {
          email: account.gmailEmail,
          sentCount,
          limit,
          connected: account.connected,
        };
      })
    );

    // Sort caps by highest percentage used descending
    caps.sort((a, b) => b.sentCount / b.limit - a.sentCount / a.limit);

    // Fetch send volume for the last 7 days (grouped by date)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6); // Cover exactly 7 days including today
    sevenDaysAgo.setUTCHours(0, 0, 0, 0);

    const volumeData = await EmailLog.aggregate([
      {
        $match: {
          userId,
          createdAt: { $gte: sevenDaysAgo },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          sent: { $sum: { $cond: [{ $eq: ["$status", "sent"] }, 1, 0] } },
          failed: { $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] } },
          opened: { $sum: { $cond: [{ $or: [{ $eq: ["$opened", true] }, { $gt: ["$openCount", 0] }] }, 1, 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Fill in missing dates with zero values so the frontend always has exactly 7 days
    const volumeMap = new Map(
      volumeData.map((d: { _id: string; sent: number; failed: number; opened?: number }) => [
        d._id,
        { sent: d.sent, failed: d.failed, opened: d.opened || 0 },
      ])
    );
    const formattedVolume = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      const stats = volumeMap.get(dateStr) ?? { sent: 0, failed: 0, opened: 0 };

      // Format date label (e.g. "Jul 08")
      const label = d.toLocaleDateString("en-US", { month: "short", day: "2-digit" });

      formattedVolume.push({
        date: dateStr,
        label,
        sent: stats.sent,
        failed: stats.failed,
        opened: stats.opened || 0,
      });
    }

    const totalSent = volumeData.reduce((acc: number, curr: { sent: number }) => acc + curr.sent, 0);
    const totalOpened = volumeData.reduce((acc: number, curr: { opened?: number }) => acc + (curr.opened || 0), 0);
    const openRate = totalSent > 0 ? Math.round((totalOpened / totalSent) * 100) : 0;

    return NextResponse.json({
      success: true,
      data: {
        caps,
        volume: formattedVolume,
        openRate,
        totalOpened,
      },
    });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error("/api/analytics GET error:", err);
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 });
  }
}

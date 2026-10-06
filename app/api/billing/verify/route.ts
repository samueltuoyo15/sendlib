import { requireAuthUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { verifyPaystackTransaction } from "@/lib/paystack";
import { isValidSubscriptionPayment } from "@/lib/paystack/validation";
import User from "@/models/User";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const authUser = await requireAuthUser(req);
    const { searchParams } = new URL(req.url);
    const reference = searchParams.get("reference") || searchParams.get("trxref");

    await connectDB();
    const user = await User.findById(new mongoose.Types.ObjectId(authUser.id));

    if (!user) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }

    if (reference) {
      try {
        const data = await verifyPaystackTransaction(reference);
        if (!isValidSubscriptionPayment(data, { id: authUser.id, email: authUser.email })) {
          return NextResponse.json(
            { success: false, message: "Payment does not match this subscription." },
            { status: 400 }
          );
        }
        if (data.status === "success") {
          const paidAt = data.paid_at ? new Date(data.paid_at) : new Date();
          const periodEnd = new Date(paidAt);
          periodEnd.setDate(periodEnd.getDate() + 31);

          if (user.lastPaymentAt && paidAt <= new Date(user.lastPaymentAt)) {
            return NextResponse.json({
              success: true,
              plan: user.plan || "free",
              verified: user.plan === "pro",
            });
          }

          user.set("plan", "pro");
          user.set("subscriptionStatus", "active");
          user.set("lastPaymentAt", paidAt);
          user.set("currentPeriodEnd", periodEnd);
          if (data.currency) {
            user.set("billingCurrency", data.currency);
          }

          await user.save();
          return NextResponse.json({ success: true, plan: "pro", verified: true });
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Manual verification failed";
        console.warn("Manual verification warning:", msg);
      }
    }

    return NextResponse.json({
      success: true,
      plan: user.plan || "free",
      verified: user.plan === "pro",
    });
  } catch (err) {
    if (err instanceof Response) return err;
    const msg = err instanceof Error ? err.message : "Verification error";
    return NextResponse.json({ success: false, message: msg }, { status: 500 });
  }
}

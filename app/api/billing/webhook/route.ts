import { connectDB } from "@/lib/db";
import { verifyPaystackSignature } from "@/lib/paystack";
import { isValidSubscriptionPayment } from "@/lib/paystack/validation";
import User from "@/models/User";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

interface PaystackWebhookPayload {
  event?: string;
  data?: {
    id?: number;
    reference?: string;
    status?: string;
    amount?: number;
    currency?: string;
    paid_at?: string;
    subscription_code?: string;
    email_token?: string;
    next_payment_date?: string;
    customer?: {
      id?: number;
      email?: string;
      customer_code?: string;
    };
    plan?: string | { plan_code?: string };
    metadata?: Record<string, string>;
  };
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-paystack-signature");
    const secretKey = process.env.PAYSTACK_SECRET_KEY?.trim();

    if (!secretKey) {
      console.error("PAYSTACK_SECRET_KEY is not set. Rejecting webhook.");
      return NextResponse.json(
        { success: false, message: "Webhook not configured" },
        { status: 500 }
      );
    }

    if (!signature) {
      console.warn("Paystack webhook missing x-paystack-signature header.");
      return NextResponse.json(
        { success: false, message: "Missing signature header" },
        { status: 401 }
      );
    }

    const isValid = verifyPaystackSignature(rawBody, signature, secretKey);
    if (!isValid) {
      console.warn("Paystack webhook invalid signature.");
      return NextResponse.json({ success: false, message: "Invalid signature" }, { status: 401 });
    }

    let payload: PaystackWebhookPayload = {};
    try {
      payload = JSON.parse(rawBody) as PaystackWebhookPayload;
    } catch {
      return NextResponse.json({ success: false, message: "Invalid JSON" }, { status: 400 });
    }

    const event = payload.event;
    const data = payload.data;
    if (!event || !data) {
      return NextResponse.json({ received: true });
    }

    const userId = data.metadata?.userId;
    const customerEmail = data.customer?.email?.toLowerCase();

    await connectDB();
    let user = null;

    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      user = await User.findById(new mongoose.Types.ObjectId(userId));
    }
    if (!user && customerEmail) {
      user = await User.findOne({ email: customerEmail });
    }
    if (!user && data.subscription_code) {
      user = await User.findOne({ subscriptionCode: data.subscription_code });
    }

    if (!user) {
      console.warn("Paystack webhook: user not found for event", event);
      return NextResponse.json({ received: true });
    }

    if (event === "charge.success") {
      if (!isValidSubscriptionPayment(data, { id: user._id.toString(), email: user.email })) {
        return NextResponse.json({ received: true });
      }
      const paidAt = data.paid_at ? new Date(data.paid_at) : new Date();
      if (user.lastPaymentAt && paidAt <= new Date(user.lastPaymentAt)) {
        return NextResponse.json({ received: true });
      }
      const periodEnd = data.next_payment_date
        ? new Date(data.next_payment_date)
        : new Date(paidAt.getTime() + 31 * 24 * 60 * 60 * 1000);

      user.set("plan", "pro");
      user.set("subscriptionStatus", "active");
      user.set("lastPaymentAt", paidAt);
      user.set("currentPeriodEnd", periodEnd);
      if (data.currency) {
        user.set("billingCurrency", data.currency);
      }
      if (data.subscription_code) {
        user.set("subscriptionCode", data.subscription_code);
        user.set("subscriptionId", data.subscription_code);
      }
      if (data.email_token) {
        user.set("subscriptionToken", data.email_token);
      }

      await user.save();
    } else if (event === "subscription.create") {
      if (data.subscription_code) {
        user.set("subscriptionCode", data.subscription_code);
        user.set("subscriptionId", data.subscription_code);
      }
      if (data.email_token) {
        user.set("subscriptionToken", data.email_token);
      }
      if (data.next_payment_date) {
        user.set("currentPeriodEnd", new Date(data.next_payment_date));
      }
      user.set("subscriptionStatus", "active");
      await user.save();
    } else if (event === "subscription.disable" || event === "subscription.not_renew") {
      user.set("subscriptionStatus", "canceled");
      await user.save();
    } else if (event === "invoice.payment_failed") {
      user.set("subscriptionStatus", "past_due");
      await user.save();
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Webhook processing error";
    console.error("Paystack webhook error:", message);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}

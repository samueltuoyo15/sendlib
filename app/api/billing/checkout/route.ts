import { requireAuthUser } from "@/lib/auth";
import { initializePaystackTransaction } from "@/lib/paystack";
import { NextRequest, NextResponse } from "next/server";

interface PaystackErrorResponse {
  response?: {
    data?: unknown;
    status?: number;
  };
  message?: string;
}

export async function POST(req: NextRequest) {
  try {
    const authUser = await requireAuthUser(req);
    if (!authUser.email) {
      return NextResponse.json(
        {
          success: false,
          message: "Your account does not have an email address associated with it.",
        },
        { status: 400 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL;
    if (!appUrl) throw new Error("Application URL is not configured.");
    const origin = new URL(appUrl).origin;

    const planCode = process.env.PAYSTACK_PLAN_CODE?.trim();

    const session = await initializePaystackTransaction({
      email: authUser.email,
      plan: planCode || undefined,
      callbackUrl: `${origin}/dashboard/settings?billing=success`,
      metadata: {
        userId: authUser.id,
        plan: "pro",
      },
    });

    return NextResponse.json({
      success: true,
      url: session.authorization_url,
      reference: session.reference,
    });
  } catch (err: unknown) {
    if (err instanceof Response) return err;
    const errorObj = err as PaystackErrorResponse;
    const paystackErr = errorObj?.response?.data;
    const errorMessage = errorObj?.message || "Failed to initialize Paystack checkout session";
    const status = errorObj?.response?.status || 500;

    console.error("Paystack checkout error:", paystackErr || errorMessage);

    return NextResponse.json(
      {
        success: false,
        message: "Could not initialize checkout. Please try again.",
      },
      { status }
    );
  }
}

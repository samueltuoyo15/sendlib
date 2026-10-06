import { requireAuthUser } from "@/lib/auth";
import { handleGmailCallback, verifyGmailState } from "@/lib/gmail";
import { NextRequest, NextResponse } from "next/server";

const { NEXT_PUBLIC_APP_URL } = process.env;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  if (!code || !state) {
    return NextResponse.redirect(`${NEXT_PUBLIC_APP_URL}/dashboard?gmail_error=missing_params`);
  }

  let userId: string;
  try {
    if (req.cookies.get("gmail_oauth_state")?.value !== state)
      throw new Error("OAuth browser mismatch");
    const user = await requireAuthUser(req);
    userId = verifyGmailState(state);
    if (userId !== user.id) throw new Error("OAuth user mismatch");
  } catch (err) {
    console.error("Gmail callback state verification failed:", err);
    return NextResponse.redirect(
      `${NEXT_PUBLIC_APP_URL}/dashboard/accounts?gmail_error=invalid_state`
    );
  }

  try {
    const { gmailEmail, isNew } = await handleGmailCallback(code, userId);
    const paramKey = isNew ? "gmail_connected" : "gmail_updated";
    const response = NextResponse.redirect(
      `${NEXT_PUBLIC_APP_URL}/dashboard/accounts?${paramKey}=true&email=${encodeURIComponent(gmailEmail)}`
    );
    response.cookies.set("gmail_oauth_state", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });
    return response;
  } catch (err) {
    console.error("Gmail callback error:", err);
    return NextResponse.redirect(
      `${NEXT_PUBLIC_APP_URL}/dashboard/accounts?gmail_error=callback_failed`
    );
  }
}

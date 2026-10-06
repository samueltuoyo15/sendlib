import { clearAuthCookies } from "@/lib/auth";
import { revokeSession } from "@/lib/auth/sessions";
import { connectDB } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const token = req.cookies.get("access_token")?.value;
  if (token) {
    try {
      await connectDB();
      await revokeSession(token);
    } catch (err) {
      console.error("Logout revoke error:", err);
      return NextResponse.json({ success: false, message: "Failed to log out" }, { status: 500 });
    }
  }
  const response = NextResponse.json({ success: true, message: "Logged out" });
  return clearAuthCookies(response);
}

export async function GET() {
  return NextResponse.json(
    { success: false, message: "Use POST to log out." },
    { status: 405, headers: { Allow: "POST" } }
  );
}

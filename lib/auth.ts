import Session from "@/models/Session";
import User from "@/models/User";
import { NextRequest, NextResponse } from "next/server";
import { PENDING_SESSION_TTL_MS, SESSION_TTL_MS, findSessionByToken } from "./auth/sessions";
import { connectDB } from "./db";
import { isTrustedBrowserRequest } from "./requestSecurity";

export const SESSION_COOKIE_NAME = "access_token";
export const MARKER_COOKIE_NAME = "logged_in";
export const PENDING_MARKER_COOKIE_NAME = "pending_2fa";
export const SESSION_COOKIE_MAX_AGE = SESSION_TTL_MS / 1000;
export const PENDING_SESSION_COOKIE_MAX_AGE = PENDING_SESSION_TTL_MS / 1000;

export interface AuthUser {
  id: string;
  email: string | null;
  displayName: string;
  sessionId: string;
}

const LAST_ACTIVE_REFRESH_MS = 5 * 60 * 1000;

/** Extract client IP from proxy headers. */
export function getClientIp(req: NextRequest): string {
  const viaXff = req.headers.get("x-forwarded-for")?.split(",")[0].trim();
  if (viaXff) return viaXff;
  const viaCf = req.headers.get("cf-connecting-ip");
  if (viaCf) return viaCf;
  return "unknown";
}

/**
 * Validate the request's session server-side. Session tokens are opaque
 * random values; only their SHA-256 digest is persisted. A session is valid
 * only while it is active (not awaiting 2FA), un-revoked and unexpired, and
 * the owning account is not disabled.
 */
export async function getAuthUser(req: NextRequest): Promise<AuthUser | null> {
  const cookieToken = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const bearerToken = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const token = cookieToken ?? bearerToken;
  if (!token) return null;

  try {
    await connectDB();
    const session = await findSessionByToken(token);
    if (!session) return null;
    if (session.status !== "active") return null;
    if (session.revokedAt) return null;
    if (session.expiresAt.getTime() <= Date.now()) return null;

    const user = await User.findById(session.userId).select("_id email displayName disabled");
    if (!user || user.disabled) return null;

    // Throttle the lastActiveAt write so hot endpoints don't hammer Mongo.
    if (Date.now() - (session.lastActiveAt?.getTime() ?? 0) > LAST_ACTIVE_REFRESH_MS) {
      Session.updateOne({ _id: session._id }, { lastActiveAt: new Date() }).catch(() => undefined);
    }

    return {
      id: user._id.toString(),
      email: user.email ?? null,
      displayName: user.displayName,
      sessionId: session._id.toString(),
    };
  } catch (err) {
    console.error("getAuthUser error:", err);
    return null;
  }
}

export async function requireAuthUser(req: NextRequest): Promise<AuthUser> {
  const mutating =
    !["GET", "HEAD", "OPTIONS"].includes(req.method) ||
    (req.nextUrl.pathname === "/api/billing/verify" &&
      (req.nextUrl.searchParams.has("reference") || req.nextUrl.searchParams.has("trxref")));
  if (mutating && !isTrustedBrowserRequest(req)) {
    throw new Response(JSON.stringify({ success: false, message: "Untrusted request origin." }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
  const user = await getAuthUser(req);
  if (!user) {
    throw new Response(JSON.stringify({ success: false, message: "Authentication required" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return user;
}

function cookieBase(secure: boolean) {
  return { secure, sameSite: "lax" as const, path: "/" };
}

/** Fully authenticated session: httpOnly token + client-readable logged_in marker. */
export function setAuthCookies(response: NextResponse, token: string): NextResponse {
  const secure = process.env.NODE_ENV === "production";
  const base = cookieBase(secure);
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    ...base,
    httpOnly: true,
    maxAge: SESSION_COOKIE_MAX_AGE,
  });
  response.cookies.set(MARKER_COOKIE_NAME, "true", {
    ...base,
    httpOnly: false,
    maxAge: SESSION_COOKIE_MAX_AGE,
  });
  response.cookies.set(PENDING_MARKER_COOKIE_NAME, "", {
    ...base,
    httpOnly: false,
    maxAge: 0,
  });
  return response;
}

/**
 * Pending 2FA: keep the opaque session token so the 2FA step can upgrade it,
 * but do not set logged_in; middleware must not treat this as authenticated.
 */
export function setPendingAuthCookies(response: NextResponse, token: string): NextResponse {
  const secure = process.env.NODE_ENV === "production";
  const base = cookieBase(secure);
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    ...base,
    httpOnly: true,
    maxAge: PENDING_SESSION_COOKIE_MAX_AGE,
  });
  response.cookies.set(MARKER_COOKIE_NAME, "", {
    ...base,
    httpOnly: false,
    maxAge: 0,
  });
  response.cookies.set(PENDING_MARKER_COOKIE_NAME, "true", {
    ...base,
    httpOnly: false,
    maxAge: PENDING_SESSION_COOKIE_MAX_AGE,
  });
  return response;
}

/** Remove session cookies from a response (server-side logout). */
export function clearAuthCookies(response: NextResponse): NextResponse {
  const secure = process.env.NODE_ENV === "production";
  const base = cookieBase(secure);
  response.cookies.set(SESSION_COOKIE_NAME, "", { ...base, httpOnly: true, maxAge: 0 });
  response.cookies.set(MARKER_COOKIE_NAME, "", { ...base, httpOnly: false, maxAge: 0 });
  response.cookies.set(PENDING_MARKER_COOKIE_NAME, "", { ...base, httpOnly: false, maxAge: 0 });
  return response;
}

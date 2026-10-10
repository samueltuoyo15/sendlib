import { type NextRequest, NextResponse } from "next/server";
import { isTrustedBrowserRequest } from "./lib/requestSecurity";

/**
 * Page-level guard for the dashboard shell. Full session validation still
 * happens server-side in every API route via requireAuthUser(), this only
 * prevents unauthenticated users from receiving the dashboard HTML at all.
 * It cannot be fooled into authenticating anyone on its own.
 */
export function middleware(request: NextRequest) {
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
  const isLegacyHost = host.toLowerCase().includes("sendlib.samueltuoyo.com");
  const { pathname, search } = request.nextUrl;

  if (isLegacyHost && !pathname.startsWith("/api/")) {
    const targetUrl = new URL(`${pathname}${search}`, "https://sendliberty.com");
    return NextResponse.redirect(targetUrl, 308);
  }

  if (pathname.startsWith("/api/")) {
    const keyEndpoint =
      pathname === "/api/send" || pathname === "/api/batch" || pathname.startsWith("/api/batch/");
    const mutating =
      !["GET", "HEAD", "OPTIONS"].includes(request.method) ||
      (pathname === "/api/billing/verify" &&
        (request.nextUrl.searchParams.has("reference") ||
          request.nextUrl.searchParams.has("trxref")));
    if (
      mutating &&
      !keyEndpoint &&
      pathname !== "/api/billing/webhook" &&
      !isTrustedBrowserRequest(request)
    ) {
      return NextResponse.json(
        { success: false, message: "Untrusted request origin." },
        { status: 403 }
      );
    }
    return NextResponse.next();
  }

  const sessionToken = request.cookies.get("access_token")?.value;
  const marker = request.cookies.get("logged_in")?.value;

  if (!sessionToken || marker !== "true") {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};

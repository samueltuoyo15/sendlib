import { getClientIp } from "@/lib/auth";
import { readJsonBody } from "@/lib/requestBody";
import { NextRequest, NextResponse } from "next/server";
import { AuthError } from "./errors";

export function getDeviceInfo(req: NextRequest): { ip?: string; userAgent?: string } {
  return {
    ip: getClientIp(req),
    userAgent: req.headers.get("user-agent") ?? undefined,
  };
}

export function authErrorResponse(err: unknown): NextResponse {
  if (err instanceof AuthError) {
    return NextResponse.json(
      {
        success: false,
        code: err.code,
        message: err.message,
      },
      { status: err.status }
    );
  }
  if (err instanceof Response) return err as Response as NextResponse;
  console.error("Auth flow error:", err);
  return NextResponse.json(
    { success: false, code: "internal_error", message: "Something went wrong. Please try again." },
    { status: 500 }
  );
}

export function authOk(data: Record<string, unknown> = {}, message?: string) {
  return NextResponse.json({ success: true, message, ...data });
}

/** Parse a JSON request body, failing gracefully on malformed input. */
export async function parseJsonBody(req: NextRequest): Promise<Record<string, unknown>> {
  try {
    return (await readJsonBody(req, 16 * 1024)) as Record<string, unknown>;
  } catch (error) {
    if (error instanceof Response) throw error;
    return {};
  }
}

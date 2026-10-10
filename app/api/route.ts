import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "healthy",
    message: "Sendliberty API is running",
    timestamp: new Date().toISOString(),
  });
}

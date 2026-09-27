import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import EmailLog from "@/models/EmailLog";
import {
  TRANSPARENT_GIF_BYTES,
  isValidTrackingId,
  hashIpAddress,
} from "@/lib/tracking";

function createGifResponse(): Response {
  return new Response(TRANSPARENT_GIF_BYTES, {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Content-Length": String(TRANSPARENT_GIF_BYTES.length),
      "Cache-Control":
        "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0, s-maxage=0",
      Pragma: "no-cache",
      Expires: "0",
      "Access-Control-Allow-Origin": "*",
      "Cross-Origin-Resource-Policy": "cross-origin",
    },
  });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ trackingId: string }> }
) {
  const { trackingId } = await params;

  if (!isValidTrackingId(trackingId)) {
    return createGifResponse();
  }

  try {
    await connectDB();

    const emailLog = await EmailLog.findOne({ trackingId });
    if (!emailLog) {
      return createGifResponse();
    }

    // Protection against immediate false-positive self-opens:
    // Senders previewing/rendering their sent email right after dispatch.
    // Legitimate recipient opens rarely happen within 5 seconds of creation.
    const now = Date.now();
    const createdAtTime = new Date(emailLog.createdAt).getTime();
    if (now - createdAtTime < 5000) {
      return createGifResponse();
    }

    const clientIp =
      req.headers.get("cf-connecting-ip") ||
      req.headers.get("x-real-ip") ||
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "127.0.0.1";

    const userAgent = req.headers.get("user-agent") || undefined;
    const ipSalt = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || "sendlib-salt";
    const ipHash = hashIpAddress(clientIp, ipSalt);

    const openDate = new Date();

    await EmailLog.updateOne(
      { _id: emailLog._id },
      {
        $set: {
          opened: true,
          lastOpenedAt: openDate,
        },
        $min: { firstOpenedAt: openDate },
        $inc: { openCount: 1 },
        $push: {
          openEvents: {
            $each: [{ occurredAt: openDate, ipHash, userAgent }],
            $slice: -50,
          },
        },
      }
    );
  } catch (err) {
    console.error("Error processing email tracking pixel:", err);
  }

  return createGifResponse();
}

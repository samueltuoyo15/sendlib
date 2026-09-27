import crypto from "crypto";

// 42-byte minimal transparent 1x1 GIF
export const TRANSPARENT_GIF_BASE64 =
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

export const TRANSPARENT_GIF_BYTES = Buffer.from(TRANSPARENT_GIF_BASE64, "base64");

/**
 * Validates tracking ID format (UUID or 32-char hex).
 */
export function isValidTrackingId(id: string): boolean {
  if (!id || typeof id !== "string") return false;
  return (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id) ||
    /^[0-9a-f]{32}$/i.test(id)
  );
}

/**
 * Generates a cryptographically secure, URL-safe tracking ID.
 */
export function generateTrackingId(): string {
  return crypto.randomUUID();
}

/**
 * Injects a 1x1 transparent tracking pixel into an HTML email body.
 * If </body> is found, injects right before it; otherwise appends to the end.
 */
export function injectTrackingPixel(html: string, trackingUrl: string): string {
  const pixelHtml = `<img src="${trackingUrl}" width="1" height="1" alt="" style="display:none;width:1px;height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;border:none;" />`;

  if (!html || typeof html !== "string") {
    return pixelHtml;
  }

  const bodyCloseIndex = html.toLowerCase().lastIndexOf("</body>");
  if (bodyCloseIndex !== -1) {
    return (
      html.substring(0, bodyCloseIndex) +
      pixelHtml +
      html.substring(bodyCloseIndex)
    );
  }

  return `${html}\n${pixelHtml}`;
}

/**
 * Hashes an IP address with HMAC-SHA256 and a secret salt to preserve recipient privacy.
 */
export function hashIpAddress(ip: string, salt: string): string {
  return crypto.createHmac("sha256", salt || "sendlib-tracking-salt").update(ip).digest("hex");
}

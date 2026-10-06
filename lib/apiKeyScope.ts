import GmailAccount from "@/models/GmailAccount";
import { z } from "zod";

/** Validate dashboard scope changes against accounts owned by the signed-in user. */
export async function validateSenderScope(userId: string, value: unknown): Promise<string | null> {
  if (value === null) return null;
  const parsed = z
    .email()
    .safeParse(typeof value === "string" ? value.trim().toLowerCase() : value);
  if (!parsed.success) {
    throw Response.json(
      { success: false, message: "Select a valid connected sender email." },
      { status: 400 }
    );
  }
  const account = await GmailAccount.exists({ userId, gmailEmail: parsed.data, connected: true });
  if (!account) {
    throw Response.json(
      { success: false, message: "Sender email must be one of your connected accounts." },
      { status: 400 }
    );
  }
  return parsed.data;
}

/** Preserve legacy account selection; the original From header is passed to Gmail. */
export function senderEmailAddress(from: string): string {
  return (from.match(/<([^>]+)>/)?.[1] ?? from).trim().toLowerCase();
}

export function assertSenderScope(scope: string | null | undefined, from: string): void {
  if (!scope) return;
  // Scoped keys must identify exactly one sender; extracting only the first address is insufficient.
  const match =
    typeof from === "string"
      ? from
          .trim()
          .match(/^(?:((?:"[^"\r\n]*"|[^<>,@"\r\n]*))\s*<([^<>,\s\r\n]+)>|([^<>,\s\r\n]+))$/)
      : null;
  const address = (match?.[2] ?? match?.[3] ?? "").toLowerCase();
  if (address !== scope.toLowerCase()) {
    throw new Error("API key sender scope does not permit this email account.");
  }
}

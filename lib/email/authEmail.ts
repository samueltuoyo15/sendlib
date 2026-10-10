import axiosSrv from "@/lib/axios";

/**
 * Transactional email transport for authentication flows.
 * Uses Sendlib's own REST API (/api/send) with SENDLIB_API_KEY and SENDLIB_FROM.
 */

export interface AuthEmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

function getAppUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "http://localhost:3000";
  return url.replace(/\/$/, "");
}

function getFromAddress(): string {
  return process.env.SENDLIB_FROM?.trim() || '"Sendliberty" <samueltuoyo9082@gmail.com>';
}

/**
 * Sends authentication emails (password reset, email verification, welcome)
 * directly through Sendlib's API endpoint.
 */
export async function sendAuthEmail(input: AuthEmailInput): Promise<{ messageId: string | null }> {
  const apiKey = process.env.SENDLIB_API_KEY?.trim();

  if (!apiKey) {
    console.warn(
      `[auth-email] SENDLIB_API_KEY is not set in environment. ` +
        `Auth email to "${input.to}" with subject "${input.subject}" was not sent. ` +
        `Add SENDLIB_API_KEY and SENDLIB_FROM to your .env file.`
    );
    return { messageId: null };
  }

  const appUrl = getAppUrl();
  const from = getFromAddress();

  try {
    const res = await axiosSrv.post(
      `${appUrl}/api/send`,
      {
        from,
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        timeout: 15000,
      }
    );

    if (res.data?.success) {
      return { messageId: res.data.messageId ?? null };
    }

    throw new Error(res.data?.message || "Failed to send email via Sendlib API.");
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`[auth-email] Sendlib API delivery failed for ${input.to}:`, errMsg);
    throw new Error(`Auth email delivery failed: ${errMsg}`);
  }
}

import { DocsPagination } from "@/components/docs/DocsPagination";

export default function LimitsPage() {
  return (
    <div className="max-w-3xl space-y-8">
      <div className="mb-10">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-primary-sendlib mb-4">
          Limits &amp; Quotas
        </h1>
        <p className="text-secondary text-lg leading-relaxed">
          Overview of API rate limits, request payload limits, and daily Gmail quotas.
        </p>
      </div>

      <p className="text-secondary leading-relaxed">
        The following limits apply to accounts to ensure platform stability and protect fair usage.
        Pro plan upgrades increase these limits significantly.
      </p>

      {/* Section 1: Rate Limits */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-primary-sendlib">API Rate Limits</h2>
        <div className="overflow-x-auto rounded-xl border border-outline-variant">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-variant/40">
                <th className="text-left px-4 py-3 font-semibold text-primary-sendlib">Endpoint</th>
                <th className="text-left px-4 py-3 font-semibold text-primary-sendlib">Free</th>
                <th className="text-left px-4 py-3 font-semibold text-primary-sendlib">Pro</th>
                <th className="text-left px-4 py-3 font-semibold text-primary-sendlib">Window</th>
                <th className="text-left px-4 py-3 font-semibold text-primary-sendlib">Keyed By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/50">
              <tr className="hover:bg-surface-variant/20 transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-secondary">
                  <code>POST /api/send</code>
                </td>
                <td className="px-4 py-3 font-bold text-primary-sendlib">30 req</td>
                <td className="px-4 py-3 font-bold text-primary-sendlib">300 req</td>
                <td className="px-4 py-3 text-secondary">per minute</td>
                <td className="px-4 py-3 text-secondary">API key</td>
              </tr>
              <tr className="hover:bg-surface-variant/20 transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-secondary">
                  <code>Gmail sender burst</code>
                </td>
                <td className="px-4 py-3 font-bold text-primary-sendlib">
                  1 send/s personal · 2 sends/s Workspace
                </td>
                <td className="px-4 py-3 font-bold text-primary-sendlib">
                  1 send/s personal · 2 sends/s Workspace
                </td>
                <td className="px-4 py-3 text-secondary">1-second sliding window</td>
                <td className="px-4 py-3 text-secondary">Connected Gmail account</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs text-secondary">
          When a rate limit is hit, the API returns{" "}
          <code className="bg-surface-variant px-1 rounded">429 Too Many Requests</code> with a{" "}
          <code className="bg-surface-variant px-1 rounded">Retry-After</code> header indicating how
          many seconds to wait.
        </p>
        <p className="text-xs text-secondary">
          The per-minute API-key limit and the Gmail sender burst limit are separate. Sendlib waits
          up to 3 seconds for a Gmail sender slot. If no slot becomes available, the request is
          recorded as failed and returns{" "}
          <code className="bg-surface-variant px-1 rounded">429</code> with{" "}
          <code className="bg-surface-variant px-1 rounded">Retry-After: 1</code>. Clients should
          serialize sends per connected Gmail account or retry 429 responses after the indicated
          delay. For larger recipient lists, use <code>/api/batch</code>.
        </p>
      </div>

      {/* Section 2: Request Size Limits */}
      <div className="space-y-4 pt-4">
        <h2 className="text-xl font-bold text-primary-sendlib">Request Payload Limits</h2>
        <div className="overflow-x-auto rounded-xl border border-outline-variant">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-variant/40">
                <th className="text-left px-4 py-3 font-semibold text-primary-sendlib">Field</th>
                <th className="text-left px-4 py-3 font-semibold text-primary-sendlib">Free</th>
                <th className="text-left px-4 py-3 font-semibold text-primary-sendlib">Pro</th>
                <th className="text-left px-4 py-3 font-semibold text-primary-sendlib">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/50">
              <tr className="hover:bg-surface-variant/20 transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-secondary">
                  <code>subject</code>
                </td>
                <td className="px-4 py-3 font-bold text-primary-sendlib">998 chars</td>
                <td className="px-4 py-3 font-bold text-primary-sendlib">998 chars</td>
                <td className="px-4 py-3 text-secondary">RFC 2822 maximum</td>
              </tr>
              <tr className="hover:bg-surface-variant/20 transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-secondary">
                  <code>html</code>
                </td>
                <td className="px-4 py-3 font-bold text-primary-sendlib">2 MB</td>
                <td className="px-4 py-3 font-bold text-primary-sendlib">5 MB</td>
                <td className="px-4 py-3 text-secondary">UTF-8 encoded</td>
              </tr>
              <tr className="hover:bg-surface-variant/20 transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-secondary">
                  <code>text</code>
                </td>
                <td className="px-4 py-3 font-bold text-primary-sendlib">1 MB</td>
                <td className="px-4 py-3 font-bold text-primary-sendlib">2 MB</td>
                <td className="px-4 py-3 text-secondary">UTF-8 encoded</td>
              </tr>
              <tr className="hover:bg-surface-variant/20 transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-secondary">
                  <code>to</code> / <code>cc</code> / <code>bcc</code>
                </td>
                <td className="px-4 py-3 font-bold text-primary-sendlib">50 each</td>
                <td className="px-4 py-3 font-bold text-primary-sendlib">50 each</td>
                <td className="px-4 py-3 text-secondary">String or array of strings</td>
              </tr>
              <tr className="hover:bg-surface-variant/20 transition-colors">
                <td className="px-4 py-3 font-mono text-xs text-secondary">
                  <code>attachments</code>
                </td>
                <td className="px-4 py-3 font-bold text-primary-sendlib">5 files · 1 MB/file</td>
                <td className="px-4 py-3 font-bold text-primary-sendlib">20 files · 10 MB/file</td>
                <td className="px-4 py-3 text-secondary">
                  Base64-encoded. 25 MB total cap enforced by Gmail.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 3: Account & Daily Limits */}
      <div className="space-y-4 pt-4">
        <h2 className="text-xl font-bold text-primary-sendlib">Account &amp; Daily Limits</h2>
        <div className="overflow-x-auto rounded-xl border border-outline-variant">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-variant/40">
                <th className="text-left px-4 py-3 font-semibold text-primary-sendlib">Resource</th>
                <th className="text-left px-4 py-3 font-semibold text-primary-sendlib">Free</th>
                <th className="text-left px-4 py-3 font-semibold text-primary-sendlib">Pro</th>
                <th className="text-left px-4 py-3 font-semibold text-primary-sendlib">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/50">
              <tr className="hover:bg-surface-variant/20 transition-colors">
                <td className="px-4 py-3 text-secondary">Connected Gmail Accounts</td>
                <td className="px-4 py-3 font-bold text-primary-sendlib">3</td>
                <td className="px-4 py-3 font-bold text-primary-sendlib">50</td>
                <td className="px-4 py-3 text-secondary">Per Sendlib user account</td>
              </tr>
              <tr className="hover:bg-surface-variant/20 transition-colors">
                <td className="px-4 py-3 text-secondary">Active API Keys</td>
                <td className="px-4 py-3 font-bold text-primary-sendlib">5</td>
                <td className="px-4 py-3 font-bold text-primary-sendlib">100</td>
                <td className="px-4 py-3 text-secondary">Per Sendlib user account</td>
              </tr>
              <tr className="hover:bg-surface-variant/20 transition-colors">
                <td className="px-4 py-3 text-secondary">Monthly Sending Limit</td>
                <td className="px-4 py-3 font-bold text-primary-sendlib">3,500 emails / month</td>
                <td className="px-4 py-3 font-bold text-primary-sendlib">Unlimited</td>
                <td className="px-4 py-3 text-secondary">
                  Resets monthly based on your account sign-up date
                </td>
              </tr>
              <tr className="hover:bg-surface-variant/20 transition-colors">
                <td className="px-4 py-3 text-secondary">Email Log Retention</td>
                <td className="px-4 py-3 font-bold text-primary-sendlib">5 days</td>
                <td className="px-4 py-3 font-bold text-primary-sendlib">90 days</td>
                <td className="px-4 py-3 text-secondary">
                  Logs are automatically deleted after this period
                </td>
              </tr>
              <tr className="hover:bg-surface-variant/20 transition-colors">
                <td className="px-4 py-3 text-secondary">
                  Personal Gmail (
                  <code className="text-xs bg-surface-variant px-1 rounded">@gmail.com</code>)
                </td>
                <td className="px-4 py-3 font-bold text-primary-sendlib">200 emails / day</td>
                <td className="px-4 py-3 font-bold text-primary-sendlib">500 emails / day</td>
                <td className="px-4 py-3 text-secondary">
                  Resets daily at UTC midnight. Google hard cap is 500.
                </td>
              </tr>
              <tr className="hover:bg-surface-variant/20 transition-colors">
                <td className="px-4 py-3 text-secondary">Google Workspace Account</td>
                <td className="px-4 py-3 font-bold text-primary-sendlib">1,000 emails / day</td>
                <td className="px-4 py-3 font-bold text-primary-sendlib">2,000 emails / day</td>
                <td className="px-4 py-3 text-secondary">
                  Resets daily at UTC midnight. Google hard cap is 2,000.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs text-secondary">
          Daily sending quotas are set and enforced directly by Google&apos;s Gmail API. Sendlib
          monitors your send volume and resets your limit tracking daily at UTC midnight.
        </p>
        <p className="text-xs text-secondary">
          A successful Sendlib response means Gmail accepted the message and returned a message ID.
          It does not guarantee inbox placement: Gmail and the recipient&apos;s mail provider can
          still place the message in Spam based on sender reputation, message content, links,
          recipient engagement, and other signals. Use a consistent sender, include useful
          plain-text content, avoid link-heavy or image-heavy messages, and use an authenticated
          Google Workspace custom domain when dependable business deliverability is important.
        </p>
      </div>

      <DocsPagination
        prev={{ title: "Quick Start", href: "/docs/quickstart" }}
        next={{ title: "Connecting Gmail", href: "/docs/gmail" }}
      />
    </div>
  );
}

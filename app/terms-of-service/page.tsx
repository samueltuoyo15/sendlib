import { HugeiconsIcon } from "@hugeicons/react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service | Sendliberty",
  description: "Sendliberty Terms of Service and API usage terms.",
  alternates: {
    canonical: "https://sendliberty.com/terms-of-service",
  },
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background-sendlib text-on-background py-16 px-margin-mobile md:px-margin-desktop">
      <div className="max-w-3xl mx-auto space-y-xl relative">
        <Link
          href="/"
          className="inline-flex items-center gap-xs font-label-sm text-label-sm text-secondary hover:text-primary-sendlib transition-colors mb-8"
        >
          Back to Home
        </Link>

        <div className="space-y-sm">
          <h1 className="font-headline-lg text-headline-lg text-primary-sendlib">
            Terms of Service
          </h1>
          <p className="font-body-md text-on-surface-variant">Last updated: July 24, 2026</p>
        </div>

        <div className="space-y-lg text-body-md font-body-md text-on-background">
          <section className="space-y-sm">
            <h2 className="font-headline-sm text-headline-sm text-primary-sendlib">
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing and using Sendliberty, you accept and agree to be bound by the terms and
              provision of this agreement.
            </p>
          </section>

          <section className="space-y-sm">
            <h2 className="font-headline-sm text-headline-sm text-primary-sendlib">
              2. Use License
            </h2>
            <p>
              Permission is granted to temporarily use Sendliberty&apos;s API for personal or
              commercial use, subject to rate limits and fair use policies. This is the grant of a
              license, not a transfer of title.
            </p>
          </section>

          <section className="space-y-sm">
            <h2 className="font-headline-sm text-headline-sm text-primary-sendlib">
              3. Acceptable Use & Anti-Spam Policy
            </h2>
            <p>
              Sendliberty is strictly designed for relaying legitimate 1-to-1 transactional emails
              (e.g. welcome messages, password resets, OTP verification codes, purchase receipts,
              etc.) triggered by genuine user actions.
            </p>
            <p className="mt-2">
              Unsolicited mass emailing, commercial spam, cold outreach campaigns, or any attempt to
              bypass system rate limits is strictly prohibited. Sendliberty reserves the right to
              immediately terminate access, revoke API keys, and suspend accounts violating this
              policy without prior notice.
            </p>
          </section>

          <section className="space-y-sm">
            <h2 className="font-headline-sm text-headline-sm text-primary-sendlib">
              4. Disclaimer
            </h2>
            <p>
              The materials on Sendliberty&apos;s website and API are provided on an &apos;as
              is&apos; basis. Sendliberty makes no warranties, expressed or implied, and hereby
              disclaims and negates all other warranties including, without limitation, implied
              warranties or conditions of merchantability.
            </p>
          </section>

          <section className="space-y-sm">
            <h2 className="font-headline-sm text-headline-sm text-primary-sendlib">
              5. Limitations
            </h2>
            <p>
              In no event shall Sendliberty or its suppliers be liable for any damages (including,
              without limitation, damages for loss of data or profit, or due to business
              interruption) arising out of the use or inability to use the Sendliberty API.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

import { HugeiconsIcon } from "@hugeicons/react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Refund Policy | Sendliberty",
  description: "Sendliberty Refund Policy",
  alternates: {
    canonical: "https://sendliberty.com/refund",
  },
};

export default function RefundPolicy() {
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
          <h1 className="font-headline-lg text-headline-lg text-primary-sendlib">Refund Policy</h1>
          <p className="font-body-md text-on-surface-variant">Last updated: August 8, 2026</p>
        </div>

        <div className="space-y-lg text-body-md font-body-md text-on-background">
          <section className="space-y-sm">
            <h2 className="font-headline-sm text-headline-sm text-primary-sendlib">
              1. No Refunds
            </h2>
            <p>
              Due to the nature of our service and the costs associated with API infrastructure,{" "}
              <strong>all sales are final and non-refundable</strong>. Once a subscription is
              purchased and activated, we cannot issue any refunds, partial or otherwise.
            </p>
            <p>
              We highly encourage all users to fully utilize our Free plan to test the API, explore
              the dashboard, and ensure Sendliberty meets your requirements before upgrading to the
              Pro plan.
            </p>
          </section>

          <section className="space-y-sm">
            <h2 className="font-headline-sm text-headline-sm text-primary-sendlib">
              2. Subscription Renewals & Cancellations
            </h2>
            <p>
              Sendliberty operates on an auto-renewing subscription model. You will be billed
              automatically at the start of each billing cycle.
            </p>
            <p>
              You may cancel your subscription at any time from your dashboard to prevent future
              charges. When you cancel, you will retain full access to all Pro features until the
              end of your current paid billing period.{" "}
              <strong>
                We do not offer prorated refunds for canceled subscriptions or for unused time in a
                billing cycle.
              </strong>
            </p>
          </section>

          <section className="space-y-sm">
            <h2 className="font-headline-sm text-headline-sm text-primary-sendlib">
              3. Plan Changes (Downgrades)
            </h2>
            <p>
              If you choose to downgrade from the Pro plan to the Free plan, the downgrade will take
              effect at the end of your current billing cycle. We do not issue prorated refunds for
              downgrades made in the middle of a billing cycle.
            </p>
          </section>

          <section className="space-y-sm">
            <h2 className="font-headline-sm text-headline-sm text-primary-sendlib">
              4. Account Suspension
            </h2>
            <p>
              If your account is terminated or suspended due to a violation of our Terms of Service
              (e.g., using Sendliberty to send spam or malicious content), your subscription will be
              canceled immediately, and you will not be eligible for a refund.
            </p>
          </section>

          <section className="space-y-sm">
            <h2 className="font-headline-sm text-headline-sm text-primary-sendlib">
              5. Contact Us
            </h2>
            <p>If you have any questions about billing or this policy, please contact us at:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                Email:{" "}
                <a
                  href="mailto:hello@samueltuoyo.com"
                  className="text-primary-sendlib hover:underline"
                >
                  hello@samueltuoyo.com
                </a>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

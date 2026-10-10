"use client";

import { DocsPagination } from "@/components/docs/DocsPagination";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function QuickstartPage() {
  const [apiUrl] = useState(() =>
    typeof window !== "undefined" ? window.location.origin : "https://sendliberty.com"
  );

  return (
    <div className="max-w-3xl">
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight text-primary-sendlib mb-4">Quick Start</h1>
        <p className="text-secondary text-lg leading-relaxed">
          Get up and running with Sendliberty in under 5 minutes.
        </p>
      </div>

      <div className="space-y-8">
        {/* Step 1 */}
        <div className="p-6 rounded-xl border border-outline-variant/60 bg-surface-container-low">
          <h3 className="text-xl font-bold text-primary-sendlib mb-2 flex items-center gap-2">
            <span className="w-6 h-6 rounded-md bg-indigo-500/10 text-indigo-600 flex items-center justify-center text-xs font-bold">
              1
            </span>
            Connect your Gmail
          </h3>
          <p className="text-secondary mb-2">
            Navigate to the{" "}
            <Link
              href="/dashboard/accounts"
              className="text-indigo-600 hover:text-indigo-700 underline font-semibold"
            >
              Gmail Accounts
            </Link>{" "}
            page in your dashboard and click <strong>Connect New Account</strong> to authorize.
          </p>
        </div>

        {/* Step 2 */}
        <div className="p-6 rounded-xl border border-outline-variant/60 bg-surface-container-low">
          <h3 className="text-xl font-bold text-primary-sendlib mb-2 flex items-center gap-2">
            <span className="w-6 h-6 rounded-md bg-indigo-500/10 text-indigo-600 flex items-center justify-center text-xs font-bold">
              2
            </span>
            Generate an API Key
          </h3>
          <p className="text-secondary mb-2">
            Navigate to the{" "}
            <Link
              href="/dashboard/keys"
              className="text-indigo-600 hover:text-indigo-700 underline font-semibold"
            >
              API Keys
            </Link>{" "}
            page in your dashboard and click <strong>Generate New Key</strong>. Copy the key safely.
          </p>
        </div>

        {/* Step 3 */}
        <div className="p-6 rounded-xl border border-outline-variant/60 bg-surface-container-low">
          <h3 className="text-xl font-bold text-primary-sendlib mb-2 flex items-center gap-2">
            <span className="w-6 h-6 rounded-md bg-indigo-500/10 text-indigo-600 flex items-center justify-center text-xs font-bold">
              3
            </span>
            Send your first email
          </h3>
          <p className="text-secondary mb-4">
            Make a standard HTTP POST request from your application:
          </p>
          <pre className="p-4 bg-surface-container-high border border-outline-variant/50 rounded-lg text-sm font-mono text-white/90 overflow-x-auto whitespace-pre custom-scrollbar">
            {`curl -X POST ${apiUrl}/api/send \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "from": "sender@gmail.com",
    "to": "recipient@example.com",
    "subject": "Welcome to Sendliberty!",
    "html": "<p>This email was sent via Sendliberty REST API.</p>"
  }'`}
          </pre>
        </div>
      </div>

      <DocsPagination
        prev={{ title: "Introduction", href: "/docs" }}
        next={{ title: "Limits & Quotas", href: "/docs/limits" }}
      />
    </div>
  );
}

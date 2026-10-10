"use client";

import { DocsPagination } from "@/components/docs/DocsPagination";
import { EditableCodeBlock } from "@/components/docs/EditableCodeBlock";
import { useEffect, useState } from "react";

export default function TemplatesDocsPage() {
  const [apiUrl, setApiUrl] = useState("https://sendliberty.com");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setApiUrl(window.location.origin);
    }
  }, []);

  return (
    <div className="max-w-3xl">
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight text-primary-sendlib mb-4">Templates</h1>
        <p className="text-secondary text-lg leading-relaxed">
          Store HTML once. Send with a slug and a <code>data</code> object. No more copying markup
          into every request.
        </p>
      </div>

      <div className="space-y-8 text-secondary leading-relaxed">
        <div>
          <h2 className="text-xl font-bold text-primary-sendlib mb-3">How it works</h2>
          <ol className="list-decimal pl-5 space-y-2 text-sm">
            <li>
              Edit a template in <strong>Dashboard → Templates</strong> (welcome, OTP, invoice, and
              more).
            </li>
            <li>
              Use <code>{"{{name}}"}</code> placeholders in the subject or HTML.
            </li>
            <li>
              POST <code>/api/send</code> with <code>template</code> + <code>data</code>.
            </li>
          </ol>
        </div>

        <div>
          <h2 className="text-xl font-bold text-primary-sendlib mb-3">Request</h2>
          <EditableCodeBlock
            title="Send with a template"
            snippets={{
              curl: `curl -X POST ${apiUrl}/api/send \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "template": "password-reset",
    "to": "user@gmail.com",
    "data": {
      "name": "John",
      "code": "482921"
    }
  }'`,
              js: `await fetch('${apiUrl}/api/send', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    template: 'password-reset',
    to: 'user@gmail.com',
    data: { name: 'John', code: '482921' }
  })
});`,
              python: `import requests

requests.post(
  "${apiUrl}/api/send",
  headers={"Authorization": "Bearer YOUR_API_KEY"},
  json={
    "template": "password-reset",
    "to": "user@gmail.com",
    "data": {"name": "John", "code": "482921"},
  },
)`,
            }}
          />
        </div>

        <div>
          <h2 className="text-xl font-bold text-primary-sendlib mb-3">Starter slugs</h2>
          <div className="overflow-hidden rounded-xl border border-outline-variant text-sm">
            <table className="w-full">
              <thead className="bg-surface-container-low text-left text-xs uppercase tracking-wider text-secondary">
                <tr>
                  <th className="px-4 py-2.5">Slug</th>
                  <th className="px-4 py-2.5">Variables</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/50">
                {[
                  ["welcome", "name, product"],
                  ["verify-email", "name, link"],
                  ["password-reset", "name, code"],
                  ["otp", "name, code"],
                  ["invoice", "name, amount, invoice_id, date"],
                  ["payment-successful", "name, amount, product"],
                  ["payment-failed", "name, amount, retry_url"],
                  ["subscription-expiring", "name, plan, date"],
                  ["account-suspended", "name, reason, support_url"],
                ].map(([slug, vars]) => (
                  <tr key={slug}>
                    <td className="px-4 py-2 font-mono text-xs text-primary-sendlib">{slug}</td>
                    <td className="px-4 py-2 text-xs">{vars}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl border border-outline-variant bg-surface-container-low p-4 text-sm space-y-2">
          <p>
            <strong className="text-primary-sendlib">from</strong>: optional if you have one Gmail
            connected. Required if you have several.
          </p>
          <p>
            <strong className="text-primary-sendlib">Missing data</strong>: the API returns 400
            listing the empty <code>{"{{variables}}"}</code>.
          </p>
          <p>
            <strong className="text-primary-sendlib">Custom HTML</strong>: omit{" "}
            <code>template</code> and send <code>subject</code> + <code>html</code> as before.
          </p>
        </div>
      </div>

      <DocsPagination
        prev={{ title: "Batch Send", href: "/docs/batch" }}
        next={{ title: "Debugger", href: "/docs/debugger" }}
      />
    </div>
  );
}

"use client";

import { DocsPagination } from "@/components/docs/DocsPagination";
import { useEffect, useState } from "react";

import { EditableCodeBlock } from "@/components/docs/EditableCodeBlock";

export default function BatchSendPage() {
  const [apiUrl, setApiUrl] = useState("https://sendliberty.com");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setApiUrl(window.location.origin);
    }
  }, []);

  return (
    <div className="max-w-3xl">
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <h1 className="text-3xl font-bold tracking-tight text-primary-sendlib mb-4">
            Batch Email Sending
          </h1>
          <span className="text-xs font-bold px-2 py-1 rounded-full bg-primary-sendlib text-on-primary uppercase tracking-wider mb-4">
            Pro
          </span>
        </div>
        <p className="text-secondary text-lg leading-relaxed">
          <strong>You must be subscribed to Pro first.</strong> Send one email to hundreds of
          recipients in a single API call. Sendliberty queues the job and delivers each email in the
          background, automatically respecting Gmail&apos;s rate limits.
        </p>
      </div>

      <div className="space-y-10 text-secondary leading-relaxed">
        {/* How it works */}
        <div>
          <h2 className="text-xl font-bold text-primary-sendlib mb-3">How it works</h2>
          <p>
            We handle the rate limits, the exponential backoff, and the background queueing so you
            don&apos;t have to build any of that complex infrastructure yourself. Unlike{" "}
            <code>/api/send</code> which delivers immediately and blocks until done,{" "}
            <code>/api/batch</code> accepts your full recipient list, queues a background job, and
            returns a <code>batchId</code> instantly. Our background workers then drip the emails
            out one at a time, perfectly paced to stay under Google&apos;s radar. You just poll{" "}
            <code>/api/batch/:id</code> to track the progress!
          </p>
          <div className="mt-4 grid grid-cols-3 gap-3 text-center text-sm">
            {[
              { step: "1", label: "POST /api/batch", sub: "Returns batchId immediately" },
              { step: "2", label: "Worker sends emails", sub: "Throttled, respects Gmail limits" },
              { step: "3", label: "Poll for progress", sub: "GET /api/batch/:id" },
            ].map((s) => (
              <div
                key={s.step}
                className="p-4 rounded-xl border border-outline-variant bg-surface-container-low"
              >
                <div className="text-2xl font-black text-primary-sendlib mb-1">{s.step}</div>
                <div className="font-bold text-on-background text-xs">{s.label}</div>
                <div className="text-xs text-secondary mt-1">{s.sub}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Step 1: Send the batch */}
        <div>
          <h2 className="text-xl font-bold text-primary-sendlib mb-3">Step 1: Send the batch</h2>
          <EditableCodeBlock
            title="POST /api/batch"
            snippets={{
              curl: `curl -X POST ${apiUrl}/api/batch \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "from": "Your App <yourapp@gmail.com>",
    "subject": "Hey {{name}}, big news!",
    "html": "<p>Hi {{name}}, welcome to {{company}}!</p>",
    "recipients": [
      { "email": "john@example.com", "variables": { "name": "John", "company": "Acme" } },
      { "email": "jane@example.com", "variables": { "name": "Jane", "company": "Beta" } }
    ]
  }'`,
              js: `await fetch('${apiUrl}/api/batch', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    from: 'Your App <yourapp@gmail.com>',
    subject: 'Hey {{name}}, big news!',
    html: '<p>Hi {{name}}, welcome to {{company}}!</p>',
    recipients: [
      { email: 'john@example.com', variables: { name: 'John', company: 'Acme' } },
      { email: 'jane@example.com', variables: { name: 'Jane', company: 'Beta' } }
    ]
  })
});`,
              python: `import requests

url = "${apiUrl}/api/batch"
headers = {
  "Authorization": "Bearer YOUR_API_KEY",
  "Content-Type": "application/json"
}
payload = {
  "from": "Your App <yourapp@gmail.com>",
  "subject": "Hey {{name}}, big news!",
  "html": "<p>Hi {{name}}, welcome to {{company}}!</p>",
  "recipients": [
    { "email": "john@example.com", "variables": { "name": "John", "company": "Acme" } },
    { "email": "jane@example.com", "variables": { "name": "Jane", "company": "Beta" } }
  ]
}

res = requests.post(url, json=payload, headers=headers)`,
              go: `package main

import (
  "bytes"
  "encoding/json"
  "net/http"
)

func main() {
  payload, _ := json.Marshal(map[string]interface{}{
    "from":    "Your App <yourapp@gmail.com>",
    "subject": "Hey {{name}}, big news!",
    "html":    "<p>Hi {{name}}, welcome to {{company}}!</p>",
    "recipients": []map[string]interface{}{
      {"email": "john@example.com", "variables": map[string]string{"name": "John", "company": "Acme"}},
      {"email": "jane@example.com", "variables": map[string]string{"name": "Jane", "company": "Beta"}},
    },
  })
  req, _ := http.NewRequest("POST", "${apiUrl}/api/batch", bytes.NewBuffer(payload))
  req.Header.Set("Authorization", "Bearer YOUR_API_KEY")
  req.Header.Set("Content-Type", "application/json")
  
  http.DefaultClient.Do(req)
}`,
              rust: `use serde_json::json;

#[tokio::main]
async fn main() -> Result<(), reqwest::Error> {
  let client = reqwest::Client::new();
  let payload = json!({
    "from": "Your App <yourapp@gmail.com>",
    "subject": "Hey {{name}}, big news!",
    "html": "<p>Hi {{name}}, welcome to {{company}}!</p>",
    "recipients": [
      { "email": "john@example.com", "variables": { "name": "John", "company": "Acme" } },
      { "email": "jane@example.com", "variables": { "name": "Jane", "company": "Beta" } }
    ]
  });
  
  client.post("${apiUrl}/api/batch")
    .header("Authorization", "Bearer YOUR_API_KEY")
    .json(&payload)
    .send()
    .await?;
    
  Ok(())
}`,
              php: `<?php
$ch = curl_init('${apiUrl}/api/batch');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
  'Authorization: Bearer YOUR_API_KEY',
  'Content-Type: application/json'
]);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
  'from' => 'Your App <yourapp@gmail.com>',
  'subject' => 'Hey {{name}}, big news!',
  'html' => '<p>Hi {{name}}, welcome to {{company}}!</p>',
  'recipients' => [
    [ 'email' => 'john@example.com', 'variables' => [ 'name' => 'John', 'company' => 'Acme' ] ],
    [ 'email' => 'jane@example.com', 'variables' => [ 'name' => 'Jane', 'company' => 'Beta' ] ]
  ]
]));

curl_exec($ch);`,
              net: `using System.Net.Http;
using System.Text;
using System.Text.Json;

var client = new HttpClient();
client.DefaultRequestHeaders.Add("Authorization", "Bearer YOUR_API_KEY");

var payload = new {
  from = "Your App <yourapp@gmail.com>",
  subject = "Hey {{name}}, big news!",
  html = "<p>Hi {{name}}, welcome to {{company}}!</p>",
  recipients = new[] { 
    new { email = "john@example.com", variables = new { name = "John", company = "Acme" } },
    new { email = "jane@example.com", variables = new { name = "Jane", company = "Beta" } }
  }
};

var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
var response = await client.PostAsync("${apiUrl}/api/batch", content);
var result = await response.Content.ReadAsStringAsync();
Console.WriteLine(result);`,
              java: `import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

var client = HttpClient.newHttpClient();
var payload = """
    {
      "from": "Your App <yourapp@gmail.com>",
      "subject": "Hey {{name}}, big news!",
      "html": "<p>Hi {{name}}, welcome to {{company}}!</p>",
      "recipients": [
        { "email": "john@example.com", "variables": { "name": "John", "company": "Acme" } },
        { "email": "jane@example.com", "variables": { "name": "Jane", "company": "Beta" } }
      ]
    }
    """;

var request = HttpRequest.newBuilder()
  .uri(URI.create("${apiUrl}/api/batch"))
  .header("Authorization", "Bearer YOUR_API_KEY")
  .header("Content-Type", "application/json")
  .POST(HttpRequest.BodyPublishers.ofString(payload))
  .build();

var response = client.send(request, HttpResponse.BodyHandlers.ofString());
System.out.println(response.body());`,
            }}
          />

          <h3 className="text-base font-bold text-primary-sendlib mt-6 mb-3">
            Request body fields
          </h3>
          <div className="overflow-x-auto rounded-xl border border-outline-variant">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-outline-variant bg-surface-variant/40">
                  <th className="text-left px-4 py-3 font-semibold text-primary-sendlib">Field</th>
                  <th className="text-left px-4 py-3 font-semibold text-primary-sendlib">Type</th>
                  <th className="text-left px-4 py-3 font-semibold text-primary-sendlib">
                    Required
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-primary-sendlib">
                    Description
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/50 text-secondary">
                {[
                  {
                    field: "from",
                    type: "string",
                    req: "Yes",
                    desc: 'Connected Gmail account to send from. Supports display name format: "Brand <you@gmail.com>"',
                  },
                  {
                    field: "subject",
                    type: "string",
                    req: "Yes",
                    desc: "Email subject. Supports {{variable}} interpolation.",
                  },
                  {
                    field: "recipients",
                    type: "array",
                    req: "Yes",
                    desc: "List of recipient objects (see below). Max 450 for @gmail.com, 2,000 for Workspace.",
                  },
                  {
                    field: "html",
                    type: "string",
                    req: "one of",
                    desc: "HTML email body. Supports {{variable}} interpolation.",
                  },
                  {
                    field: "text",
                    type: "string",
                    req: "one of",
                    desc: "Plain text fallback body. Supports {{variable}} interpolation.",
                  },
                  {
                    field: "replyTo",
                    type: "string",
                    req: "Optional",
                    desc: "Reply-to email address.",
                  },
                ].map((r) => (
                  <tr key={r.field} className="hover:bg-surface-variant/20 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs">
                      <code>{r.field}</code>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-secondary">{r.type}</td>
                    <td className="px-4 py-3 text-xs">{r.req}</td>
                    <td className="px-4 py-3 text-xs">{r.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <h3 className="text-base font-bold text-primary-sendlib mt-5 mb-3">Recipient object</h3>
          <div className="overflow-x-auto rounded-xl border border-outline-variant">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-outline-variant bg-surface-variant/40">
                  <th className="text-left px-4 py-3 font-semibold text-primary-sendlib">Field</th>
                  <th className="text-left px-4 py-3 font-semibold text-primary-sendlib">Type</th>
                  <th className="text-left px-4 py-3 font-semibold text-primary-sendlib">
                    Required
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-primary-sendlib">
                    Description
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/50 text-secondary">
                <tr className="hover:bg-surface-variant/20 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs">
                    <code>email</code>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">string</td>
                  <td className="px-4 py-3 text-xs">Yes</td>
                  <td className="px-4 py-3 text-xs">Recipient&apos;s email address.</td>
                </tr>
                <tr className="hover:bg-surface-variant/20 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs">
                    <code>variables</code>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">object</td>
                  <td className="px-4 py-3 text-xs">Optional</td>
                  <td className="px-4 py-3 text-xs">
                    Key/value pairs used to personalise the subject, html, and text for this
                    recipient via <code>{"{{key}}"}</code> placeholders.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 className="text-base font-bold text-primary-sendlib mt-5 mb-2">
            Response: <code>202 Accepted</code>
          </h3>
          <pre className="p-4 bg-surface-container-high border border-outline-variant/50 rounded-lg text-sm font-mono text-white/95 overflow-x-auto whitespace-pre leading-relaxed">{`{
  "success": true,
  "batchId": "64f1a2b3c4d5e6f7a8b9c0d1",
  "total": 2,
  "status": "queued"
}`}</pre>
        </div>

        {/* Step 2: Poll progress */}
        <div>
          <h2 className="text-xl font-bold text-primary-sendlib mb-3">Step 2: Poll for progress</h2>
          <EditableCodeBlock
            title="GET /api/batch/:batchId"
            snippets={{
              curl: `curl ${apiUrl}/api/batch/BATCH_ID \\\n  -H "Authorization: Bearer YOUR_API_KEY"`,
              js: `await fetch('${apiUrl}/api/batch/BATCH_ID', {\n  headers: { 'Authorization': 'Bearer YOUR_API_KEY' }\n});`,
              python: `import requests\n\nres = requests.get(\n  "${apiUrl}/api/batch/BATCH_ID",\n  headers={"Authorization": "Bearer YOUR_API_KEY"}\n)`,
              go: `package main\n\nimport "net/http"\n\nfunc main() {\n  req, _ := http.NewRequest("GET", "${apiUrl}/api/batch/BATCH_ID", nil)\n  req.Header.Set("Authorization", "Bearer YOUR_API_KEY")\n  http.DefaultClient.Do(req)\n}`,
              rust: `let client = reqwest::Client::new();\nclient.get("${apiUrl}/api/batch/BATCH_ID")\n  .header("Authorization", "Bearer YOUR_API_KEY")\n  .send()\n  .await?;`,
              php: `<?php\n$ch = curl_init('${apiUrl}/api/batch/BATCH_ID');\ncurl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Bearer YOUR_API_KEY']);\ncurl_exec($ch);`,
              net: `using System.Net.Http;\n\nvar client = new HttpClient();\nclient.DefaultRequestHeaders.Add("Authorization", "Bearer YOUR_API_KEY");\nvar response = await client.GetAsync("${apiUrl}/api/batch/BATCH_ID");`,
              java: `import java.net.URI;\nimport java.net.http.HttpClient;\nimport java.net.http.HttpRequest;\n\nvar request = HttpRequest.newBuilder()\n  .uri(URI.create("${apiUrl}/api/batch/BATCH_ID"))\n  .header("Authorization", "Bearer YOUR_API_KEY")\n  .GET()\n  .build();`,
            }}
          />

          <h3 className="text-base font-bold text-primary-sendlib mt-5 mb-2">Response</h3>
          <pre className="p-4 bg-surface-container-high border border-outline-variant/50 rounded-lg text-sm font-mono text-white/95 overflow-x-auto whitespace-pre leading-relaxed">{`{
  "success": true,
  "batchId": "64f1a2b3c4d5e6f7a8b9c0d1",
  "status": "processing",
  "total": 2,
  "sent": 1,
  "failed": 0,
  "progress": 50,
  "recipients": [
    { "email": "john@example.com", "status": "sent", "messageId": "18b3f...", "error": null },
    { "email": "jane@example.com", "status": "pending", "messageId": null, "error": null }
  ]
}`}</pre>

          <h3 className="text-base font-bold text-primary-sendlib mt-5 mb-3">Job statuses</h3>
          <div className="overflow-x-auto rounded-xl border border-outline-variant">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-outline-variant bg-surface-variant/40">
                  <th className="text-left px-4 py-3 font-semibold text-primary-sendlib">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-primary-sendlib">
                    Meaning
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/50 text-secondary">
                {[
                  { s: "queued", m: "Job created, waiting for the worker to pick it up." },
                  { s: "processing", m: "Worker is actively sending emails." },
                  {
                    s: "paused_limit_reached",
                    m: "Gmail daily sending limit reached. Job will automatically resume when quota resets.",
                  },
                  {
                    s: "done",
                    m: "All recipients have been processed. Check sent / failed counts.",
                  },
                  { s: "failed", m: "Unexpected internal error. Contact support." },
                ].map((r) => (
                  <tr key={r.s} className="hover:bg-surface-variant/20 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs">
                      <code>{r.s}</code>
                    </td>
                    <td className="px-4 py-3 text-xs">{r.m}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Limits */}
        <div>
          <h2 className="text-xl font-bold text-primary-sendlib mb-3">Limits</h2>
          <div className="overflow-x-auto rounded-xl border border-outline-variant">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-outline-variant bg-surface-variant/40">
                  <th className="text-left px-4 py-3 font-semibold text-primary-sendlib">Limit</th>
                  <th className="text-left px-4 py-3 font-semibold text-primary-sendlib">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/50 text-secondary">
                {[
                  { l: "Max recipients: @gmail.com account", v: "450 per batch" },
                  { l: "Max recipients: Google Workspace account", v: "2,000 per batch" },
                  { l: "Duplicate emails in same batch", v: "Auto-deduplicated" },
                  { l: "Attachments", v: "Not supported (see below)" },
                  { l: "Job history retention", v: "90 days, then auto-deleted" },
                ].map((r) => (
                  <tr key={r.l} className="hover:bg-surface-variant/20 transition-colors">
                    <td className="px-4 py-3 text-xs">{r.l}</td>
                    <td className="px-4 py-3 font-bold text-primary-sendlib text-xs">{r.v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-secondary mt-3">
            The recipient cap matches Gmail&apos;s own daily sending limit for the connected
            account. If your batch hits the daily limit mid-send (e.g., you already sent emails
            earlier today), the job status will change to <code>paused_limit_reached</code>. You do
            not need to do anything! Sendliberty automatically tracks Gmail&apos;s 24-hour rolling
            quota and will automatically resume sending the remaining recipients as soon as your
            limit resets. To send to more people immediately without waiting, connect additional
            Gmail accounts and split batches across them using different <code>from</code>{" "}
            addresses.
          </p>
        </div>

        {/* Why no attachments */}
        <div className="p-5 rounded-xl border border-outline-variant bg-surface-container-low">
          <h3 className="font-bold text-on-background text-base mb-2">
            Why can&apos;t I send attachments in a batch?
          </h3>
          <p className="text-sm text-secondary">
            Attachments are intentionally not supported on <code>/api/batch</code>. If you attach a
            file to a batch of 500 emails, Sendliberty would have to base64-encode and upload that
            file 500 separate times to Gmail&apos;s API. That is extremely slow, memory-intensive,
            and would burn through your daily quota much faster than expected.
          </p>
          <p className="text-sm text-secondary mt-3">
            The right approach is to <strong>host your file</strong> somewhere (e.g. your own
            server, AWS S3, Google Drive, or any CDN) and include a download link in your{" "}
            <code>html</code> or <code>text</code> body. Your recipients get the same experience,
            and your batch sends are fast.
          </p>
        </div>

        {/* Error responses */}
        <div>
          <h2 className="text-xl font-bold text-primary-sendlib mb-3">Error responses</h2>
          <div className="overflow-x-auto rounded-xl border border-outline-variant">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-outline-variant bg-surface-variant/40">
                  <th className="text-left px-4 py-3 font-semibold text-primary-sendlib">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-primary-sendlib">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/50 text-secondary">
                {[
                  { s: "401", r: "Missing or invalid API key." },
                  { s: "403", r: "Free plan: upgrade to Pro to use batch sending." },
                  { s: "400", r: "Validation error: check the message field for details." },
                  { s: "413", r: "HTML or text body exceeds the size limit." },
                  { s: "429", r: "Rate limit exceeded: check the Retry-After header." },
                  { s: "500", r: "Internal server error." },
                ].map((r) => (
                  <tr key={r.s} className="hover:bg-surface-variant/20 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-bold text-primary-sendlib">
                      <code>{r.s}</code>
                    </td>
                    <td className="px-4 py-3 text-xs">{r.r}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Deliverability Best Practices */}
        <div className="mt-12 mb-8">
          <h2 className="text-xl font-bold text-primary-sendlib mb-4">
            Best Practices for Deliverability
          </h2>
          <div className="p-6 rounded-xl border border-outline-variant bg-surface-container-low space-y-4">
            <p className="text-sm text-secondary leading-relaxed">
              When sending bulk emails from a personal <code>@gmail.com</code> account (as opposed
              to a verified Google Workspace custom domain), Google&apos;s spam filters can be
              highly aggressive. To ensure your batch reaches the primary inbox rather than the spam
              folder, we strongly recommend the following:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-sm text-secondary">
              <li>
                <strong>Send plain text or light HTML:</strong> Avoid heavy layouts, large images,
                and giant colorful buttons. The more your email looks like a genuine 1-on-1 human
                email, the better.
              </li>
              <li>
                <strong>Minimize links:</strong> Try to include zero or at most one link in your
                first cold email to a new recipient.
              </li>
              <li>
                <strong>Avoid spam trigger words:</strong> Do not use highly commercial language
                like &quot;Action Required&quot;, &quot;Free Trial&quot;, &quot;Buy Now&quot;, or
                &quot;Upgrade&quot;.
              </li>
              <li>
                <strong>Only email expecting recipients:</strong> Sendliberty automatically
                throttles your sending speed to keep you under Google&apos;s radar, but if a high
                percentage of recipients manually click &quot;Report Spam&quot;, Google will
                permanently penalize your connected account.
              </li>
            </ul>

            <div className="mt-8 mb-6">
              <h3 className="font-bold text-primary-sendlib text-sm mb-3">
                Example: Avoiding Spam Triggers
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-red-500/30 bg-red-500/5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="bg-red-500/20 text-red-500 text-[10px] uppercase font-bold px-2 py-1 rounded">
                      High Spam Risk
                    </span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex gap-2">
                      <span className="text-secondary w-16">Subject:</span>
                      <span className="text-on-background font-semibold">
                        Action Required: Your Account is Disconnected!
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-secondary w-16">From:</span>
                      <span className="text-on-background">hello@company.com</span>
                    </div>
                    <div className="mt-4 pt-3 border-t border-red-500/10 text-secondary leading-relaxed">
                      <p className="mb-2">
                        <strong>URGENT:</strong> We detected an error.
                      </p>
                      <p className="mb-3">
                        Click the button below to fix it immediately or lose access.
                      </p>
                      <button className="bg-blue-600 text-white px-4 py-2 rounded pointer-events-none">
                        FIX NOW
                      </button>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="bg-emerald-500/20 text-emerald-500 text-[10px] uppercase font-bold px-2 py-1 rounded">
                      Inbox Friendly
                    </span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex gap-2">
                      <span className="text-secondary w-16">Subject:</span>
                      <span className="text-on-background font-semibold">
                        Quick update regarding your connection
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <span className="text-secondary w-16">From:</span>
                      <span className="text-on-background">
                        "Alex at Company" &lt;hello@company.com&gt;
                      </span>
                    </div>
                    <div className="mt-4 pt-3 border-t border-emerald-500/10 text-secondary leading-relaxed">
                      <p className="mb-2">Hi John,</p>
                      <p className="mb-2">
                        We recently rolled out an update that might have disconnected your account.
                      </p>
                      <p className="mb-3">You can easily restore it by visiting your dashboard.</p>
                      <p>
                        Thanks,
                        <br />
                        Alex
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 p-4 bg-primary-sendlib/5 border border-primary-sendlib/20 rounded-lg">
              <h3 className="font-bold text-primary-sendlib text-sm mb-3">Ideal Use Cases</h3>
              <p className="text-sm text-secondary leading-relaxed mb-3">
                Sendliberty is intentionally designed for high-deliverability 1-on-1 communication.
                It is <strong>not</strong> designed for heavy, image-packed marketing blasts.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2">
                    Great for Sendliberty
                  </h4>
                  <ul className="list-disc pl-4 space-y-1 text-sm text-secondary">
                    <li>Password resets & Magic links</li>
                    <li>Payment receipts & Invoices</li>
                    <li>System alerts & Downtime Notifications</li>
                    <li>Welcome emails from the founder</li>
                    <li>Personalized cold outreach</li>
                    <li>New feature announcements to active users</li>
                    <li>Trial expiration warnings</li>
                    <li>Weekly usage summary reports</li>
                  </ul>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-red-500 uppercase tracking-wider mb-2">
                    Bad for Sendliberty
                  </h4>
                  <ul className="list-disc pl-4 space-y-1 text-sm text-secondary">
                    <li>Weekly marketing newsletters</li>
                    <li>Image-heavy promotional blasts</li>
                    <li>E-commerce product catalogs</li>
                    <li>Discount code mass mailings</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <DocsPagination
        prev={{ title: "Basic Send", href: "/docs/send" }}
        next={{ title: "Templates", href: "/docs/templates" }}
      />
    </div>
  );
}

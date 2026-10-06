"use client";

import { DocsPagination } from "@/components/docs/DocsPagination";
import { useEffect, useState } from "react";

import { EditableCodeBlock } from "@/components/docs/EditableCodeBlock";

export default function BasicSendPage() {
  const [apiUrl, setApiUrl] = useState("https://sendlib.samueltuoyo.com");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setApiUrl(window.location.origin);
    }
  }, []);

  return (
    <div className="max-w-3xl">
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight text-primary-sendlib mb-4">Basic Send</h1>
        <p className="text-secondary text-lg leading-relaxed">
          Send a single transactional email instantly using the Sendlib REST API.
        </p>
      </div>

      <div className="space-y-6 text-secondary leading-relaxed">
        <p>
          To send an email, make a secure HTTP <code>POST</code> request to the{" "}
          <code>/api/send</code> endpoint. If you have connected multiple Gmail accounts, you can
          specify which one to use by passing the <code>from</code> field in your request body. If
          omitted, Sendlib automatically defaults to your first connected Gmail account.
        </p>

        <div className="mt-8">
          <EditableCodeBlock
            title="Example Request"
            snippets={{
              curl: `curl -X POST ${apiUrl}/api/send \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "from": "\\"Your Brand Name\\" <yourproduct@gmail.com>",
    "to": "user@example.com",
    "subject": "Hello via REST API",
    "html": "<p>No SMTP configuration needed!</p>",
    "replyTo": "support@yourdomain.com",
    "attachments": [
      { "filename": "invoice.pdf", "content": "JVBERi0xLjQKJ..." }
    ]
  }'`,
              js: `await fetch('${apiUrl}/api/send', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    from: '"Your Brand Name" <yourproduct@gmail.com>',
    to: 'user@example.com',
    subject: 'Hello via Fetch!',
    html: '<p>No SMTP configuration needed!</p>',
    replyTo: 'support@yourdomain.com',
    attachments: [
      { filename: 'invoice.pdf', content: 'JVBERi0xLjQKJ...' }
    ]
  })
});`,
              python: `import requests

url = "${apiUrl}/api/send"
headers = {
  "Authorization": "Bearer YOUR_API_KEY",
  "Content-Type": "application/json"
}
payload = {
  "from": '"Your Brand Name" <yourproduct@gmail.com>',
  "to": "user@example.com",
  "subject": "Hello via Python!",
  "html": "<p>No SMTP configuration needed!</p>",
  "replyTo": "support@yourdomain.com",
  "attachments": [
    { "filename": "invoice.pdf", "content": "JVBERi0xLjQKJ..." }
  ]
}

response = requests.post(url, json=payload, headers=headers)
print(response.json())`,
              go: `package main

import (
  "bytes"
  "encoding/json"
  "net/http"
)

func main() {
  payload, _ := json.Marshal(map[string]interface{}{
    "from":    '"Your Brand Name" <yourproduct@gmail.com>',
    "to":      "user@example.com",
    "subject": "Hello via Go!",
    "html":    "<p>No SMTP configuration needed!</p>",
    "replyTo": "support@yourdomain.com",
  })
  req, _ := http.NewRequest("POST", "${apiUrl}/api/send", bytes.NewBuffer(payload))
  req.Header.Set("Authorization", "Bearer YOUR_API_KEY")
  req.Header.Set("Content-Type", "application/json")
  
  http.DefaultClient.Do(req)
}`,
              rust: `use serde_json::json;

#[tokio::main]
async fn main() -> Result<(), reqwest::Error> {
  let client = reqwest::Client::new();
  let payload = json!({
    "from": '"Your Brand Name" <yourproduct@gmail.com>',
    "to": "user@example.com",
    "subject": "Hello via Rust!",
    "html": "<p>No SMTP configuration needed!</p>",
    "replyTo": "support@yourdomain.com"
  });
  
  client.post("${apiUrl}/api/send")
    .header("Authorization", "Bearer YOUR_API_KEY")
    .json(&payload)
    .send()
    .await?;
    
  Ok(())
}`,
              php: `<?php
$ch = curl_init('${apiUrl}/api/send');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
  'Authorization: Bearer YOUR_API_KEY',
  'Content-Type: application/json'
]);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
  'from' => '"Your Brand Name" <yourproduct@gmail.com>',
  'to' => 'user@example.com',
  'subject' => 'Hello via PHP!',
  'html' => '<p>No SMTP configuration needed!</p>',
  'replyTo' => 'support@yourdomain.com'
]));

curl_exec($ch);`,
              net: `using System.Net.Http;
using System.Text;
using System.Text.Json;

var client = new HttpClient();
client.DefaultRequestHeaders.Add("Authorization", "Bearer YOUR_API_KEY");

var payload = new {
  from = '"Your Brand Name" <yourproduct@gmail.com>',
  to = "user@example.com",
  subject = "Hello via .NET!",
  html = "<p>No SMTP configuration needed!</p>",
  replyTo = "support@yourdomain.com",
  attachments = new[] { new { filename = "invoice.pdf", content = "JVBERi0xLjQKJ..." } }
};

var content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");
var response = await client.PostAsync("${apiUrl}/api/send", content);
var result = await response.Content.ReadAsStringAsync();
Console.WriteLine(result);`,
              java: `import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

var client = HttpClient.newHttpClient();
var payload = """
    {
      "from": "\\"Your Brand Name\\" <yourproduct@gmail.com>",
      "to": "user@example.com",
      "subject": "Hello via Java!",
      "html": "<p>No SMTP configuration needed!</p>",
      "replyTo": "support@yourdomain.com",
      "attachments": [
        { "filename": "invoice.pdf", "content": "JVBERi0xLjQKJ..." }
      ]
    }
    """;

var request = HttpRequest.newBuilder()
  .uri(URI.create("${apiUrl}/api/send"))
  .header("Authorization", "Bearer YOUR_API_KEY")
  .header("Content-Type", "application/json")
  .POST(HttpRequest.BodyPublishers.ofString(payload))
  .build();

var response = client.send(request, HttpResponse.BodyHandlers.ofString());
System.out.println(response.body());`,
            }}
          />
        </div>

        <div className="p-5 rounded-xl border border-outline-variant bg-surface-container-low mt-8 space-y-2">
          <h4 className="font-bold text-primary-sendlib text-base">Authentication Headers</h4>
          <p className="text-sm text-secondary">
            You can authenticate your requests with Sendlib in two ways:
          </p>
          <ul className="list-disc pl-5 space-y-2 text-secondary">
            <li>
              <strong>Authorization Header:</strong> Send your API key as a Bearer token:{" "}
              <code>Authorization: Bearer YOUR_API_KEY</code>
            </li>
            <li>
              <strong>Custom x-api-key Header:</strong> If your HTTP client or environment makes
              Bearer auth difficult, pass it directly: <code>x-api-key: YOUR_API_KEY</code>
            </li>
          </ul>
        </div>

        <h3 className="text-xl font-bold text-primary-sendlib mt-8 mb-4">
          Request Body Parameters
        </h3>
        <ul className="list-disc pl-5 space-y-4 text-secondary">
          <li>
            <strong>from</strong> (string, required): The connected Gmail email address you want to
            send this email from. You can optionally include a custom display name by using the
            format <code>"Your Brand Name" &lt;yourproduct@gmail.com&gt;</code>.
            <div className="mt-4 mb-2 p-6 rounded-xl border border-outline-variant/30 bg-surface-container-low/40 space-y-4">
              <div className="flex items-center gap-3">
                <span className="bg-primary-sendlib text-surface-container-lowest text-xs font-bold px-2 py-1 rounded uppercase tracking-wider">
                  Pro Tip
                </span>
                <h4 className="font-bold text-primary-sendlib text-lg m-0">
                  Look Professional with Display Names
                </h4>
              </div>
              <p className="text-sm text-secondary">
                By default, if you just send your email address (e.g.{" "}
                <code>yourproduct@gmail.com or in my case, samueltuoyo9082@gmail.com</code>), that
                is exactly what your recipients will see in their inbox. This can look
                unprofessional.
              </p>
              <p className="text-sm text-secondary">
                Instead, we highly recommend adding a <strong>Display Name</strong>. Just format
                your address like this:
              </p>
              <div className="rounded-lg overflow-hidden border border-outline-variant/30 shadow-sm my-4">
                <img
                  src="/compare.png"
                  alt="Comparison between using a display name and not using one"
                  className="w-full h-auto block"
                />
              </div>
              <p className="text-xs text-secondary italic">
                <strong>Top:</strong> Format using{" "}
                <code>"Sendlib" &lt;samueltuoyo9082@gmail.com&gt;</code>
                <br />
                <strong>Bottom:</strong> Format using just <code>samueltuoyo9082@gmail.com</code>
              </p>
            </div>
          </li>
          <li>
            <strong>to</strong> (string or array of strings): The recipient&apos;s email address (or
            array of addresses).
          </li>
          <li>
            <strong>subject</strong> (string): The subject line of the email.
          </li>
          <li>
            <strong>html</strong> (string): The HTML body content of the email.
          </li>
          <li>
            <strong>text</strong> (string, optional): The plain text fallback body.
          </li>
          <li>
            <strong>replyTo</strong> (string, optional): Setup a reply-to email address.
          </li>
          <li>
            <strong>cc</strong> (string or array of strings, optional): carbon copy recipient(s).
          </li>
          <li>
            <strong>bcc</strong> (string or array of strings, optional): blind carbon copy
            recipient(s).
          </li>
          <li>
            <strong>attachments</strong> (array of objects, optional): An array of attachments to
            include:
            <ul className="list-disc pl-5 mt-2 space-y-2">
              <li>
                <code>filename</code> (string, required): The name of the file (e.g.{" "}
                <code>invoice.pdf</code>).
              </li>
              <li>
                <code>content</code> (string, required): The base64-encoded file content.
              </li>
              <li>
                <code>type</code> (string, optional): The MIME content type (e.g.{" "}
                <code>application/pdf</code>).
              </li>
            </ul>
          </li>
        </ul>

        <div className="p-4 border border-outline-variant/60 bg-surface-container-low rounded-xl text-sm text-secondary mt-8">
          Need details on rate limits or request body size caps? Check out the{" "}
          <a href="/docs/limits" className="font-bold text-primary-sendlib hover:underline">
            Limits & Quotas
          </a>{" "}
          documentation page.
        </div>
        <div className="p-4 border border-outline-variant/60 bg-surface-container-low rounded-xl text-sm text-secondary mt-4 space-y-2">
          <p>
            <strong className="text-primary-sendlib">Sending concurrently?</strong> Requests using
            the same personal Gmail account are limited to one accepted send per second; Google
            Workspace accounts are limited to two per second. Sendlib waits for up to 3 seconds for
            a slot, then records a failed log and returns <code>429</code> with a{" "}
            <code>Retry-After</code> header. Serialize sends per Gmail account and retry only after
            the indicated delay, or use <code>/api/batch</code> for a recipient list.
          </p>
        </div>
        {/* Deliverability Best Practices */}
        <div className="mt-12 mb-8">
          <h2 className="text-xl font-bold text-primary-sendlib mb-4">
            Best Practices for Deliverability
          </h2>
          <div className="p-6 rounded-xl border border-outline-variant bg-surface-container-low space-y-4">
            <p className="text-sm text-secondary leading-relaxed">
              When sending emails from a personal <code>@gmail.com</code> account (as opposed to a
              verified Google Workspace custom domain), Google&apos;s spam filters can be highly
              aggressive. A successful API response means Gmail accepted the message; it cannot
              guarantee that Gmail or the recipient&apos;s provider will place it in the primary
              inbox. To improve your chances of inbox placement, we strongly recommend the
              following:
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
                <strong>Only email expecting recipients:</strong> Sendlib automatically throttles
                your sending speed to keep you under Google&apos;s radar, but if a high percentage
                of recipients manually click &quot;Report Spam&quot;, Google will permanently
                penalize your connected account.
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
                Sendlib is intentionally designed for high-deliverability 1-on-1 communication. It
                is <strong>not</strong> designed for heavy, image-packed marketing blasts.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2">
                    Great for Sendlib
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
                    Bad for Sendlib
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
        prev={{ title: "API Keys", href: "/docs/keys" }}
        next={{ title: "Batch Send", href: "/docs/batch" }}
      />
    </div>
  );
}

import { DocsPagination } from "@/components/docs/DocsPagination";
import Link from "next/link";

export default function ApiKeysPage() {
  return (
    <div className="max-w-3xl">
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight text-primary-sendlib mb-4">API Keys</h1>
        <p className="text-secondary text-lg leading-relaxed">
          Authentication and security for your API requests.
        </p>
      </div>

      <div className="space-y-6 text-secondary leading-relaxed">
        <p>
          To interact with the Sendlib API, you must include a valid API key in your request header.
        </p>

        <h3 className="text-xl font-bold text-primary-sendlib mt-8 mb-4">Generating a Key</h3>
        <ul className="list-disc pl-5 space-y-2 text-[#75777d]">
          <li>
            Go to the{" "}
            <Link
              href="/dashboard/keys"
              className="text-indigo-600 hover:text-indigo-700 underline font-semibold"
            >
              API Keys
            </Link>{" "}
            section in your dashboard.
          </li>
          <li>
            Click{" "}
            <Link
              href="/dashboard/keys"
              className="text-indigo-600 hover:text-indigo-700 underline font-semibold"
            >
              Generate New Key
            </Link>
            .
          </li>
          <li>
            Copy the key immediately. For security reasons, it will never be fully visible again.
          </li>
        </ul>

        <h3 className="text-xl font-bold text-primary-sendlib mt-8 mb-4">
          Restrict a key to one sender
        </h3>
        <p>
          Choose a Sender account when generating or editing a key. A restricted key can only send
          from that connected email address, including batch sends. Attempts to use a different
          sender return HTTP 403. For single sends, you can omit <code>from</code> to use the
          assigned email automatically; batch requests still require <code>from</code>.
        </p>
        <p>
          Existing keys continue to allow all connected accounts until you restrict them. You can
          update a key without changing its secret. Disconnecting its assigned account blocks
          sending until that email is reconnected or you change the restriction; it never falls back
          to another account. Restrictions apply to delivery and do not limit access to other API
          endpoints.
        </p>

        <div className="p-4 border border-destructive/20 bg-destructive/10 rounded-lg text-destructive text-sm mt-6">
          <strong>Security Warning:</strong> Never commit your API keys to version control (e.g.,
          GitHub). Always use environment variables (e.g., <code>process.env.SL_API_KEY</code>).
        </div>
      </div>

      <DocsPagination
        prev={{ title: "Connecting Gmail", href: "/docs/gmail" }}
        next={{ title: "Basic Send", href: "/docs/send" }}
      />
    </div>
  );
}

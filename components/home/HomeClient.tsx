"use client";

import { useMe } from "@/hooks/useAuth";
import { CodeTab, getCodeSnippet } from "@/utils/codeSnippets";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import TopNavBar from "@/components/home/TopNavBar";
import { GithubIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

export default function HomeClient() {
  const { data: user } = useMe();
  const [apiUrl, setApiUrl] = useState("https://sendlib.samueltuoyo.com");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setApiUrl(window.location.origin);
    }
  }, []);

  const [activeTab, setActiveTab] = useState<CodeTab>("curl");
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const faqs = [
    {
      color: "bg-indigo-500",
      question: "Do I need to verify my domain or configure DNS records?",
      answer:
        "No! Because Sendlib routes your email relay requests securely through your already verified, connected Google accounts, there is absolutely zero DNS configuration required. You do not need to add SPF, DKIM, MX, or TXT records to start sending immediately.",
    },
    {
      color: "bg-purple-500",
      question: "Can I send from my custom domain (e.g. hello@mycompany.com)?",
      answer: (
        <>
          Yes! If your custom company domain is connected to Google Workspace, simply link that
          account to Sendlib via Google OAuth. Sendlib will send transactional emails directly from
          your custom domain (e.g.{" "}
          <code className="bg-surface-variant/80 px-1.5 py-0.5 rounded text-xs">
            hello@mycompany.com
          </code>
          ) with zero extra DNS or SPF configuration required on Sendlib. Plus, Google Workspace
          accounts get up to <strong>1,000 emails/day on Free</strong> (2,000/day on Pro) per
          account!
        </>
      ),
    },
    {
      color: "bg-emerald-500",
      question: "Will my emails land in the inbox?",
      answer:
        "Sendlib submits messages through Google's official Gmail API, but no email service can guarantee inbox placement. Gmail and the recipient's provider still classify each accepted message using sender reputation, content, authentication, recipient engagement, and other signals.",
    },
    {
      color: "bg-pink-500",
      question: "How does this compare to the free tier of Resend, Mailgun, or SendGrid?",
      answer: (
        <>
          Other platforms limit you to only 100 free emails per day on their free plans and require
          strict domain verification. With Sendlib, you can send up to{" "}
          <strong>200 emails/day</strong> per connected personal Gmail account (500/day on Pro), or
          up to <strong>1,000 emails/day</strong> per connected Google Workspace account (2,000/day
          on Pro).
        </>
      ),
    },
    {
      color: "bg-amber-500",
      question: "Can I send attachments and CC/BCC recipients?",
      answer:
        "Yes, our REST API supports complete transactional payloads. You can specify a custom Reply-To header, carbon copies (CC), blind carbon copies (BCC), and pass an array of base64-encoded attachments.",
    },
    {
      color: "bg-blue-500",
      question: "Is my Google account password secure?",
      answer:
        "We never see, ask for, or store your Google password. Authorization is done entirely through standard, secure Google OAuth2 credentials. We only store encrypted access and refresh tokens, which you can manually revoke from your Google Account settings page at any time.",
    },
  ];

  const handleCopyCode = () => {
    const code = getCodeSnippet(activeTab, isExpanded, apiUrl);
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(code);
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = code;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      document.execCommand("copy");
      textArea.remove();
    }
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="w-full flex flex-col min-h-screen bg-background-sendlib text-on-background font-body-md overflow-x-hidden">
      <TopNavBar />

      <main className="flex-grow overflow-x-hidden">
        {/* Hero Section */}
        <section className="w-full relative bg-background-sendlib pt-28 pb-16 md:pt-48 md:pb-32 px-4 md:px-margin-desktop flex flex-col items-center justify-center overflow-hidden">
          <div className="relative w-full max-w-8xl mx-auto flex flex-col items-center justify-center rounded-[2.5rem] md:rounded-none bg-surface-container md:bg-transparent border border-white/10 md:border-none shadow-2xl md:shadow-none overflow-hidden md:overflow-visible px-6 py-16 md:p-0">
            {/* Ambient Background Blurred Blocks - Out of focus shapes */}
            <div className="absolute left-[5%] top-[15%] w-[350px] h-[350px] pointer-events-none opacity-10 md:opacity-30 blur-md md:blur-lg z-0">
              <Image
                src="/block.svg"
                alt=""
                fill
                priority
                aria-hidden
                style={{ objectFit: "contain", transform: "rotate(-15deg)" }}
              />
            </div>
            <div className="absolute left-[25%] top-[-10%] w-[250px] h-[250px] pointer-events-none opacity-15 md:opacity-40 blur-sm md:blur-md z-0">
              <Image
                src="/block.svg"
                alt=""
                fill
                priority
                aria-hidden
                style={{ objectFit: "contain", transform: "rotate(45deg)" }}
              />
            </div>
            <div className="absolute left-[30%] bottom-[5%] w-[400px] h-[400px] pointer-events-none opacity-10 md:opacity-20 blur-lg md:blur-xl z-0">
              <Image
                src="/block.svg"
                alt=""
                fill
                priority
                aria-hidden
                style={{ objectFit: "contain", transform: "rotate(90deg)" }}
              />
            </div>
            <div className="absolute right-[10%] top-[-5%] w-[300px] h-[300px] pointer-events-none opacity-10 md:opacity-30 blur-md md:blur-lg z-0">
              <Image
                src="/block.svg"
                alt=""
                fill
                priority
                aria-hidden
                style={{ objectFit: "contain", transform: "rotate(-45deg)" }}
              />
            </div>
            <div className="absolute right-[25%] bottom-[15%] w-[280px] h-[280px] pointer-events-none opacity-15 md:opacity-40 blur-sm md:blur-md z-0">
              <Image
                src="/block.svg"
                alt=""
                fill
                priority
                aria-hidden
                style={{ objectFit: "contain", transform: "rotate(120deg)" }}
              />
            </div>
            <div className="absolute right-[15%] top-[35%] w-[350px] h-[350px] pointer-events-none opacity-10 md:opacity-20 blur-lg md:blur-xl z-0">
              <Image
                src="/block.svg"
                alt=""
                fill
                priority
                aria-hidden
                style={{ objectFit: "contain", transform: "rotate(180deg)" }}
              />
            </div>

            {/* Sharp Edge Foreground Blocks - Perfectly Horizontally Aligned and Half-Hidden */}
            <div className="absolute left-0 top-[7%] -translate-x-[45%] w-[350px] h-[350px] md:w-[600px] md:h-[600px] pointer-events-none opacity-90 hidden sm:block z-0">
              <Image
                src="/block.svg"
                alt=""
                fill
                priority
                aria-hidden
                style={{ objectFit: "contain", transform: "scaleX(-1)" }}
              />
            </div>
            <div className="absolute right-0 top-[-5%] translate-x-[55%] w-[350px] h-[350px] md:w-[600px] md:h-[600px] pointer-events-none opacity-90 hidden sm:block z-0">
              <Image
                src="/block.svg"
                alt=""
                fill
                priority
                aria-hidden
                style={{ objectFit: "contain" }}
              />
            </div>

            <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center w-full">
              <h1 className="text-[40px] leading-[1.1] md:text-[56px] lg:text-[64px] font-headline-lg-mobile text-center text-white font-extrabold tracking-tight drop-shadow-sm mb-6">
                <span className="md:hidden">
                  Zero Domain
                  <br />
                  Transactional
                  <br />
                  Emails.
                </span>
                <span className="hidden md:block">
                  Send Transactional Emails
                  <br />
                  Without Needing a Domain.
                </span>
              </h1>

              <p className="font-body-lg text-base md:text-lg max-w-[600px] text-center text-secondary leading-relaxed mb-10 px-4 md:px-0">
                The fastest way for founders and devs to send transactional emails using their
                product's existing Gmail. Zero domains needed. Zero stress.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2 mb-4 md:mb-16 w-full">
                {user ? (
                  <Link
                    href="/dashboard"
                    className="hidden md:inline-block bg-surface-container-lowest/10 hover:bg-surface-container-lowest/20 text-white border border-white/25 px-10 py-4 rounded-xl font-label-sm text-label-sm transition-all active:scale-95 backdrop-blur-md text-center w-full sm:w-auto"
                  >
                    Open Console
                  </Link>
                ) : (
                  <Link
                    href="/login"
                    className="hidden md:inline-block bg-surface-container-lowest/10 hover:bg-surface-container-lowest/20 text-white border border-white/25 px-10 py-4 rounded-xl font-label-sm text-label-sm transition-all active:scale-95 backdrop-blur-md text-center w-full sm:w-auto"
                  >
                    Get Started For Free
                  </Link>
                )}
                <Link
                  href="/docs"
                  className="bg-emerald-500 hover:bg-emerald-600 border-0 text-black font-bold px-8 py-3.5 md:px-10 md:py-4 rounded-full md:rounded-xl font-label-sm text-label-sm transition-all active:scale-95 text-center inline-block w-auto"
                >
                  Read Documentation
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Code Snippet Section */}
        <section className="w-full bg-background-sendlib pb-24 px-margin-mobile md:px-margin-desktop relative z-20">
          <div className="max-w-6xl mx-auto">
            <div className="w-full bg-[#090a0f] text-white rounded-2xl font-mono border border-zinc-800 overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.8)] flex flex-col transition-all hover:border-zinc-700 text-left">
              <div className="flex justify-between items-center px-4 py-3 bg-[#12131a] border-b border-zinc-800 gap-2">
                <div className="flex items-center rounded-xl bg-[#07080c] border border-zinc-800/80 p-1 text-xs overflow-x-auto max-w-full flex-1 [ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {(["curl", "js", "python", "go", "rust", "php", "net", "java"] as const).map(
                    (tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer whitespace-nowrap font-sans text-xs md:text-sm font-medium ${
                          activeTab === tab
                            ? "bg-zinc-800 text-white shadow-sm font-bold"
                            : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
                        }`}
                      >
                        {tab === "curl"
                          ? "cURL"
                          : tab === "js"
                            ? "JavaScript"
                            : tab === "python"
                              ? "Python"
                              : tab === "go"
                                ? "Go"
                                : tab === "rust"
                                  ? "Rust"
                                  : tab === "php"
                                    ? "PHP"
                                    : tab === "net"
                                      ? ".NET"
                                      : "Java"}
                      </button>
                    )
                  )}
                </div>
                <button
                  onClick={handleCopyCode}
                  className="text-xs md:text-sm font-sans font-medium text-zinc-300 hover:text-white bg-[#07080c] border border-zinc-800 hover:bg-zinc-800 px-4 py-2 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
                >
                  {isCopied ? "✓ Copied" : "Copy Code"}
                </button>
              </div>
              <pre className="text-xs md:text-[15px] overflow-auto max-h-[500px] leading-loose text-white p-6 md:p-8 custom-scrollbar font-mono">
                {getCodeSnippet(activeTab, isExpanded, apiUrl)}
              </pre>
              <div className="flex justify-between items-center border-t border-zinc-800 text-xs px-6 py-4 bg-[#12131a]">
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-emerald-400 hover:text-emerald-300 font-medium cursor-pointer flex items-center gap-1.5 transition-colors outline-none font-sans"
                >
                  {isExpanded
                    ? "Collapse Parameters ▲"
                    : "Show All Parameters (CC, BCC, Attachments) ▼"}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Comparison Table */}
        <section
          id="features"
          className="py-16 md:py-24 bg-surface-container-lowest border-b border-outline-variant/60"
        >
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <div className="flex flex-col items-center text-center mb-12 space-y-3 w-full">
              <h2 className="text-3xl md:text-4xl font-extrabold text-primary-sendlib">
                Stop worrying about domains. Just send.
              </h2>
              <p className="text-secondary w-full max-w-2xl mx-auto text-base leading-relaxed">
                Traditional email APIs force you to configure DNS records and custom domains before
                sending a single email. Sendlib uses the Gmail account your product already has.
              </p>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-outline-variant shadow-sm bg-surface-container-lowest">
              <table className="w-full text-sm text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low border-b border-outline-variant text-on-background">
                    <th className="px-6 py-4 font-bold text-secondary w-2/5">Feature</th>
                    <th className="px-6 py-4 text-center w-3/10 bg-primary-sendlib/5 border-x border-outline-variant/40">
                      <span className="bg-white text-black text-xs font-extrabold px-3.5 py-1 rounded-full shadow-xs inline-block">
                        Sendlib
                      </span>
                    </th>
                    <th className="px-6 py-4 text-center font-bold text-secondary w-3/10">
                      Traditional Email APIs
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/50">
                  {[
                    {
                      feature: "Zero Domain Verification",
                      sendlib: "Instant (No domain needed)",
                      others: "Required (DNS verification)",
                    },
                    {
                      feature: "Free Emails Per Day",
                      sendlib: "200 to 1,000 / account",
                      others: "100 / day",
                    },
                    {
                      feature: "Uses Existing Product Gmail",
                      sendlib: "Yes (Google OAuth2)",
                      others: "No (Requires SMTP server)",
                    },
                  ].map((row) => (
                    <tr
                      key={row.feature}
                      className="hover:bg-surface-container-lowest/50 transition-colors"
                    >
                      <td className="px-6 py-4 font-semibold text-on-background">{row.feature}</td>
                      <td className="px-6 py-4 text-center font-bold text-emerald-600 bg-primary-sendlib/5 border-x border-outline-variant/40 text-xs sm:text-sm">
                        {row.sendlib}
                      </td>
                      <td className="px-6 py-4 text-center text-secondary text-xs sm:text-sm">
                        {row.others}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section
          className="w-full py-xl md:py-32 bg-surface-container border-b border-outline-variant/60"
          id="pricing"
        >
          <div className="max-w-7xl mx-auto px-margin-mobile md:px-margin-desktop">
            <div className="text-center mb-12 space-y-3">
              <h2 className="font-headline-lg text-headline-lg text-primary-sendlib font-extrabold">
                Simple, Honest Pricing
              </h2>
              <p className="text-secondary font-body-lg max-w-2xl mx-auto">
                Start for free, no credit card required.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto items-start">
              {/* Free Card */}
              <div className="rounded-2xl border-2 border-primary-sendlib bg-surface-container-lowest shadow-lg p-8 flex flex-col gap-6 relative">
                {(!user || user.plan !== "pro") && (
                  <div className="absolute -top-3 left-6">
                    <span className="bg-white text-black text-xs font-bold px-3 py-1 rounded-full tracking-wide">
                      CURRENT PLAN
                    </span>
                  </div>
                )}
                <div>
                  <h3 className="text-2xl font-extrabold text-primary-sendlib">Free</h3>
                  <div className="flex items-end gap-1 mt-1">
                    <span className="text-4xl font-extrabold text-primary-sendlib">$0</span>
                    <span className="text-secondary mb-1">/ forever</span>
                  </div>
                  <p className="text-sm text-secondary mt-2">
                    No credit card. No expiry. No catch.
                  </p>
                </div>
                <ul className="space-y-3 text-sm text-secondary flex-1">
                  {[
                    "Up to 200 emails/day per connected Gmail",
                    "Up to 1,000 emails/day per Workspace account",
                    "Max 3,500 emails/month total",
                    "No custom domain needed",
                    "Up to 3 connected Gmail accounts",
                    "5 API keys",
                    "30 API requests / minute",
                    "2MB HTML body · 1MB text body",
                    "Up to 5 attachments · 1MB per file",
                    "50 recipients per field (to/cc/bcc)",
                    "5 days email log retention",
                  ].map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <svg
                        className="w-4 h-4 mt-0.5 text-emerald-500 shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/login"
                  className="block w-full text-center bg-surface-container-low border border-outline-variant/60 hover:bg-surface-container text-white font-bold py-3 rounded-xl transition-all active:scale-95"
                >
                  Get Started Free
                </Link>
              </div>

              {/* Pro Card */}
              <div className="rounded-2xl border-2 border-primary-sendlib/80 bg-surface-container-lowest shadow-xl p-8 flex flex-col gap-6 relative">
                <div className="absolute -top-3 left-6">
                  <span className="bg-emerald-600 text-white text-xs font-bold px-3 py-1 rounded-full tracking-wide">
                    {user?.plan === "pro" ? "CURRENT PLAN" : "PRO PLAN"}
                  </span>
                </div>

                <div>
                  <h3 className="text-2xl font-extrabold text-primary-sendlib">Pro</h3>
                  <div className="flex items-end gap-1 mt-1">
                    <span className="text-4xl font-extrabold text-primary-sendlib">₦4,000</span>
                    <span className="text-secondary mb-1">/ month</span>
                  </div>
                  <p className="text-sm text-secondary mt-2">
                    Higher limits & scale for growing applications.
                  </p>
                </div>
                <ul className="space-y-3 text-sm text-secondary flex-1">
                  {[
                    "Up to 500 emails/day per connected Gmail",
                    "Up to 2,000 emails/day per Workspace account",
                    "Unlimited emails/month total",
                    "Everything in Free (with higher limits)",
                    "Up to 50 connected Gmail accounts",
                    "Up to 100 API keys",
                    "300 API requests / minute",
                    "5MB HTML body · 2MB text body",
                    "Up to 20 attachments · 10MB per file",
                    "90 days email log retention",
                    "Batch email sending",
                  ].map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <svg
                        className="w-4 h-4 mt-0.5 text-emerald-500 shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href={user ? "/dashboard/settings" : "/login"}
                  className="block w-full text-center bg-surface-container-low border border-outline-variant/60 hover:bg-surface-container text-white font-bold py-3 rounded-xl transition-all active:scale-95 shadow-md"
                >
                  {user?.plan === "pro"
                    ? "Manage Subscription"
                    : user
                      ? "Upgrade to Pro (₦4,000/mo)"
                      : "Get Started Pro (₦4,000/mo)"}
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section
          id="faq"
          className="py-xl md:py-32 bg-surface-container-low border-t border-outline-variant/60"
        >
          <div className="max-w-4xl mx-auto px-margin-mobile md:px-margin-desktop">
            <div className="text-center mb-16 space-y-3">
              <h2 className="font-headline-lg text-headline-lg text-primary-sendlib">
                Frequently Asked Questions
              </h2>
              <p className="font-body-lg text-body-lg text-on-surface-variant max-w-[600px] mx-auto">
                Got questions about how Sendlib is different from other transactional email sending
                platforms? We have answers.
              </p>
            </div>

            <div className="space-y-4">
              {faqs.map((faq, index) => {
                const isOpen = openFaq === index;
                return (
                  <div
                    key={index}
                    className={`p-5 md:p-6 rounded-2xl border transition-all duration-300 cursor-pointer ${isOpen ? "bg-surface-container-lowest border-outline-variant/60 shadow-md" : "border-outline-variant/40 bg-surface-container-lowest/40 hover:bg-surface-container-lowest/70"}`}
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <h3 className="font-bold text-base text-on-background flex items-start md:items-center gap-3">
                        <span className="flex-1">{faq.question}</span>
                      </h3>
                      <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-surface-container-low text-secondary transition-transform duration-300">
                        <svg
                          className={`w-5 h-5 transform transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </div>
                    </div>
                    <div
                      className={`grid transition-all duration-300 ease-in-out ${isOpen ? "grid-rows-[1fr] mt-4 opacity-100" : "grid-rows-[0fr] opacity-0"}`}
                    >
                      <div className="overflow-hidden">
                        <p className="text-sm md:text-base text-secondary leading-relaxed pl-0 md:pl-5">
                          {faq.answer}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full mt-auto bg-surface-container border-t border-outline-variant">
        <div className="flex flex-col md:flex-row justify-between items-start px-margin-mobile md:px-margin-desktop py-xl gap-10 max-w-7xl mx-auto">
          <div className="flex flex-col gap-xs text-left">
            <span className="text-xl font-headline-md font-bold tracking-tight text-white">
              Sendlib
            </span>
            <p className="font-label-sm text-label-sm text-on-surface-variant max-w-[250px] md:max-w-none">
              © 2026 Sendlib. All rights reserved.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-8 sm:gap-16 w-full md:w-auto">
            <div className="flex flex-col gap-3 text-left">
              <span className="text-xs font-bold uppercase tracking-wider text-secondary">
                Product
              </span>
              <a
                href="https://github.com/samueltuoyo15/sendlib"
                target="_blank"
                rel="noopener noreferrer"
                className="font-label-sm text-label-sm text-on-surface-variant hover:text-primary-sendlib transition-colors flex items-center gap-1.5"
              >
                <HugeiconsIcon icon={GithubIcon} size={14} />
                GitHub
              </a>
              <Link
                href="/docs"
                className="font-label-sm text-label-sm text-on-surface-variant hover:text-primary-sendlib transition-colors"
              >
                Documentation
              </Link>
              <a
                href="mailto:hello@samueltuoyo.com"
                className="font-label-sm text-label-sm text-on-surface-variant hover:text-primary-sendlib transition-colors"
              >
                Contact Support
              </a>
            </div>
            <div className="flex flex-col gap-3 text-left">
              <span className="text-xs font-bold uppercase tracking-wider text-secondary">
                Legal
              </span>
              <Link
                href="/privacy-policy"
                className="font-label-sm text-label-sm text-on-surface-variant hover:text-primary-sendlib transition-colors"
              >
                Privacy Policy
              </Link>
              <Link
                href="/terms-of-service"
                className="font-label-sm text-label-sm text-on-surface-variant hover:text-primary-sendlib transition-colors"
              >
                Terms of Service
              </Link>
              <Link
                href="/refund"
                className="font-label-sm text-label-sm text-on-surface-variant hover:text-primary-sendlib transition-colors"
              >
                Refund Policy
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

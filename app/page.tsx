import HomeClient from "@/components/home/HomeClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sendliberty: Send Transactional Emails to Your Customers Seamlessly",
  description:
    "The fastest way for founders and developers to send transactional emails to their customers seamlessly, without any domain configuration required.",
  alternates: {
    canonical: "https://sendliberty.com",
  },
  openGraph: {
    title: "Sendliberty: Send Transactional Emails to Your Customers Seamlessly",
    description:
      "The fastest way for founders and developers to send transactional emails to their customers seamlessly, without any domain configuration required.",
    url: "https://sendliberty.com",
    siteName: "Sendliberty",
    type: "website",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": "https://sendliberty.com/#website",
      url: "https://sendliberty.com",
      name: "Sendliberty",
      description: "Send transactional emails seamlessly to their customers",
      publisher: {
        "@id": "https://sendliberty.com/#organization",
      },
    },
    {
      "@type": "Organization",
      "@id": "https://sendliberty.com/#organization",
      name: "Sendliberty",
      url: "https://sendliberty.com",
      logo: "https://sendliberty.com/logo.png",
      email: "samueltuoyo9082@gmail.com",
    },
    {
      "@type": "SoftwareApplication",
      "@id": "https://sendliberty.com/#software",
      name: "Sendliberty",
      operatingSystem: "All",
      applicationCategory: "DeveloperApplication",
      description:
        "Sendliberty enables founders and developers to send transactional emails to their customers fast and seamlessly without any domain configuration.",
      url: "https://sendliberty.com",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
    },
    {
      "@type": "SiteNavigationElement",
      "@id": "https://sendliberty.com/#navigation",
      name: ["API Documentation", "Privacy Policy", "Terms of Service", "Login"],
      url: [
        "https://sendliberty.com/docs",
        "https://sendliberty.com/privacy-policy",
        "https://sendliberty.com/terms-of-service",
        "https://sendliberty.com/login",
      ],
    },
    {
      "@type": "BreadcrumbList",
      "@id": "https://sendliberty.com/#breadcrumb",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: "https://sendliberty.com",
        },
      ],
    },
    {
      "@type": "FAQPage",
      "@id": "https://sendliberty.com/#faq",
      mainEntity: [
        {
          "@type": "Question",
          name: "Do I need to verify my domain or configure DNS records?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "No! Because Sendlib routes your email relay requests securely through your already verified, connected Google accounts, there is absolutely zero DNS configuration required. You do not need to add SPF, DKIM, MX, or TXT records to start sending immediately.",
          },
        },
        {
          "@type": "Question",
          name: "Can I send from my custom domain (e.g. hello@mycompany.com)?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes! If your custom company domain is connected to Google Workspace, simply link that account to Sendlib via Google OAuth. Sendlib will send emails directly from your custom domain (e.g. hello@mycompany.com) with zero extra DNS setup required on Sendlib.",
          },
        },
        {
          "@type": "Question",
          name: "Will my emails land in the inbox?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Sendlib submits messages through Google's official Gmail API, but no email service can guarantee inbox placement. Gmail and the recipient's provider still classify each accepted message using sender reputation, content, authentication, recipient engagement, and other signals.",
          },
        },
        {
          "@type": "Question",
          name: "How does this compare to the free tier of Resend, Mailgun, or SendGrid?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Other platforms limit you to only 100 free emails per day on their free plans and require strict domain verification. With Sendlib, you can send up to 200 emails/day per connected personal Gmail account (500/day on Pro), or up to 1,000 emails/day per connected Google Workspace account (2,000/day on Pro).",
          },
        },
        {
          "@type": "Question",
          name: "Can I send attachments and CC/BCC recipients?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes, our REST API supports complete transactional payloads. You can specify a custom Reply-To header, carbon copies (CC), blind carbon copies (BCC), and pass an array of base64-encoded attachments.",
          },
        },
        {
          "@type": "Question",
          name: "Is my Google account password secure?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "We never see, ask for, or store your Google password. Authorization is done entirely through standard, secure Google OAuth2 credentials. We only store encrypted access and refresh tokens, which you can manually revoke from your Google Account settings page at any time.",
          },
        },
      ],
    },
  ],
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HomeClient />
    </>
  );
}

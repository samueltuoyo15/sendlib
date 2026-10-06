"use client";

import AuthShell from "@/components/auth/AuthShell";
import { FormField } from "@/components/auth/FormField";
import { SocialButtons } from "@/components/auth/SocialButtons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCompleteTwoFactorLogin, useLogin, useMe } from "@/hooks/useAuth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const OAUTH_ERRORS: Record<string, string> = {
  invalid_state_or_code: "The sign-in link expired. Please try again.",
  google_callback: "Google sign-in failed. Please try again.",
  google_profile: "Google did not return a profile. Please try again or use the email form.",
  github_token: "GitHub sign-in failed. Please try again.",
  github_callback: "GitHub sign-in failed. Please try again.",
};

function getOAuthError(): { message: string } | null {
  if (typeof window === "undefined") return null;
  const error = new URLSearchParams(window.location.search).get("error");
  if (!error) return null;
  return {
    message: OAUTH_ERRORS[error] ?? "Authentication failed. Please try again.",
  };
}

export default function LoginPage() {
  const router = useRouter();

  const { data: user, isLoading } = useMe();

  const [step, setStep] = useState<"credentials" | "twoFactor">("credentials");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [code, setCode] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);

  const login = useLogin();
  const complete2fa = useCompleteTwoFactorLogin();

  const nextPath =
    typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("next") : null;

  useEffect(() => {
    if (
      new URLSearchParams(window.location.search).get("twoFactor") === "1" &&
      document.cookie.split("; ").includes("pending_2fa=true")
    ) {
      setStep("twoFactor");
    }
    const oauth = getOAuthError();

    if (oauth) {
      toast.error(oauth.message);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (!isLoading && user) {
      router.push(nextPath && nextPath.startsWith("/dashboard") ? nextPath : "/dashboard");
    }
  }, [isLoading, user, router, nextPath]);

  if (isLoading || user) {
    return (
      <div className="min-h-screen bg-background-sendlib flex flex-col items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 rounded-full border-2 border-primary-sendlib border-t-transparent animate-spin" />
          <p className="text-sm font-medium text-secondary font-sans animate-pulse">
            Authenticating...
          </p>
        </div>
      </div>
    );
  }

  const handleLogin = (event: React.FormEvent) => {
    event.preventDefault();
    setFieldError(null);
    login.mutate(
      { email, password },
      {
        onSuccess: (res) => {
          if (res.requiresTwoFactor) {
            setStep("twoFactor");
            return;
          }
          toast.success("Logged in successfully.");
          router.push(nextPath && nextPath.startsWith("/dashboard") ? nextPath : "/dashboard");
        },
        onError: (err: unknown) => {
          setFieldError(
            err instanceof Error
              ? err.message
              : typeof err === "string"
                ? err
                : "Login failed. Please try again."
          );
        },
      }
    );
  };

  const handleTwoFactor = (event: React.FormEvent) => {
    event.preventDefault();
    setFieldError(null);
    complete2fa.mutate(
      { code },
      {
        onSuccess: () => {
          toast.success("Two-factor verified. Logged in.");
          router.push(nextPath && nextPath.startsWith("/dashboard") ? nextPath : "/dashboard");
        },
        onError: (err: unknown) => {
          setFieldError(err instanceof Error ? err.message : "Invalid code. Please try again.");
          setCode("");
        },
      }
    );
  };

  const normalizedTwoFactorCode = code.replace(/[- ]/g, "");
  const isTwoFactorCodeValid =
    /^\d{6}$/.test(code) || /^[A-F0-9]{16}$/.test(normalizedTwoFactorCode);

  return (
    <AuthShell
      title="Welcome to Sendlib"
      subtitle="Log in to manage your API keys and send emails via API."
    >
      <div className="space-y-3">
        <SocialButtons />

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-outline-variant" />
          <span className="font-label-xs text-[11px] text-on-surface-variant">or</span>
          <div className="h-px flex-1 bg-outline-variant" />
        </div>

        {step === "credentials" ? (
          <form onSubmit={handleLogin} className="space-y-3" noValidate>
            <FormField label="Email address" htmlFor="login-email">
              <Input
                id="login-email"
                type="email"
                autoComplete="email"
                required
                className="h-10 rounded-lg bg-surface px-3 text-sm"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </FormField>

            <FormField label="Password" htmlFor="login-password">
              <div className="relative">
                <Input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  className="h-10 rounded-lg bg-surface px-3 pr-10 text-sm"
                  placeholder="Your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface focus:outline-none cursor-pointer"
                >
                  {showPassword ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                      <line x1="2" x2="22" y1="2" y2="22" />
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </FormField>

            <div className="flex items-center justify-end">
              <Link
                href="/forgot-password"
                className="text-xs text-secondary hover:text-primary-sendlib underline underline-offset-4"
              >
                Forgot password?
              </Link>
            </div>

            {fieldError && (
              <p
                className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-1.5"
                role="alert"
              >
                {fieldError}
              </p>
            )}

            <Button
              type="submit"
              disabled={login.isPending}
              className="w-full h-10 rounded-lg font-label-sm text-sm font-bold bg-primary-sendlib text-black hover:opacity-90 cursor-pointer"
            >
              {login.isPending ? "Logging in..." : "Log in"}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleTwoFactor} className="space-y-3" noValidate>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Enter the 6-digit code from your authenticator app to finish signing in.
            </p>
            <FormField label="Authenticator code" htmlFor="login-2fa-code">
              <Input
                id="login-2fa-code"
                inputMode="text"
                autoComplete="one-time-code"
                maxLength={19}
                required
                className="h-10 rounded-lg bg-surface px-3 text-center text-base tracking-[0.3em] font-mono"
                placeholder="000000 or XXXX-XXXX-XXXX-XXXX"
                value={code}
                onChange={(e) =>
                  setCode(
                    e.target.value
                      .toUpperCase()
                      .replace(/[^A-Z0-9- ]/g, "")
                      .slice(0, 19)
                  )
                }
              />
            </FormField>

            {fieldError && (
              <p
                className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-1.5"
                role="alert"
              >
                {fieldError}
              </p>
            )}

            <Button
              type="submit"
              disabled={complete2fa.isPending || !isTwoFactorCodeValid}
              className="w-full h-10 rounded-lg font-label-sm text-sm font-bold bg-primary-sendlib text-black hover:opacity-90 cursor-pointer"
            >
              {complete2fa.isPending ? "Verifying..." : "Verify & Log In"}
            </Button>

            <button
              type="button"
              onClick={() => {
                setStep("credentials");
                setCode("");
                setFieldError(null);
              }}
              className="w-full text-xs text-secondary hover:text-primary-sendlib py-1 cursor-pointer"
            >
              &larr; Back to password
            </button>
          </form>
        )}

        <p className="text-xs text-center text-on-surface-variant pt-0.5">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="text-primary-sendlib font-semibold underline underline-offset-4"
          >
            Create one
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}

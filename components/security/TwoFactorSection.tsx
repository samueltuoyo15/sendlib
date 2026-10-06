"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useBeginTwoFactorSetup,
  useConfirmTwoFactorSetup,
  useDisableTwoFactor,
  useMe,
} from "@/hooks/useAuth";
import { CheckmarkCircleIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import QRCode from "qrcode";
import { useState } from "react";
import { toast } from "sonner";

type SetupStep = "start" | "scan" | "codes" | "confirm" | "done";

export function TwoFactorSection() {
  const { data: user } = useMe();
  const enabled = Boolean(user?.twoFactorEnabled);

  const [step, setStep] = useState<SetupStep>(enabled ? "done" : "start");
  const [manualSecret, setManualSecret] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [codesSaved, setCodesSaved] = useState(false);
  const [code, setCode] = useState("");
  const [confirmError, setConfirmError] = useState<string | null>(null);

  const [disableOpen, setDisableOpen] = useState(false);
  const [reauthMethod, setReauthMethod] = useState<"password" | "code">("password");
  const [reauthPassword, setReauthPassword] = useState("");
  const [showReauthPassword, setShowReauthPassword] = useState(false);
  const [reauthCode, setReauthCode] = useState("");

  const beginSetup = useBeginTwoFactorSetup();
  const confirmSetup = useConfirmTwoFactorSetup();
  const disable = useDisableTwoFactor();

  const handleBegin = () => {
    beginSetup.mutate(undefined, {
      onSuccess: (res) => {
        setManualSecret(res.data.secret);
        setRecoveryCodes(res.data.recoveryCodes);
        QRCode.toDataURL(res.data.otpauthUri, {
          width: 220,
          margin: 1,
          color: { dark: "#111111", light: "#ffffff" },
        })
          .then((url) => setQrDataUrl(url))
          .catch(() => setQrDataUrl(""));
        setStep("scan");
      },
      onError: (err: unknown) =>
        toast.error(err instanceof Error ? err.message : "Could not start 2FA setup."),
    });
  };

  const handleConfirm = () => {
    setConfirmError(null);
    confirmSetup.mutate(
      { code },
      {
        onSuccess: (res) => {
          toast.success(res.message ?? "Two-factor authentication enabled.");
          setStep("done");
        },
        onError: (err: unknown) =>
          setConfirmError(err instanceof Error ? err.message : "Invalid code."),
      }
    );
  };

  const handleDisable = () => {
    disable.mutate(
      {
        password: reauthMethod === "password" ? reauthPassword : undefined,
        code: reauthMethod === "code" ? reauthCode : undefined,
      },
      {
        onSuccess: (res) => {
          toast.success(res.message ?? "Two-factor authentication disabled.");
          setDisableOpen(false);
          setReauthPassword("");
          setReauthCode("");
          setStep("start");
          window.location.reload();
        },
        onError: (err: unknown) => {
          toast.error(err instanceof Error ? err.message : "Could not disable 2FA.");
        },
      }
    );
  };

  return (
    <div className="rounded-2xl border border-outline-variant bg-surface p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-headline-md text-headline-md text-on-background font-bold">
            Two-factor authentication
          </h2>
          <p className="text-sm text-secondary mt-1">
            {enabled
              ? "Your account requires a one-time code at every login."
              : "Protect your account with an authenticator app."}
          </p>
        </div>
        {enabled ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-3 py-1 text-xs font-medium">
            <HugeiconsIcon icon={CheckmarkCircleIcon} size={14} />
            Enabled
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full bg-surface-container-low text-secondary border border-outline-variant px-3 py-1 text-xs font-medium">
            Disabled
          </span>
        )}
      </div>

      {step === "start" && (
        <div className="rounded-xl border border-outline-variant bg-surface-container-low p-6">
          <p className="text-sm text-secondary leading-relaxed">
            2FA requires a one-time 6-digit code from an authenticator app (Google Authenticator,
            Authy, 1Password) in addition to your password.
          </p>
          <Button
            onClick={handleBegin}
            disabled={beginSetup.isPending}
            className="mt-4 rounded-lg font-label-sm bg-primary-sendlib text-black hover:opacity-90"
          >
            {beginSetup.isPending ? "Generating setup..." : "Enable 2FA"}
          </Button>
        </div>
      )}

      {step === "scan" && (
        <div className="rounded-xl border border-outline-variant bg-surface-container-low p-6">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="shrink-0">
              {qrDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrDataUrl}
                  alt="Scan this QR code with your authenticator app"
                  width={220}
                  height={220}
                  className="rounded-xl border border-outline-variant bg-white"
                />
              ) : (
                <div className="h-[220px] w-[220px] rounded-xl border border-outline-variant flex items-center justify-center text-xs text-secondary">
                  Loading QR...
                </div>
              )}
            </div>
            <div className="space-y-3 text-sm text-secondary leading-relaxed">
              <p>
                Open your authenticator app and scan the QR code, or enter this secret key manually:
              </p>
              <p className="font-mono text-primary-sendlib bg-background-sendlib border border-outline-variant rounded-lg px-3 py-2 text-center tracking-[0.2em] select-all">
                {manualSecret}
              </p>
              <p>Next, you'll review your recovery codes and confirm your code.</p>
            </div>
          </div>
          <Button
            onClick={() => setStep("codes")}
            className="mt-5 rounded-lg font-label-sm bg-primary-sendlib text-black hover:opacity-90"
          >
            Continue
          </Button>
        </div>
      )}

      {step === "codes" && (
        <div className="rounded-xl border border-outline-variant bg-surface-container-low p-6">
          <div className="space-y-4">
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200 leading-relaxed">
              <strong>Save these recovery codes now.</strong> They are the only way into your
              account if you lose your phone. Store them somewhere safe: they will never be shown
              again.
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {recoveryCodes.map((rc) => (
                <code
                  key={rc}
                  className="font-mono text-sm bg-background-sendlib border border-outline-variant rounded-lg px-3 py-2 text-primary-sendlib text-center select-all"
                >
                  {rc}
                </code>
              ))}
            </div>
            <label className="flex items-center gap-2 text-sm text-secondary cursor-pointer">
              <input
                type="checkbox"
                checked={codesSaved}
                onChange={(e) => setCodesSaved(e.target.checked)}
                className="accent-emerald-500 h-4 w-4"
              />
              I&apos;ve saved my recovery codes
            </label>
            <Button
              onClick={() => setStep("confirm")}
              disabled={!codesSaved}
              className="rounded-lg font-label-sm bg-primary-sendlib text-black hover:opacity-90"
            >
              Continue to code confirmation
            </Button>
          </div>
        </div>
      )}

      {step === "confirm" && (
        <div className="rounded-xl border border-outline-variant bg-surface-container-low p-6">
          <p className="text-sm text-secondary leading-relaxed mb-4">
            Enter the 6-digit code from your authenticator app to finish enabling 2FA.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Input
              inputMode="numeric"
              maxLength={6}
              className="w-44 rounded-xl bg-surface px-4 text-center text-lg tracking-[0.4em] font-mono"
              placeholder="000000"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.replace(/[^0-9]/g, ""));
                setConfirmError(null);
              }}
            />
            <Button
              onClick={handleConfirm}
              disabled={confirmSetup.isPending || code.length !== 6}
              className="rounded-lg font-label-sm bg-primary-sendlib text-black hover:opacity-90"
            >
              {confirmSetup.isPending ? "Verifying..." : "Confirm code"}
            </Button>
          </div>
          {confirmError && (
            <p className="mt-3 text-sm text-red-400" role="alert">
              {confirmError}
            </p>
          )}
        </div>
      )}
      {enabled && (
        <Button
          variant="outline"
          className="rounded-lg font-label-sm border border-outline-variant hover:bg-surface-container-low"
          onClick={() => setDisableOpen(!disableOpen)}
        >
          {disableOpen ? "Cancel" : "Disable 2FA"}
        </Button>
      )}

      {disableOpen && (
        <div className="rounded-xl border border-outline-variant bg-surface-container-low p-5 space-y-4">
          <p className="text-sm text-secondary">
            Re-enter your password or a current authenticator code to confirm.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Select
              value={reauthMethod}
              onValueChange={(val) => setReauthMethod(val as "password" | "code")}
            >
              <SelectTrigger className="h-10 w-48 rounded-lg border border-outline-variant bg-surface px-3 text-sm text-on-background cursor-pointer">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="password">Use password</SelectItem>
                <SelectItem value="code">Use authenticator code</SelectItem>
              </SelectContent>
            </Select>
            {reauthMethod === "password" ? (
              <div className="relative">
                <Input
                  type={showReauthPassword ? "text" : "password"}
                  autoComplete="current-password"
                  className="h-10 rounded-lg bg-surface px-3 pr-10"
                  placeholder="Current password"
                  value={reauthPassword}
                  onChange={(e) => setReauthPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowReauthPassword(!showReauthPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface focus:outline-none cursor-pointer"
                >
                  {showReauthPassword ? (
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
            ) : (
              <Input
                inputMode="numeric"
                maxLength={6}
                className="h-10 w-40 rounded-lg bg-surface px-3 text-center tracking-[0.3em] font-mono"
                placeholder="000000"
                value={reauthCode}
                onChange={(e) => setReauthCode(e.target.value.replace(/[^0-9]/g, ""))}
              />
            )}
            <Button
              disabled={disable.isPending}
              onClick={handleDisable}
              className="rounded-lg font-label-sm bg-primary-sendlib text-black hover:opacity-90"
            >
              {disable.isPending ? "Disabling..." : "Disable 2FA"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

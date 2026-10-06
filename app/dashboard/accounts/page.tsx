"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useMe } from "@/hooks/useAuth";
import { useConnectGmail, useDisconnectGmail, useGmailAccounts } from "@/hooks/useGmailAccounts";
import { CancelCircleIcon, CheckmarkCircle01Icon, MailIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import confetti from "canvas-confetti";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

function redactEmail(email: string): string {
  const [localPart, domain] = email.split("@");
  if (!localPart || !domain) return email;
  if (localPart.length <= 2) {
    return `${localPart[0]}***@${domain}`;
  }
  return `${localPart[0]}***${localPart[localPart.length - 1]}@${domain}`;
}

function AccountsContent() {
  const { data: user } = useMe();
  const { data: accounts, isLoading } = useGmailAccounts();
  const { mutate: connectGmail, isPending: isConnecting } = useConnectGmail();
  const { mutate: disconnectGmail, isPending: isDisconnecting } = useDisconnectGmail();
  const [connectConfirmOpen, setConnectConfirmOpen] = useState(false);
  const [disconnectEmail, setDisconnectEmail] = useState<string | null>(null);
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

  const searchParams = useSearchParams();
  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current) return;

    if (searchParams.get("gmail_connected") === "true") {
      handledRef.current = true;
      // Store the signal then hard-redirect to clean URL so the param is truly gone
      sessionStorage.setItem("gmail_just_connected", "1");
      window.location.replace(window.location.pathname);
      return;
    }

    if (searchParams.get("gmail_updated") === "true") {
      handledRef.current = true;
      const email = searchParams.get("email");
      sessionStorage.setItem("gmail_just_updated", email ?? "1");
      window.location.replace(window.location.pathname);
      return;
    }

    // After the hard redirect, pick up the signal from sessionStorage
    const justConnected = sessionStorage.getItem("gmail_just_connected");
    if (justConnected) {
      sessionStorage.removeItem("gmail_just_connected");
      confetti({ particleCount: 300, spread: 120, origin: { y: 0.6 } });
      setTimeout(() => setSuccessDialogOpen(true), 0);
      toast.success("Gmail account connected successfully!");
      return;
    }

    const justUpdated = sessionStorage.getItem("gmail_just_updated");
    if (justUpdated) {
      sessionStorage.removeItem("gmail_just_updated");
      const email = justUpdated === "1" ? null : justUpdated;
      toast.success(
        email
          ? `Gmail account (${email}) re-authenticated & tokens updated!`
          : "Gmail account re-authenticated & tokens updated!"
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isPro = user?.plan === "pro";
  const maxAccounts = isPro ? 50 : 3;
  const atAccountLimit = !isLoading && !!accounts && accounts.length >= maxAccounts;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-headline-md font-bold tracking-tight text-primary-sendlib">
            Gmail Accounts
          </h1>
          <p className="text-secondary font-body-md mt-1">
            Connect and manage the Gmail accounts used for sending emails.
          </p>
          {!isLoading && accounts && (
            <p className="text-xs mt-1.5 font-medium">
              <span className={atAccountLimit ? "text-destructive font-bold" : "text-secondary"}>
                {accounts.length} / {maxAccounts} accounts connected
              </span>
            </p>
          )}
        </div>
        <Button
          size="lg"
          className="rounded-lg font-label-sm bg-emerald-500 hover:bg-emerald-600 text-black border-0 font-bold shadow-sm transition-all active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={() => {
            if (atAccountLimit) {
              toast.error(
                `Account limit reached: ${maxAccounts} / ${maxAccounts} accounts connected. Please disconnect an account first.`
              );
              return;
            }
            setConnectConfirmOpen(true);
          }}
          disabled={isConnecting || atAccountLimit}
          title={atAccountLimit ? `You've reached the ${maxAccounts}-account limit` : undefined}
        >
          <HugeiconsIcon icon={MailIcon} size={16} color="currentColor" strokeWidth={1.5} />
          <span className="ml-2">
            {atAccountLimit ? "Account Limit Reached" : "Connect New Account"}
          </span>
        </Button>
      </div>

      <div className="rounded-xl border border-outline-variant bg-surface-container-low/40 p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-outline-variant/30 pb-2.5">
          <h3 className="font-bold text-primary-sendlib text-sm">Gmail & Custom Domain Limits</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-secondary">
          <div className="bg-surface p-2.5 rounded-lg border border-outline-variant/30">
            <span className="font-bold text-primary-sendlib block mb-0.5">
              Personal Gmail (yourproduct@gmail.com)
            </span>
            <span>
              Up to{" "}
              <strong className="text-primary-sendlib">
                {isPro ? "500 emails/day" : "200 emails/day"}
              </strong>{" "}
              per account{!isPro && " (500 on Pro)"}.
            </span>
          </div>
          <div className="bg-surface p-2.5 rounded-lg border border-outline-variant/30">
            <span className="font-bold text-primary-sendlib block mb-0.5">
              Google Workspace Custom Domain
            </span>
            <span>
              Up to{" "}
              <strong className="text-primary-sendlib">
                {isPro ? "2,000 emails/day" : "1,000 emails/day"}
              </strong>
              {!isPro && " (2,000 on Pro)"}.
            </span>
          </div>
          <div className="bg-surface p-2.5 rounded-lg border border-outline-variant/30">
            <span className="font-bold text-primary-sendlib block mb-0.5">
              Monthly Sending Limit
            </span>
            <span>
              Up to{" "}
              <strong className="text-primary-sendlib">
                {isPro ? "Unlimited" : "3,500 emails/month"}
              </strong>
              {!isPro && " (Unlimited on Pro)"}.
            </span>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      ) : !accounts || accounts.length === 0 ? (
        <div className="rounded-xl border border-outline-variant bg-surface p-8 text-center shadow-none">
          <HugeiconsIcon
            icon={MailIcon}
            size={48}
            color="currentColor"
            strokeWidth={1.5}
            className="mx-auto mb-4 text-secondary/50"
          />
          <h3 className="text-lg font-headline-md font-bold text-primary-sendlib mb-1">
            No accounts connected
          </h3>
          <p className="max-w-[420px] mx-auto mb-6 text-sm text-secondary leading-relaxed">
            Connect a Gmail account to start sending emails on its behalf.
          </p>
          <Button
            size="lg"
            className="rounded-lg font-label-sm bg-emerald-500 hover:bg-emerald-600 text-black border-0 font-bold shadow-sm transition-all active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => setConnectConfirmOpen(true)}
            disabled={isConnecting}
          >
            <HugeiconsIcon icon={MailIcon} size={16} color="currentColor" strokeWidth={1.5} />
            {isConnecting ? "Connecting..." : "Connect Gmail Account"}
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border border-outline-variant/30 bg-surface-container-low/40 overflow-hidden hover:bg-surface-container-low transition-colors">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-outline-variant/30 bg-surface/50">
                  <th className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-primary-sendlib">
                    Gmail Address
                  </th>
                  <th className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-primary-sendlib">
                    Status
                  </th>
                  <th className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-primary-sendlib">
                    Connected
                  </th>
                  <th className="px-6 py-3.5 text-right text-xs font-bold uppercase tracking-wider text-primary-sendlib pr-6"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30">
                {accounts.map((account) => (
                  <tr key={account.id} className="hover:bg-surface-container-low transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <HugeiconsIcon
                          icon={MailIcon}
                          size={16}
                          color="currentColor"
                          strokeWidth={1.5}
                          className="text-secondary"
                        />
                        <span className="font-bold text-primary-sendlib">
                          {redactEmail(account.email)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {account.connected ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-label-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <HugeiconsIcon
                            icon={CheckmarkCircle01Icon}
                            size={12}
                            color="currentColor"
                            strokeWidth={1.5}
                          />
                          Active
                        </span>
                      ) : (
                        <span
                          title="This account is disconnected. Please click Disconnect and then Connect New Account to re-authenticate."
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-label-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20"
                        >
                          <HugeiconsIcon
                            icon={CancelCircleIcon}
                            size={12}
                            color="currentColor"
                            strokeWidth={1.5}
                          />
                          Disconnected
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-secondary">
                      {new Date(account.connectedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right pr-6">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 text-xs font-semibold rounded-lg cursor-pointer"
                        onClick={() => setDisconnectEmail(account.email)}
                        disabled={isDisconnecting}
                      >
                        Disconnect
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Gmail Connected Celebration Dialog */}
      <Dialog open={successDialogOpen} onOpenChange={setSuccessDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="mb-2">
            <DialogTitle className="text-xl font-headline-md font-bold text-primary-sendlib flex items-center gap-2">
              <span>🎉</span> Gmail Connected!
            </DialogTitle>
            <DialogDescription className="text-secondary text-sm leading-relaxed mt-1">
              Your Gmail account has been successfully linked. Next up, generate an API Key to start
              sending emails.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-row gap-3 mt-4 pt-4 border-t border-outline-variant/60">
            <Button
              variant="outline"
              className="flex-1 rounded-lg font-label-sm border border-outline-variant hover:bg-surface-container-low text-on-background cursor-pointer"
              onClick={() => setSuccessDialogOpen(false)}
            >
              Dismiss
            </Button>
            <Link href="/dashboard/keys" className="flex-1">
              <Button className="w-full rounded-lg font-label-sm bg-emerald-500 hover:bg-emerald-600 text-black border-0 font-bold shadow-sm cursor-pointer">
                Create API Key
              </Button>
            </Link>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={connectConfirmOpen} onOpenChange={setConnectConfirmOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="mb-2">
            <DialogTitle className="text-xl font-headline-md font-bold text-primary-sendlib">
              Connect Gmail Account
            </DialogTitle>
            <DialogDescription className="text-secondary text-sm leading-relaxed mt-1">
              Connect your Google account via secure OAuth 2.0. Sendlib will only request the narrow
              permissions required to relay transactional emails on your behalf, and your
              credentials are never seen or stored.
            </DialogDescription>
          </DialogHeader>
          {atAccountLimit ? (
            <div className="p-3.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold leading-relaxed mt-2">
              Account limit reached ({maxAccounts} / {maxAccounts} accounts connected). Please
              disconnect an existing account first.
            </div>
          ) : (
            <label className="flex items-start gap-3 mt-3 p-3.5 rounded-xl bg-surface-container-low border border-outline-variant/80 hover:border-primary-sendlib/40 transition-colors text-xs text-secondary cursor-pointer select-none">
              <input
                type="checkbox"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-outline-variant text-primary-sendlib accent-primary-sendlib focus:ring-primary-sendlib shrink-0 cursor-pointer"
              />
              <span className="leading-relaxed">
                I agree to use this account for <strong>transactional emails only</strong> (welcome
                emails, password resets, OTPs, receipts, etc.) and acknowledge that bulk cold spam
                will result in immediate account suspension.
              </span>
            </label>
          )}
          <div className="flex flex-row gap-3 mt-4 pt-4 border-t border-outline-variant/60">
            <Button
              variant="outline"
              className="flex-1 rounded-lg font-label-sm border border-outline-variant hover:bg-surface-container-low text-on-background cursor-pointer"
              onClick={() => setConnectConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 rounded-lg font-label-sm bg-emerald-500 hover:bg-emerald-600 text-black border-0 font-bold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => {
                if (atAccountLimit) {
                  toast.error(
                    `Account limit reached: ${maxAccounts} / ${maxAccounts} accounts connected.`
                  );
                  return;
                }
                if (!agreeTerms) {
                  toast.error("Please agree to the transactional usage terms first.");
                  return;
                }
                setConnectConfirmOpen(false);
                toast.loading("Redirecting to Google...", { id: "gmail-connect" });
                connectGmail();
              }}
              disabled={isConnecting || atAccountLimit || !agreeTerms}
            >
              Connect Gmail
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Disconnect Gmail Confirmation Dialog */}
      <Dialog open={!!disconnectEmail} onOpenChange={(open) => !open && setDisconnectEmail(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="mb-2">
            <DialogTitle className="text-xl font-headline-md font-bold text-primary-sendlib">
              Disconnect Gmail Account
            </DialogTitle>
            <DialogDescription className="text-secondary text-sm leading-relaxed mt-1">
              Are you sure you want to disconnect{" "}
              <strong className="font-bold text-on-background">{disconnectEmail}</strong>? Sendlib
              will no longer be able to send transactional emails on behalf of this account.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-row gap-3 mt-4 pt-4 border-t border-outline-variant/60">
            <Button
              variant="outline"
              className="flex-1 rounded-lg font-label-sm border border-outline-variant hover:bg-surface-container-low text-on-background cursor-pointer"
              onClick={() => setDisconnectEmail(null)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 rounded-lg font-label-sm bg-destructive hover:bg-destructive/90 text-white cursor-pointer"
              onClick={() => {
                if (disconnectEmail) {
                  const targetEmail = disconnectEmail;
                  disconnectGmail(targetEmail, {
                    onSuccess: () => {
                      setDisconnectEmail(null);
                      toast.success(`Disconnected ${targetEmail}`);
                    },
                    onError: (err) => {
                      toast.error(err.message || "Failed to disconnect");
                    },
                  });
                }
              }}
              disabled={isDisconnecting}
            >
              {isDisconnecting ? "Disconnecting..." : "Disconnect"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AccountsPage() {
  return (
    <Suspense fallback={<Skeleton className="h-48 w-full rounded-xl" />}>
      <AccountsContent />
    </Suspense>
  );
}

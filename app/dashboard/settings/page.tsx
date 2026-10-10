"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useLogout, useMe, useUpdateProfile } from "@/hooks/useAuth";
import {
  Delete02Icon,
  FloppyDiskIcon,
  Logout01Icon,
  PencilEdit01Icon,
  UserIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { CreditCardIcon } from "@hugeicons/core-free-icons";
import { toast } from "sonner";

export default function SettingsPage() {
  const { data: user, isLoading } = useMe();
  const isPro = user?.plan === "pro";
  const isCanceled = user?.subscriptionStatus === "canceled";
  const { mutate: updateProfile, isPending: isUpdating } = useUpdateProfile();
  const { mutate: logout, isPending: isLoggingOut } = useLogout();
  const [editName, setEditName] = useState("");
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [signOutConfirmOpen, setSignOutConfirmOpen] = useState(false);
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  const [cancelSubConfirmOpen, setCancelSubConfirmOpen] = useState(false);
  const [isCancelingSub, setIsCancelingSub] = useState(false);
  const [isRedirectingCheckout, setIsRedirectingCheckout] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const reference =
        urlParams.get("reference") || urlParams.get("trxref") || urlParams.get("checkout_id");
      if (
        urlParams.get("billing") === "success" ||
        (reference && urlParams.get("billing") !== "cancel")
      ) {
        toast.loading("Verifying payment...", { id: "billing-verify" });
        fetch(`/api/billing/verify?reference=${reference || ""}`)
          .then((res) => res.json())
          .then((data) => {
            if (data.success && data.verified) {
              toast.success("Payment verified! Your account has been upgraded to Pro.", {
                id: "billing-verify",
              });
              setTimeout(() => {
                window.location.href = "/dashboard/settings";
              }, 1000);
            } else {
              toast.info("Payment received! Updating account...", { id: "billing-verify" });
              window.history.replaceState({}, document.title, window.location.pathname);
            }
          })
          .catch(() => {
            toast.dismiss("billing-verify");
          });
      } else if (urlParams.get("billing") === "cancel") {
        toast.info("Checkout canceled.");
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  const handleCheckout = async () => {
    try {
      setIsRedirectingCheckout(true);
      const res = await fetch("/api/billing/checkout", { method: "POST" });
      const data = await res.json();
      if (data.success && data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.message || "Failed to initialize checkout session");
      }
    } catch {
      toast.error("Error creating checkout session");
    } finally {
      setIsRedirectingCheckout(false);
    }
  };

  const { mutate: deleteAccount, isPending: isDeletingAccount } = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/user", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete account");
      return res.json();
    },
    onSuccess: () => {
      router.push("/");
    },
  });

  const handleEditClick = () => {
    setEditName(user?.displayName || "");
    setIsEditOpen(true);
  };

  const handleSave = () => {
    if (editName.length > 30 || !editName.trim()) return;
    updateProfile(
      { displayName: editName },
      {
        onSuccess: () => {
          setIsEditOpen(false);
        },
      }
    );
  };

  return (
    <div className="space-y-6 w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-headline-md font-bold tracking-tight text-primary-sendlib">
            Settings
          </h1>
          <p className="text-secondary font-body-md mt-1">
            Manage your account settings and preferences.
          </p>
        </div>
        <Button
          className="rounded-lg font-label-sm bg-emerald-500 hover:bg-emerald-600 text-black border-0 font-bold shadow-sm transition-all active:scale-95 px-4 py-2 cursor-pointer"
          onClick={handleEditClick}
        >
          <HugeiconsIcon icon={PencilEdit01Icon} size={16} color="currentColor" strokeWidth={1.5} />
          <span className="ml-2">Edit Profile</span>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Profile, Sign Out & Delete Account */}
        <div className="lg:col-span-6 space-y-6">
          {/* Profile Card */}
          <div className="rounded-xl border border-outline-variant bg-surface-container-low/40 shadow-none p-6">
            <div className="flex items-center gap-2 mb-4">
              <HugeiconsIcon
                icon={UserIcon}
                size={20}
                color="currentColor"
                strokeWidth={1.5}
                className="text-secondary"
              />
              <h3 className="font-headline-md font-bold text-lg text-primary-sendlib">Profile</h3>
            </div>
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-full rounded-lg bg-outline-variant/30" />
                <Skeleton className="h-10 w-full rounded-lg bg-outline-variant/30" />
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-label-xs uppercase tracking-wider text-secondary mb-1.5 block font-semibold">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={user?.displayName || ""}
                    disabled
                    className="w-full rounded-lg border border-outline-variant bg-surface px-3.5 py-2.5 text-sm text-secondary font-medium outline-none cursor-not-allowed opacity-80"
                  />
                </div>
                <div>
                  <label className="text-xs font-label-xs uppercase tracking-wider text-secondary mb-1.5 block font-semibold">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={user?.email || ""}
                    disabled
                    className="w-full rounded-lg border border-outline-variant bg-surface px-3.5 py-2.5 text-sm text-secondary font-medium outline-none cursor-not-allowed opacity-80"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Plan & Billing */}
        <div className="lg:col-span-6 space-y-6">
          <div className="rounded-xl border border-primary-sendlib/20 bg-primary-sendlib/[0.02] p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <HugeiconsIcon
                  icon={CreditCardIcon}
                  size={20}
                  color="currentColor"
                  strokeWidth={1.5}
                  className="text-primary-sendlib"
                />
                <h3 className="font-headline-md font-bold text-base text-primary-sendlib">
                  Plan & Billing
                </h3>
              </div>
              <span
                className={`px-2 py-1 rounded-full text-[10px] font-bold text-white uppercase tracking-wider border border-outline-variant/60 ${isCanceled ? "bg-red-500/80" : "bg-surface-container-low"}`}
              >
                {isPro ? (isCanceled ? "Pro Plan (Canceled)" : "Pro Plan Active") : "Free Plan"}
              </span>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-secondary leading-relaxed max-w-[600px] mb-4">
                {isPro
                  ? isCanceled
                    ? "Your Pro Plan has been canceled and will not renew. You still have access to Pro features until the end of your billing cycle."
                    : "You're on the Pro Plan (₦4,000/mo). You get 300 req/min, up to 50 connected accounts, 90-day log retention, and batch email sending."
                  : "You are on the Free Plan. Upgrade to Pro for ₦4,000/month - unlock 300 req/min, 50 connected accounts, 90-day logs, and batch email sending to up to 1,000 recipients per call."}
              </p>

              {!isPro ? (
                <Button
                  className="font-label-sm rounded-lg bg-emerald-500 hover:bg-emerald-600 text-black border-0 font-bold cursor-pointer active:scale-95 transition-all shadow-sm disabled:opacity-50"
                  onClick={handleCheckout}
                  disabled={isRedirectingCheckout}
                >
                  <HugeiconsIcon
                    icon={CreditCardIcon}
                    size={16}
                    color="currentColor"
                    strokeWidth={1.5}
                  />
                  <span className="ml-2">
                    {isRedirectingCheckout
                      ? "Initializing Checkout..."
                      : "Upgrade to Pro (₦4,000/mo)"}
                  </span>
                </Button>
              ) : (
                <div className="flex items-center gap-4">
                  {!isCanceled && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-lg border-red-500/40 text-red-500 hover:bg-red-500/10 text-xs font-bold cursor-pointer"
                      onClick={() => setCancelSubConfirmOpen(true)}
                    >
                      Cancel Subscription
                    </Button>
                  )}
                  {(user?.currentPeriodEnd || user?.lastPaymentAt) && (
                    <span className="text-[10px] font-medium text-secondary">
                      {isCanceled ? "Access ends on: " : "Renews on: "}
                      {new Date(
                        user.currentPeriodEnd
                          ? user.currentPeriodEnd
                          : new Date(
                              new Date(user.lastPaymentAt!).setMonth(
                                new Date(user.lastPaymentAt!).getMonth() + 1
                              )
                            )
                      ).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Account Actions */}
          <div className="grid grid-cols-1 gap-6">
            {/* Sign Out Card */}
            <div className="rounded-xl border border-red-500/20 bg-red-500/[0.01] shadow-none p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <HugeiconsIcon
                    icon={Logout01Icon}
                    size={18}
                    color="currentColor"
                    strokeWidth={1.5}
                    className="text-red-500"
                  />
                  <h3 className="font-headline-md font-bold text-base text-red-500">Sign Out</h3>
                </div>
                <p className="text-sm text-secondary leading-relaxed">
                  Sign out of your Sendliberty account on this device.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="rounded-lg font-label-sm w-full sm:w-auto shrink-0 cursor-pointer border-red-500/20 text-red-500 hover:bg-red-500/10"
                onClick={() => setSignOutConfirmOpen(true)}
              >
                Sign Out
              </Button>
            </div>

            {/* Delete Account Card */}
            <div className="rounded-xl border border-red-500/40 bg-red-500/[0.03] shadow-none p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <HugeiconsIcon
                    icon={Delete02Icon}
                    size={18}
                    color="currentColor"
                    strokeWidth={1.5}
                    className="text-red-500"
                  />
                  <h3 className="font-headline-md font-bold text-base text-red-500">
                    Delete Account
                  </h3>
                </div>
                <p className="text-sm text-secondary leading-relaxed">
                  Permanently delete account, keys & logs. Cannot be undone.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="rounded-lg font-label-sm w-full sm:w-auto shrink-0 cursor-pointer border-red-500/40 text-red-500 hover:bg-red-500/10"
                onClick={() => setDeleteAccountOpen(true)}
              >
                Delete Account
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile & Preferences Slide-over Drawer */}
      <Sheet open={isEditOpen} onOpenChange={setIsEditOpen}>
        <SheetContent side="right">
          <SheetHeader className="p-0 mb-6">
            <SheetTitle className="text-xl font-headline-md font-bold text-primary-sendlib">
              Edit Profile
            </SheetTitle>
            <SheetDescription className="text-secondary text-sm">
              Update your display name below.
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-5">
            <div>
              <label className="text-sm font-label-sm font-semibold text-on-background mb-2 block">
                Display Name
              </label>
              <Input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="h-10 rounded-lg border border-outline-variant bg-surface-container-low px-3 text-sm focus-visible:border-primary-sendlib text-on-background font-medium"
              />
              <div className="flex justify-between mt-1.5 text-xs">
                <span
                  className={
                    editName.length > 30
                      ? "text-destructive font-bold"
                      : "text-secondary font-medium"
                  }
                >
                  {editName.length}/30 characters
                </span>
                {editName.length > 30 && (
                  <span className="text-destructive font-bold">Exceeds limit</span>
                )}
              </div>
            </div>
            <div>
              <label className="text-sm font-label-sm font-semibold text-on-background mb-2 block">
                Email Address (Read-only)
              </label>
              <Input
                type="email"
                value={user?.email || ""}
                disabled
                className="h-10 rounded-lg border border-outline-variant bg-surface-container-low px-3 text-sm text-secondary cursor-not-allowed opacity-75"
              />
            </div>
          </div>
          <SheetFooter className="p-0 mt-6 pt-4 border-t border-outline-variant flex-row gap-3">
            <Button
              variant="outline"
              className="flex-1 rounded-lg font-label-sm border border-outline-variant"
              onClick={() => setIsEditOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 rounded-lg font-label-sm bg-emerald-500 hover:bg-emerald-600 text-black border-0 font-bold"
              onClick={handleSave}
              disabled={isUpdating || editName.length > 30 || !editName.trim()}
            >
              <HugeiconsIcon
                icon={FloppyDiskIcon}
                size={16}
                color="currentColor"
                strokeWidth={1.5}
                className="mr-2"
              />
              {isUpdating ? "Saving..." : "Save Changes"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Sign Out Confirmation Dialog */}
      <Dialog open={signOutConfirmOpen} onOpenChange={setSignOutConfirmOpen}>
        <DialogContent>
          <DialogHeader className="mb-2">
            <DialogTitle className="text-xl font-headline-md font-bold text-destructive">
              Sign Out
            </DialogTitle>
            <DialogDescription className="text-secondary text-sm leading-relaxed mt-1">
              Are you sure you want to sign out of your Sendliberty account? You will need to log in
              again to access your dashboard.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-row gap-3 mt-4 pt-4 border-t border-outline-variant/60">
            <Button
              variant="outline"
              className="flex-1 rounded-lg font-label-sm border border-outline-variant hover:bg-surface-container-low"
              onClick={() => setSignOutConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 rounded-lg font-label-sm bg-destructive hover:bg-destructive/90 text-white"
              onClick={() => {
                setSignOutConfirmOpen(false);
                logout();
              }}
              disabled={isLoggingOut}
            >
              {isLoggingOut ? "Signing out..." : "Sign Out"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Account Confirmation Dialog */}
      <Dialog open={deleteAccountOpen} onOpenChange={setDeleteAccountOpen}>
        <DialogContent>
          <DialogHeader className="mb-2">
            <DialogTitle className="text-xl font-headline-md font-bold text-destructive">
              Delete Account
            </DialogTitle>
            <DialogDescription className="text-secondary text-sm leading-relaxed mt-1">
              This will permanently delete your Sendliberty account and all associated data,
              including connected Gmail accounts, email logs, and API keys. This action is{" "}
              <strong>irreversible</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-row gap-3 mt-4 pt-4 border-t border-outline-variant/60">
            <Button
              variant="outline"
              className="flex-1 rounded-lg font-label-sm border border-outline-variant hover:bg-surface-container-low"
              onClick={() => setDeleteAccountOpen(false)}
              disabled={isDeletingAccount}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 rounded-lg font-label-sm bg-destructive hover:bg-destructive/90 text-white"
              onClick={() => deleteAccount()}
              disabled={isDeletingAccount}
            >
              {isDeletingAccount ? "Deleting..." : "Yes, Delete Everything"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel Subscription Confirmation Dialog */}
      <Dialog open={cancelSubConfirmOpen} onOpenChange={setCancelSubConfirmOpen}>
        <DialogContent>
          <DialogHeader className="mb-2">
            <DialogTitle className="text-xl font-headline-md font-bold text-destructive">
              Cancel Subscription
            </DialogTitle>
            <DialogDescription className="text-secondary text-sm leading-relaxed mt-1">
              Are you sure you want to cancel your Pro subscription? You will lose access to Pro
              features at the end of your billing cycle.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-row gap-3 mt-4 pt-4 border-t border-outline-variant/60">
            <Button
              variant="outline"
              className="flex-1 rounded-lg font-label-sm border border-outline-variant hover:bg-surface-container-low"
              onClick={() => setCancelSubConfirmOpen(false)}
              disabled={isCancelingSub}
            >
              Keep Subscription
            </Button>
            <Button
              className="flex-1 rounded-lg font-label-sm bg-destructive hover:bg-destructive/90 text-white"
              onClick={async () => {
                setIsCancelingSub(true);
                try {
                  const res = await fetch("/api/billing/cancel", { method: "POST" });
                  const data = await res.json();
                  if (data.success) {
                    toast.success("Subscription canceled.");
                    window.location.reload();
                  } else {
                    toast.error(data.message || "Failed to cancel");
                  }
                } catch {
                  toast.error("Error canceling subscription");
                } finally {
                  setIsCancelingSub(false);
                  setCancelSubConfirmOpen(false);
                }
              }}
              disabled={isCancelingSub}
            >
              {isCancelingSub ? "Canceling..." : "Cancel Subscription"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

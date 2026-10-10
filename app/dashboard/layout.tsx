"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLogout, useMe } from "@/hooks/useAuth";
import {
  ArrowLeftDoubleIcon,
  BarChartIcon,
  Cancel01Icon,
  FileTypeIcon,
  Key01Icon,
  Layout01Icon,
  MailIcon,
  Menu01Icon,
  Search01Icon,
  SearchVisualIcon,
  Settings01Icon,
  Shield01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { SearchModal } from "@/components/ui/SearchModal";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [avatarError, setAvatarError] = useState(false);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const { data: user, isLoading, error } = useMe();
  const { mutate: logout } = useLogout();

  useEffect(() => {
    if (!isLoading && (error || !user)) {
      router.push("/login");
    }
  }, [isLoading, error, user, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background-sendlib flex flex-col items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 rounded-full border-2 border-primary-sendlib border-t-transparent animate-spin" />
          <p className="text-sm font-medium text-secondary font-sans animate-pulse">
            Loading dashboard...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const navigation = [
    { name: "Overview", href: "/dashboard", icon: BarChartIcon },
    { name: "Gmail Accounts", href: "/dashboard/accounts", icon: MailIcon },
    { name: "API Keys", href: "/dashboard/keys", icon: Key01Icon },
    { name: "Templates", href: "/dashboard/templates", icon: Layout01Icon },
    { name: "Debugger", href: "/dashboard/debugger", icon: SearchVisualIcon },
    { name: "Email Logs", href: "/dashboard/logs", icon: FileTypeIcon },
    { name: "Security", href: "/dashboard/security", icon: Shield01Icon },
    { name: "Settings", href: "/dashboard/settings", icon: Settings01Icon },
  ];

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  return (
    <div className="min-h-screen bg-background-sendlib text-on-background font-body-md flex selection:bg-primary-sendlib selection:text-surface-container-lowest overflow-x-hidden">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex w-56 flex-col border-r border-outline-variant bg-background-sendlib fixed inset-y-0 z-50 transition-transform duration-300 ease-in-out ${isSidebarCollapsed ? "-translate-x-full" : "translate-x-0"}`}
      >
        <div className="h-16 flex items-center px-6 mt-2">
          <Link href="/" className="flex items-center gap-2 transition-opacity">
            <span className="text-xl font-headline-md font-bold tracking-tight text-primary-sendlib">
              Sendliberty
            </span>
          </Link>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {navigation.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-label-sm transition-all cursor-pointer ${
                  isActive
                    ? "bg-surface-container-low text-primary-sendlib font-semibold"
                    : "text-secondary hover:bg-surface-container-low hover:text-on-background"
                }`}
              >
                <HugeiconsIcon icon={item.icon} size={18} color="currentColor" strokeWidth={1.5} />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content Wrapper */}
      <div
        className={`flex-1 min-w-0 flex flex-col min-h-screen transition-all duration-300 ease-in-out ${isSidebarCollapsed ? "lg:pl-0" : "lg:pl-56"}`}
      >
        {/* Top Header - No border as requested */}
        <header className="sticky top-0 z-40 w-full bg-background-sendlib">
          <div className="mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
            {/* Left: Sidebar Toggle (Desktop) & Mobile Brand */}
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden text-on-surface-variant cursor-pointer"
                onClick={() => setIsMobileMenuOpen(true)}
              >
                <HugeiconsIcon icon={Menu01Icon} size={20} color="currentColor" strokeWidth={1.5} />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="hidden lg:flex h-[38px] w-[38px] rounded-xl border border-outline-variant/40 bg-surface shadow-xs text-secondary hover:text-primary-sendlib hover:bg-surface-container-low transition-colors cursor-pointer"
                onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                title={isSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
              >
                <HugeiconsIcon
                  icon={isSidebarCollapsed ? Menu01Icon : ArrowLeftDoubleIcon}
                  size={18}
                  color="currentColor"
                  strokeWidth={1.5}
                />
              </Button>

              <Link href="/" className="lg:hidden flex items-center gap-2 transition-opacity">
                <span className="text-lg font-headline-md font-bold tracking-tight text-primary-sendlib">
                  Sendliberty
                </span>
              </Link>
            </div>

            {/* Right: Search & User Profile Menu */}
            <div className="flex items-center gap-3 ml-auto">
              <div
                className="hidden lg:flex relative w-full max-w-[280px] xl:max-w-[320px] items-center group cursor-pointer"
                onClick={() =>
                  document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true }))
                }
              >
                <HugeiconsIcon
                  icon={Search01Icon}
                  size={18}
                  className="absolute left-3 text-secondary group-focus-within:text-primary-sendlib transition-colors pointer-events-none"
                  color="currentColor"
                  strokeWidth={1.5}
                />
                <div className="flex items-center w-full h-[38px] pl-10 pr-14 rounded-xl bg-surface-container-lowest border border-outline-variant/40 text-sm hover:border-outline-variant transition-all text-secondary/70 shadow-xs">
                  Search...
                </div>
                <div className="absolute right-2.5 flex items-center pointer-events-none">
                  <span className="text-[10px] font-mono font-bold text-secondary/60 tracking-wider">
                    Ctrl K
                  </span>
                </div>
              </div>

              <div className="h-8 w-px bg-outline-variant/40 hidden lg:block mx-1"></div>
              {!user ? (
                <div className="h-9 w-9 rounded-full bg-outline-variant/40 animate-pulse" />
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger className="flex h-9 w-9 items-center justify-center rounded-full hover:opacity-90 transition-opacity cursor-pointer outline-none">
                    {user.avatar && !avatarError ? (
                      <Image
                        src={user.avatar}
                        alt="Avatar"
                        width={36}
                        height={36}
                        className="h-9 w-9 rounded-full object-cover border border-outline-variant"
                        unoptimized={true}
                        onError={() => setAvatarError(true)}
                      />
                    ) : (
                      <Image
                        src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.displayName || user.email || "U")}`}
                        alt="Avatar"
                        width={36}
                        height={36}
                        className="h-9 w-9 rounded-full object-cover border border-outline-variant"
                        unoptimized={true}
                      />
                    )}
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-56 mt-2 border border-outline-variant bg-surface-container-lowest text-on-background p-1.5 rounded-xl shadow-lg"
                  >
                    <div className="px-2.5 py-2 text-xs font-semibold text-secondary truncate">
                      Logged in as: {user.email}
                    </div>
                    <DropdownMenuSeparator className="-mx-1.5 my-1.5 h-px bg-outline-variant/30" />
                    <DropdownMenuItem
                      className="rounded-lg hover:bg-surface-container-low px-2 py-1.5 cursor-pointer outline-none flex items-center"
                      onClick={() => router.push("/dashboard/settings")}
                    >
                      <HugeiconsIcon
                        icon={Settings01Icon}
                        size={14}
                        color="currentColor"
                        strokeWidth={1.5}
                        className="mr-2 text-secondary"
                      />
                      Settings
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="-mx-1.5 my-1.5 h-px bg-outline-variant/30" />
                    <DropdownMenuItem
                      variant="destructive"
                      className="rounded-lg hover:bg-destructive/10 px-2 py-1.5 cursor-pointer outline-none text-destructive font-medium"
                      onClick={() => setLogoutConfirmOpen(true)}
                    >
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 w-full p-4 sm:p-6 lg:p-8 pt-6">
          <div className="max-w-[1400px] mx-auto w-full">{children}</div>
        </main>

        <SearchModal />
      </div>

      {/* Mobile Slide Navigation */}
      <div
        className={`lg:hidden fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm transition-opacity duration-300 ease-in-out ${isMobileMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={closeMobileMenu}
      />
      <div
        className={`lg:hidden fixed inset-y-0 left-0 z-[110] w-[280px] sm:w-[320px] bg-surface-container-lowest border-r border-outline-variant shadow-2xl transition-transform duration-300 ease-in-out flex flex-col ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-outline-variant">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="text-on-surface-variant cursor-pointer -ml-2"
              onClick={closeMobileMenu}
            >
              <HugeiconsIcon icon={Cancel01Icon} size={20} color="currentColor" strokeWidth={1.5} />
            </Button>
            <Link
              href="/"
              className="text-lg font-headline-md font-bold tracking-tight text-primary-sendlib hover:opacity-80 transition-opacity cursor-pointer"
            >
              Sendliberty
            </Link>
          </div>

          {/* Avatar in mobile nav */}
          {user && (
            <div className="flex h-8 w-8 items-center justify-center rounded-full overflow-hidden border border-outline-variant">
              {user.avatar && !avatarError ? (
                <Image
                  src={user.avatar}
                  alt="Avatar"
                  width={32}
                  height={32}
                  className="h-full w-full object-cover"
                  unoptimized={true}
                  onError={() => setAvatarError(true)}
                />
              ) : (
                <Image
                  src={`https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.displayName || user.email || "U")}`}
                  alt="Avatar"
                  width={32}
                  height={32}
                  className="h-full w-full object-cover"
                  unoptimized={true}
                />
              )}
            </div>
          )}
        </div>

        <div className="px-4 py-6 space-y-1.5 overflow-y-auto flex-1">
          {navigation.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeMobileMenu}
                className={`flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-label-sm transition-all cursor-pointer ${
                  isActive
                    ? "bg-surface-container-low text-primary-sendlib font-semibold"
                    : "text-secondary hover:bg-surface-container-low hover:text-on-background"
                }`}
              >
                <HugeiconsIcon icon={item.icon} size={18} color="currentColor" strokeWidth={1.5} />
                {item.name}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Sign Out Confirmation Dialog */}
      <Dialog open={logoutConfirmOpen} onOpenChange={setLogoutConfirmOpen}>
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
              onClick={() => setLogoutConfirmOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1 rounded-lg font-label-sm bg-destructive hover:bg-destructive/90 text-white"
              onClick={() => {
                setLogoutConfirmOpen(false);
                logout();
              }}
            >
              Sign Out
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

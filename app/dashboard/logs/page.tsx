"use client";

import { DebugPipeline, HealthBadge } from "@/components/debugger/DebugPipeline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { EmailLog, useEmailLogs } from "@/hooks/useEmailLogs";
import { useGmailAccounts } from "@/hooks/useGmailAccounts";
import { redactEmail } from "@/utils/redact";
import {
  CancelCircleIcon,
  CheckmarkCircle01Icon,
  FileTypeIcon,
  Search01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { useState } from "react";

export default function LogsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [selectedLog, setSelectedLog] = useState<EmailLog | null>(null);

  const { data: accounts } = useGmailAccounts();
  const { data: logsData, isLoading } = useEmailLogs(page, 20, {
    search,
    status,
    from: fromEmail,
  });

  const logs = Array.isArray(logsData?.data) ? logsData.data : [];
  const meta = logsData?.meta ?? { total: 0, page, limit: 20, totalPages: 1 };
  const hasNextPage = logs.length === (meta.limit ?? 20);

  const isFiltered = !!(search || status || fromEmail);

  return (
    <div className="space-y-6">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div>
          <h1 className="text-3xl font-headline-md font-bold tracking-tight text-primary-sendlib">
            Email Logs
          </h1>
          <p className="text-secondary font-body-md mt-1">
            View the recent history of all emails sent via your API keys.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          {/* Search bar */}
          <div className="flex items-center gap-2 bg-surface-container-low border border-outline-variant rounded-lg px-3 h-10 shadow-xs focus-within:border-primary-sendlib focus-within:bg-surface-container-high transition-colors w-full sm:w-72">
            <HugeiconsIcon
              icon={Search01Icon}
              size={16}
              color="currentColor"
              strokeWidth={1.5}
              className="text-secondary shrink-0"
            />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="bg-transparent border-none outline-none text-sm px-2 placeholder:text-secondary w-full font-sans"
              placeholder="Search recipient, from, or subject..."
            />
          </div>

          {/* Status selector */}
          <Select
            value={status}
            onValueChange={(val) => {
              setStatus(val as string);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-40 bg-surface-container-low border border-outline-variant rounded-lg px-3 h-10 text-sm outline-none text-secondary focus:border-primary-sendlib focus:bg-surface-container-high transition-colors cursor-pointer">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>

          {/* From account selector */}
          <Select
            value={fromEmail}
            onValueChange={(val) => {
              setFromEmail(val as string);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-56 bg-surface-container-low border border-outline-variant rounded-lg px-3 h-10 text-sm outline-none text-secondary focus:border-primary-sendlib focus:bg-surface-container-high transition-colors cursor-pointer">
              <SelectValue placeholder="All Accounts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Accounts</SelectItem>
              {accounts?.map((acc) => (
                <SelectItem key={acc.id} value={acc.email}>
                  {acc.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="rounded-xl border border-outline-variant bg-surface-container-lowest overflow-hidden shadow-none">
        <table className="w-full text-sm text-left">
          <thead className="bg-surface-container-low border-b border-outline-variant text-secondary font-label-sm">
            <tr>
              <th className="px-6 py-4">From</th>
              <th className="px-6 py-4">To</th>
              <th className="px-6 py-4">Subject</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-6 py-4">
                    <Skeleton className="h-5 w-28" />
                  </td>
                  <td className="px-6 py-4">
                    <Skeleton className="h-5 w-28" />
                  </td>
                  <td className="px-6 py-4">
                    <Skeleton className="h-5 w-full max-w-[150px]" />
                  </td>
                  <td className="px-6 py-4">
                    <Skeleton className="h-5 w-16" />
                  </td>
                  <td className="px-6 py-4">
                    <Skeleton className="h-4 w-24" />
                  </td>
                  <td className="px-6 py-4">
                    <Skeleton className="h-8 w-12 ml-auto" />
                  </td>
                </tr>
              ))
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-16 text-center">
                  {isFiltered ? (
                    <div className="flex flex-col items-center justify-center max-w-[420px] mx-auto space-y-3">
                      <HugeiconsIcon
                        icon={Search01Icon}
                        size={48}
                        color="currentColor"
                        strokeWidth={1.5}
                        className="text-primary-sendlib opacity-50 mb-1"
                      />
                      <h3 className="text-lg font-headline-md font-bold text-on-background">
                        No matching logs
                      </h3>
                      <p className="text-sm text-secondary leading-relaxed">
                        We couldn&apos;t find any email logs matching your search terms or filter
                        selections. Try clearing your filters.
                      </p>
                      <div className="pt-2">
                        <Button
                          variant="outline"
                          className="rounded-lg font-label-sm border border-outline-variant bg-surface-container-lowest text-primary-sendlib shadow-xs hover:bg-surface-container-low px-4"
                          onClick={() => {
                            setSearch("");
                            setStatus("");
                            setFromEmail("");
                            setPage(1);
                          }}
                        >
                          Clear Filters
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center max-w-[420px] mx-auto space-y-3">
                      <HugeiconsIcon
                        icon={FileTypeIcon}
                        size={48}
                        color="currentColor"
                        strokeWidth={1.5}
                        className="text-primary-sendlib opacity-50 mb-1"
                      />
                      <h3 className="text-lg font-headline-md font-bold text-on-background">
                        No email logs found
                      </h3>
                      <p className="text-sm text-secondary leading-relaxed">
                        You haven&apos;t sent any emails yet. Send an email using our REST API or
                        Quickstart guide to view logs here.
                      </p>
                      <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                        <Link href="/docs/send">
                          <Button
                            variant="outline"
                            className="rounded-lg font-label-sm border border-outline-variant bg-surface-container-lowest text-primary-sendlib shadow-xs hover:bg-surface-container-low px-4"
                          >
                            View API Docs
                          </Button>
                        </Link>
                        <Link href="/dashboard/keys?generate=true">
                          <Button className="rounded-lg font-label-sm bg-surface-container-low border border-outline-variant/60 hover:bg-surface-container text-white shadow-sm px-4">
                            Get API Key
                          </Button>
                        </Link>
                      </div>
                    </div>
                  )}
                </td>
              </tr>
            ) : (
              logs.map((log: EmailLog) => (
                <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4 font-mono text-xs text-muted-foreground whitespace-nowrap">
                    {log.from ? redactEmail(log.from) : "-"}
                  </td>
                  <td className="px-6 py-4 font-semibold text-foreground whitespace-nowrap">
                    {redactEmail(log.to)}
                  </td>
                  <td
                    className="px-6 py-4 text-muted-foreground truncate max-w-[200px]"
                    title={log.subject}
                  >
                    {log.subject}
                  </td>
                  <td className="px-6 py-4">
                    <Badge
                      variant={log.status === "sent" ? "outline" : "secondary"}
                      className={`
                        font-semibold rounded-md tracking-wider text-[10px]
                        ${log.status === "failed" ? "bg-destructive/10 text-destructive border-destructive/20" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"}
                      `}
                    >
                      {log.status === "sent" && (
                        <HugeiconsIcon
                          icon={CheckmarkCircle01Icon}
                          size={12}
                          color="currentColor"
                          strokeWidth={1.5}
                          className="mr-1"
                        />
                      )}
                      {log.status === "failed" && (
                        <HugeiconsIcon
                          icon={CancelCircleIcon}
                          size={12}
                          color="currentColor"
                          strokeWidth={1.5}
                          className="mr-1"
                        />
                      )}
                      {log.status}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleDateString()}{" "}
                    {new Date(log.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-lg h-8 text-xs font-semibold border-outline-variant hover:bg-surface-container-low text-primary-sendlib"
                      onClick={() => setSelectedLog(log)}
                    >
                      View
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <div className="p-4 border-t border-border flex justify-between items-center bg-muted/20">
          <span className="text-sm text-muted-foreground">Page {page}</span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1 || isLoading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!hasNextPage || isLoading}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      <Sheet open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <SheetContent side="right">
          <SheetHeader className="pb-4 border-b border-outline-variant">
            <SheetTitle
              className="text-xl font-headline-md font-bold text-primary-sendlib truncate pr-6"
              title={selectedLog?.subject}
            >
              {selectedLog?.subject || "Email Details"}
            </SheetTitle>
            <SheetDescription className="text-secondary text-sm">
              Detailed metadata for this relay log.
            </SheetDescription>
          </SheetHeader>

          {selectedLog && (
            <div className="py-6 space-y-6">
              {/* Status Header */}
              <div className="flex items-center justify-between p-4 rounded-xl border border-outline-variant bg-surface-container-low/50">
                <span className="text-sm font-semibold text-secondary">Delivery Status</span>
                <Badge
                  variant={selectedLog.status === "sent" ? "outline" : "secondary"}
                  className={`
                    font-semibold rounded-md tracking-wider text-[10px] py-1 px-2.5
                    ${selectedLog.status === "failed" ? "bg-destructive/10 text-destructive border-destructive/20" : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"}
                  `}
                >
                  {selectedLog.status === "sent" && (
                    <HugeiconsIcon
                      icon={CheckmarkCircle01Icon}
                      size={12}
                      color="currentColor"
                      strokeWidth={1.5}
                      className="mr-1"
                    />
                  )}
                  {selectedLog.status === "failed" && (
                    <HugeiconsIcon
                      icon={CancelCircleIcon}
                      size={12}
                      color="currentColor"
                      strokeWidth={1.5}
                      className="mr-1"
                    />
                  )}
                  {selectedLog.status.toUpperCase()}
                </Badge>
              </div>

              {/* Core Details Grid */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-secondary">
                  Relay Information
                </h4>
                <div className="rounded-xl border border-outline-variant divide-y divide-outline-variant bg-surface-container-lowest overflow-hidden">
                  {/* From */}
                  <div className="p-4 flex flex-col gap-1">
                    <span className="text-xs font-semibold text-secondary">From (Sender)</span>
                    <span className="text-sm font-mono text-on-background break-all">
                      {selectedLog.from ? redactEmail(selectedLog.from) : "-"}
                    </span>
                  </div>

                  {/* To */}
                  <div className="p-4 flex flex-col gap-1">
                    <span className="text-xs font-semibold text-secondary">To (Recipient)</span>
                    <span className="text-sm font-mono text-on-background break-all">
                      {redactEmail(selectedLog.to)}
                    </span>
                  </div>

                  {/* Date */}
                  <div className="p-4 flex flex-col gap-1">
                    <span className="text-xs font-semibold text-secondary">Timestamp</span>
                    <span className="text-sm text-on-background">
                      {new Date(selectedLog.createdAt).toLocaleDateString()}{" "}
                      {new Date(selectedLog.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </span>
                  </div>

                  {/* API Key ID */}
                  {selectedLog.apiKeyId && (
                    <div className="p-4 flex flex-col gap-1">
                      <span className="text-xs font-semibold text-secondary">API Key ID</span>
                      <span className="text-sm font-mono text-on-background select-all">
                        {selectedLog.apiKeyId}
                      </span>
                    </div>
                  )}

                  {/* Provider */}
                  <div className="p-4 flex flex-col gap-1">
                    <span className="text-xs font-semibold text-secondary">Relay Provider</span>
                    <span className="text-sm text-on-background flex items-center gap-1.5 capitalize font-medium">
                      <span className="w-2 h-2 rounded-full bg-[#ea4335]"></span>
                      {selectedLog.provider || "gmail"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Delivery Diagnostics (MessageId / Error message) */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-secondary">
                  Diagnostics
                </h4>

                {selectedLog.status === "sent" ? (
                  <div className="p-4 rounded-xl border border-outline-variant bg-surface-container-low space-y-1.5">
                    <span className="text-xs font-semibold text-secondary block">
                      Upstream Message ID
                    </span>
                    <code className="text-xs font-mono text-primary-sendlib bg-surface-container p-2 rounded border border-outline-variant/60 block break-all select-all">
                      {selectedLog.messageId || "-"}
                    </code>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl border border-destructive/20 bg-destructive/[0.01] space-y-1.5">
                    <span className="text-xs font-semibold text-destructive block">
                      Error Message
                    </span>
                    <div className="text-xs font-mono text-destructive bg-destructive/[0.02] p-3 rounded border border-destructive/10 leading-relaxed break-words whitespace-pre-wrap">
                      {selectedLog.error ||
                        "An unknown SMTP transmission error occurred during relay dispatch."}
                    </div>
                  </div>
                )}
              </div>

              {selectedLog.debug && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-secondary">
                      Debugger
                    </h4>
                    <HealthBadge health={selectedLog.debug.health} />
                  </div>
                  <DebugPipeline report={selectedLog.debug} />
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

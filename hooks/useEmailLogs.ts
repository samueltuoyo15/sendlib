import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

export interface EmailLog {
  _id: string;
  id?: string;
  from?: string;
  to: string;
  subject: string;
  status: "sent" | "failed";
  provider: "gmail";
  messageId?: string;
  error?: string;
  apiKeyId?: string;
  templateSlug?: string;
  debug?: {
    health: "healthy" | "warnings" | "failed";
    steps: { key: string; label: string; ok: boolean; skipped?: boolean; detail: string }[];
    issues: { severity: "warning" | "error"; code: string; title: string; hint: string }[];
    htmlBytes?: number;
    templateSlug?: string;
  };
  trackingId?: string;
  trackOpens?: boolean;
  opened?: boolean;
  openCount?: number;
  firstOpenedAt?: string;
  lastOpenedAt?: string;
  openEvents?: { occurredAt: string; ipHash?: string; userAgent?: string }[];
  createdAt: string;
}

export interface EmailLogsFilters {
  search?: string;
  status?: string;
  from?: string;
}

export function useEmailLogs(page = 1, limit = 20, filters?: EmailLogsFilters) {
  return useQuery({
    queryKey: ["email-logs", page, limit, filters?.search, filters?.status, filters?.from],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (filters?.search) params.append("search", filters.search);
      if (filters?.status) params.append("status", filters.status);
      if (filters?.from) params.append("from", filters.from);

      const res = await api.get<
        never,
        {
          success: boolean;
          data: EmailLog[];
          meta: { page: number; limit: number; total: number; totalPages: number };
        }
      >(`/logs?${params.toString()}`);
      return res;
    },
  });
}

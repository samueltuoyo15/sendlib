import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

export interface ApiKey {
  id: string;
  keyPrefix: string;
  name: string;
  revoked: boolean;
  allowedOrigins: string[];
  senderEmail?: string | null;
  lastUsedAt?: string;
  createdAt: string;
}

export function useApiKeys() {
  return useQuery({
    queryKey: ["api-keys"],
    queryFn: async () => {
      const res = await api.get<never, { success: boolean; data: ApiKey[] }>("/keys");
      return res.data;
    },
  });
}

export function useGenerateApiKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      name?: string;
      allowedOrigins?: string[];
      senderEmail?: string | null;
    }) => {
      const res = await api.post<
        never,
        {
          success: boolean;
          data: { key: string; id: string; prefix: string; name: string; allowedOrigins: string[] };
        }
      >("/keys", params);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    },
  });
}

export function useDeleteApiKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/keys/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    },
  });
}

export function useRevokeApiKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await api.patch(`/keys/${id}`, { revoked: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    },
  });
}

export function useUpdateApiKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      allowedOrigins,
      name,
      senderEmail,
    }: { id: string; allowedOrigins?: string[]; name?: string; senderEmail?: string | null }) => {
      const res = await api.patch<never, { success: boolean; message: string; data: ApiKey }>(
        `/keys/${id}`,
        { allowedOrigins, name, senderEmail }
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    },
  });
}

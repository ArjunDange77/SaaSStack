import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/client";
import { scopeTenant } from "@/lib/queryKeys";
import { useAuth } from "@/auth/AuthContext";

export interface DashboardHookOptions {
  endpoint: string;
  refetchIntervalMs?: number;
  staleTimeMs?: number;
}

export function useProductDashboard<T>(options: DashboardHookOptions) {
  const { tenantSlug } = useAuth();
  const {
    endpoint,
    refetchIntervalMs = 30_000,
    staleTimeMs = 10_000,
  } = options;

  return useQuery<T>({
    queryKey: scopeTenant(tenantSlug, ["dashboard", endpoint]),
    queryFn: async () => {
      const { data } = await api.get<T>(endpoint);
      return data;
    },
    refetchInterval: refetchIntervalMs,
    staleTime: staleTimeMs,
  });
}

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/client";
import { useAuth } from "@/auth/AuthContext";
import { scopeTenant } from "@/lib/queryKeys";

export interface SbOperatorDashboard {
  active_buses: number;
  ongoing_trips: number;
  students_onboard: number;
  absent_students_today: number;
  overdue_fees_count: number;
  incidents_today: number;
  total_collected_today: string;
  pending_fees_total: string;
  late_routes: { id: number; route__name: string; status: string }[];
  pending_collections: {
    id: number;
    student__full_name: string;
    month: string;
    amount: string;
    due_date: string;
    status: string;
  }[];
  recent_incidents: {
    id: number;
    category: string;
    severity: string;
    description: string;
    created_at: string;
  }[];
  total_students: number;
  total_drivers: number;
}

export interface SbDriverToday {
  trip_id: number;
  trip_status: string;
  trip_date: string;
  route: { id: number; name: string; direction: string };
  bus: { id: number; fleet_number: string };
  checklist: {
    student_id: number;
    full_name: string;
    stop_name: string;
    sequence: number;
    pickup_status: string;
    drop_status: string;
  }[];
}

export interface SbParentMe {
  parent: { id: number; full_name: string };
  children: {
    id: number;
    full_name: string;
    route_name: string;
    bus_number: string;
    pickup_stop: string;
    drop_stop: string;
    pickup_status: string;
    drop_status: string;
    fee_status: string;
    fee_overdue_amount: string;
  }[];
  reminders: { id: number; kind: string; title: string; body: string; created_at: string }[];
  recent_incidents: { id: number; category: string; severity: string; description: string }[];
}

export function useSbOperatorDashboard() {
  const { tenantSlug } = useAuth();
  return useQuery({
    queryKey: scopeTenant(tenantSlug, ["sb-operator-dashboard"]),
    queryFn: async () => {
      const { data } = await api.get<SbOperatorDashboard>("/sb/operator/dashboard/");
      return data;
    },
  });
}

export function useSbDriverToday() {
  const { tenantSlug } = useAuth();
  return useQuery({
    queryKey: scopeTenant(tenantSlug, ["sb-driver-today"]),
    queryFn: async () => {
      const { data } = await api.get<SbDriverToday>("/sb/driver/today/");
      return data;
    },
  });
}

export function useSbParentMe() {
  const { tenantSlug } = useAuth();
  return useQuery({
    queryKey: scopeTenant(tenantSlug, ["sb-parent-me"]),
    queryFn: async () => {
      const { data } = await api.get<SbParentMe>("/sb/parent/me/");
      return data;
    },
  });
}

export function useSbTripActions(tripId: number) {
  const qc = useQueryClient();
  const { tenantSlug } = useAuth();
  const invalidate = () =>
    qc.invalidateQueries({ queryKey: scopeTenant(tenantSlug, ["sb-driver-today"]) });

  const start = useMutation({
    mutationFn: async () => {
      await api.post(`/sb/driver/trips/${tripId}/start/`);
    },
    onSuccess: invalidate,
  });

  const attendance = useMutation({
    mutationFn: async (marks: { student_id: number; pickup_status: string }[]) => {
      await api.post(`/sb/driver/trips/${tripId}/attendance/`, { marks });
    },
    onSuccess: invalidate,
  });

  const complete = useMutation({
    mutationFn: async () => {
      await api.post(`/sb/driver/trips/${tripId}/complete/`);
    },
    onSuccess: invalidate,
  });

  return { start, attendance, complete };
}

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

export interface SbBriefingBanner {
  level: "safe" | "warning" | "danger";
  message: string;
}

export interface SbBriefingTrip {
  id: number;
  route_name: string;
  driver_name: string;
  onboard: number;
  total: number;
  stop_index: number;
  stop_total: number;
  elapsed: string;
  completed_at_display?: string;
  status: string;
}

export interface SbActionItem {
  type: "fee" | "absent" | "incident";
  id: number;
  title: string;
  subtitle: string;
  phone: string;
}

export interface SbOperatorBriefing {
  greeting: string;
  banner: SbBriefingBanner;
  trips: SbBriefingTrip[];
  action_items: SbActionItem[];
  dashboard: SbOperatorDashboard;
}

export interface SbFeeRow {
  id: number;
  student_name: string;
  month: string;
  amount: string;
  due_date: string;
  status: string;
  days_overdue: number;
  parent_phone: string;
}

export interface SbFeeTrendMonth {
  month: string;
  label: string;
  collection_pct: number;
  collected: string;
}

export interface SbFeesGrouped {
  overdue: SbFeeRow[];
  due_this_month: SbFeeRow[];
  paid: SbFeeRow[];
  summary: {
    collected: string;
    pending: string;
    collection_pct: number;
    month?: string;
  };
  trend?: SbFeeTrendMonth[];
}

export interface SbNotificationRow {
  id: number;
  created_at: string;
  event_type: string;
  student_name: string;
  to_phone_masked: string;
  channel: string;
  status: string;
  whatsapp_url: string;
  body_preview: string;
}

export interface SbDriverChecklistRow {
  student_id: number;
  full_name: string;
  stop_name: string;
  sequence: number;
  estimated_time: string | null;
  pickup_status: string;
  drop_status: string;
  pickup_absent_reason: string;
}

export interface SbDriverToday {
  trip_id: number | null;
  trip_status: string | null;
  trip_date: string;
  started_at: string | null;
  driver_name: string;
  route_name: string;
  bus_fleet_number: string;
  route: { id: number | null; name: string; direction: string };
  bus: { id: number | null; fleet_number: string };
  checklist: SbDriverChecklistRow[];
  can_open_checklist: boolean;
  last_location: { latitude: string; longitude: string; recorded_at: string } | null;
}

export type SbHeroLevel = "safe" | "warning" | "danger" | "neutral";

export interface SbHeroStatus {
  level: SbHeroLevel;
  headline: string;
  detail: string;
}

export interface SbCalendarDay {
  date: string;
  status: "present" | "absent" | "none";
  reason?: string;
}

export interface SbChildFee {
  month: string;
  amount: string;
  status: string;
  due_date: string;
  payment_link_url: string;
}

export interface SbParentChild {
  id: number;
  full_name: string;
  school_name: string;
  class_grade: string;
  route_name: string;
  bus_number: string;
  pickup_stop: string;
  drop_stop: string;
  pickup_status: string;
  drop_status: string;
  fee_status: string;
  fee_overdue_amount: string;
  hero_status: SbHeroStatus;
  calendar_days: SbCalendarDay[];
  fees: SbChildFee[];
}

export interface SbParentMe {
  parent: { id: number; full_name: string };
  children: SbParentChild[];
  reminders: { id: number; kind: string; title: string; body: string; created_at: string }[];
  recent_incidents: { id: number; category: string; severity: string; description: string }[];
}

export interface SbAttendanceHistoryRow {
  id: number;
  trip_id: number;
  trip_date: string;
  route_name: string;
  student_id: number;
  student_name: string;
  pickup_status: string;
  drop_status: string;
  marked_at: string | null;
}

const SB_BRIEFING_REFETCH_MS = 30_000;

export function useSbOperatorBriefing() {
  const { tenantSlug } = useAuth();
  return useQuery({
    queryKey: scopeTenant(tenantSlug, ["sb-operator-briefing"]),
    queryFn: async () => {
      const { data } = await api.get<SbOperatorBriefing>("/sb/operator/briefing/");
      return data;
    },
    refetchInterval: SB_BRIEFING_REFETCH_MS,
  });
}

export interface SbOperatorTrip {
  id: number;
  route_name: string;
  bus_registration: string;
  driver_name: string;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  current_stop_index: number;
  total_stops: number;
  current_stop_name: string;
  students_onboard: number;
  total_students: number;
  absent_count: number;
  incident_count: number;
  duration_minutes: number | null;
  stops: { name: string; completed: boolean; current: boolean }[];
}

export interface SbTripsTodayResponse {
  stats: {
    total_students: number;
    absent_count: number;
    avg_duration_minutes: number;
    on_time_rate: number;
  };
  trips: SbOperatorTrip[];
}

export interface SbAttendanceSummaryStudent {
  id: number;
  name: string;
  stop_name: string;
  route_name: string;
  attendance_rate: number;
  attendance_dots: ("present" | "absent" | "no_data")[];
  is_low_attendance: boolean;
}

export interface SbAttendanceSummary {
  stats: {
    school_days: number;
    avg_attendance_rate: number;
    total_absences: number;
    low_attendance_count: number;
  };
  low_attendance_students: { id: number; name: string }[];
  students: SbAttendanceSummaryStudent[];
}

export function useSbOperatorFees(month?: string) {
  const { tenantSlug } = useAuth();
  return useQuery({
    queryKey: scopeTenant(tenantSlug, ["sb-operator-fees", month ?? ""]),
    queryFn: async () => {
      const { data } = await api.get<SbFeesGrouped & { trend?: SbFeeTrendMonth[] }>(
        "/sb/operator/fees/",
        { params: month ? { month } : {} }
      );
      return data;
    },
  });
}

export function useSbOperatorTripsToday() {
  const { tenantSlug } = useAuth();
  return useQuery({
    queryKey: scopeTenant(tenantSlug, ["sb-operator-trips-today"]),
    queryFn: async () => {
      const { data } = await api.get<SbTripsTodayResponse>("/sb/operator/trips/today/");
      return data;
    },
    refetchInterval: SB_BRIEFING_REFETCH_MS,
  });
}

export function useSbOperatorTripsByDate(date?: string) {
  const { tenantSlug } = useAuth();
  return useQuery({
    queryKey: scopeTenant(tenantSlug, ["sb-operator-trips-date", date ?? ""]),
    queryFn: async () => {
      const { data } = await api.get<{ date: string; trips: SbOperatorTrip[] }>(
        "/sb/operator/trips/",
        { params: { date } }
      );
      return data;
    },
    enabled: Boolean(date),
  });
}

export function useSbAttendanceSummary(month: string, route = "all") {
  const { tenantSlug } = useAuth();
  return useQuery({
    queryKey: scopeTenant(tenantSlug, ["sb-attendance-summary", month, route]),
    queryFn: async () => {
      const { data } = await api.get<SbAttendanceSummary>(
        "/sb/operator/attendance/summary/",
        { params: { month, route } }
      );
      return data;
    },
  });
}

export function useSbNotificationUnread(enabled = true) {
  const { tenantSlug } = useAuth();
  return useQuery({
    queryKey: scopeTenant(tenantSlug, ["sb-notifications-unread"]),
    queryFn: async () => {
      const { data } = await api.get<{ unread_count: number }>(
        "/sb/operator/notifications/",
        { params: { count: 1 } }
      );
      return data.unread_count;
    },
    enabled,
    refetchInterval: 60_000,
  });
}

export function useSbFeeRemind() {
  const qc = useQueryClient();
  const { tenantSlug } = useAuth();
  return useMutation({
    mutationFn: async (feeId: number) => {
      const { data } = await api.post<{ status: string; whatsapp_url: string; message_id: number }>(
        `/sb/operator/fees/${feeId}/remind/`
      );
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: scopeTenant(tenantSlug, ["sb-operator-fees"]) });
      qc.invalidateQueries({ queryKey: scopeTenant(tenantSlug, ["sb-operator-notifications"]) });
    },
  });
}

export function useSbOperatorNotifications(limit = 100) {
  const { tenantSlug } = useAuth();
  return useQuery({
    queryKey: scopeTenant(tenantSlug, ["sb-operator-notifications", limit]),
    queryFn: async () => {
      const { data } = await api.get<{ results: SbNotificationRow[] }>(
        "/sb/operator/notifications/",
        { params: { limit } }
      );
      return data.results;
    },
  });
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

export function useSbAttendanceHistory(limit = 50) {
  const { tenantSlug } = useAuth();
  return useQuery({
    queryKey: scopeTenant(tenantSlug, ["sb-attendance-history", limit]),
    queryFn: async () => {
      const { data } = await api.get<{ results: SbAttendanceHistoryRow[] }>(
        "/sb/operator/attendance-history/",
        { params: { limit } }
      );
      return data.results;
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

export type AttendanceMark = {
  student_id: number;
  pickup_status?: string;
  drop_status?: string;
  pickup_absent_reason?: string;
};

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
    mutationFn: async (marks: AttendanceMark[]) => {
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

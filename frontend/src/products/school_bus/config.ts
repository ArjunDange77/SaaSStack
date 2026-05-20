import type { ProductConfig } from "@/types/product";

export const SB_STATUS_COLORS: ProductConfig["statusColors"] = {
  completed: { bg: "#EAF3DE", text: "#27500A", dot: "#3B6D11" },
  pickup_in_progress: { bg: "#E1F5EE", text: "#085041", dot: "#1D9E75" },
  delayed: { bg: "#FAEEDA", text: "#633806", dot: "#854F0B" },
  scheduled: { bg: "#E6F1FB", text: "#0C447C", dot: "#185FA5" },
};

export const schoolBusConfig: ProductConfig = {
  slug: "school_bus",
  label: "School Bus",
  primaryColor: "#1D9E75",
  statusColors: SB_STATUS_COLORS,
  dashboardEndpoint: "/sb/operator/dashboard/",
  notificationEndpoint: "/sb/operator/notifications/",
  navSections: {
    TODAY: [
      { label: "Command center", href: "/sb/dashboard", icon: "home" },
      { label: "Today's trips", href: "/sb/trips", icon: "bus" },
      { label: "Attendance", href: "/sb/attendance", icon: "list" },
      { label: "Fees", href: "/sb/fees", icon: "coin" },
      { label: "Notifications", href: "/sb/notifications", icon: "bell" },
    ],
    MANAGE: [
      { label: "Students", href: "/r/sb-students", icon: "user" },
      { label: "Routes", href: "/r/sb-routes", icon: "route" },
      { label: "Drivers", href: "/r/sb-drivers", icon: "id" },
    ],
  },
  portals: [
    { role: "driver", path: "/sb/driver", component: "SbDriverPortal" },
    { role: "parent", path: "/sb/parent", component: "SbParentPortal" },
  ],
  datetimeLocale: "en-IN",
  timezone: "Asia/Kolkata",
  currency: "INR",
  currencySymbol: "₹",
};

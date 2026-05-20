import type { ProductConfig } from "@/types/product";

export const PG_STATUS_COLORS: ProductConfig["statusColors"] = {
  occupied: { bg: "#FCEBEB", text: "#791F1F", dot: "#A32D2D" },
  vacant: { bg: "#EAF3DE", text: "#27500A", dot: "#3B6D11" },
  reserved: { bg: "#E6F1FB", text: "#0C447C", dot: "#185FA5" },
};

export const pgManagementConfig: ProductConfig = {
  slug: "pg_management",
  label: "PG Management",
  primaryColor: "#185FA5",
  statusColors: PG_STATUS_COLORS,
  dashboardEndpoint: "/pg/dashboard/",
  navSections: {
    TODAY: [{ label: "Command center", href: "/dashboard", icon: "home" }],
    MANAGE: [
      { label: "Residents", href: "/r/pg-residents", icon: "user" },
      { label: "Rooms", href: "/r/pg-rooms", icon: "bed" },
      { label: "Rent", href: "/r/pg-rent-records", icon: "coin" },
    ],
  },
  portals: [{ role: "resident", path: "/resident", component: "ResidentPortal" }],
  datetimeLocale: "en-IN",
  timezone: "Asia/Kolkata",
  currency: "INR",
  currencySymbol: "₹",
};

export interface ProductNavItem {
  label: string;
  href: string;
  icon?: string;
}

export interface ProductPortalConfig {
  role: string;
  path: string;
  component: string;
}

export interface ProductConfig {
  slug: string;
  label: string;
  primaryColor?: string;
  statusColors?: Record<string, { bg: string; text: string; dot: string }>;
  dashboardEndpoint: string;
  notificationEndpoint?: string;
  navSections: Record<string, ProductNavItem[]>;
  portals?: ProductPortalConfig[];
  datetimeLocale?: string;
  timezone?: string;
  currency?: string;
  currencySymbol?: string;
}

export type FieldType =
  | "string"
  | "text"
  | "integer"
  | "decimal"
  | "boolean"
  | "choice"
  | "datetime"
  | "date"
  | "relation"
  | "file";

export interface FieldUiMeta {
  variant?: "badge" | "progress";
  badge_map?: Record<string, string>;
  help_text?: string;
  date_highlight?: "past";
  label_map?: Record<string, string>;
}

export interface ListFilterMeta {
  param: string;
  label: string;
  value?: string;
  count?: number;
}

export interface EmptyStateCta {
  label: string;
  href: string;
}

export interface FieldMeta {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  read_only?: boolean;
  help_text?: string;
  choices?: (string | number)[];
  related_resource?: string | null;
  relation_display_field?: string;
  ui?: FieldUiMeta;
}

export interface ActionMeta {
  name: string;
  label?: string;
  url_path: string;
  detail: boolean;
  methods: string[];
}

export const SUPPORTED_SCHEMA_MAJOR = 1;

export interface ResourceCapabilities {
  create: boolean;
  update: boolean;
  delete: boolean;
  actions: string[];
}

export interface ResourceSchema {
  schema_version: string;
  resource: string;
  title: string;
  description?: string;
  fields: FieldMeta[];
  list_display: string[];
  search: { fields: string[] };
  filters: { backends: string[] };
  ordering: { default: string[] };
  pagination?: { style: string; page_size: number; max_page_size: number };
  actions: ActionMeta[];
  capabilities?: ResourceCapabilities;
  list_filters?: ListFilterMeta[];
  empty_state?: string;
  empty_state_cta?: EmptyStateCta;
  list_views?: string[];
  list_path: string;
  detail_path_template: string;
}

export interface NavItem {
  id: number;
  label: string;
  href: string;
  icon: string;
  resource_slug: string;
  sort_order: number;
  nav_group?: string;
  open_in_new_tab: boolean;
}

export interface ResourceCatalogEntry {
  slug: string;
  title: string;
  description?: string;
  schema_version: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export function assertSupportedSchemaVersion(schema: ResourceSchema): void {
  const major = parseInt(schema.schema_version.split(".")[0], 10);
  if (major !== SUPPORTED_SCHEMA_MAJOR) {
    console.warn(
      `Unsupported schema_version ${schema.schema_version}; engine supports major ${SUPPORTED_SCHEMA_MAJOR}`
    );
  }
}

export function fieldByName(schema: ResourceSchema, name: string): FieldMeta | undefined {
  return schema.fields.find((f) => f.name === name);
}

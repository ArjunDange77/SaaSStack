export type FieldType =
  | "string"
  | "text"
  | "integer"
  | "decimal"
  | "boolean"
  | "choice"
  | "datetime"
  | "date"
  | "relation";

export interface FieldMeta {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  read_only?: boolean;
  help_text?: string;
  choices?: (string | number)[];
  related_resource?: string | null;
}

export interface ActionMeta {
  name: string;
  url_path: string;
  detail: boolean;
  methods: string[];
}

export interface ResourceSchema {
  resource: string;
  title: string;
  description?: string;
  fields: FieldMeta[];
  list_display: string[];
  search: { fields: string[] };
  filters: { backends: string[] };
  ordering: { default: string[] };
  actions: ActionMeta[];
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
  open_in_new_tab: boolean;
}

export interface ResourceCatalogEntry {
  slug: string;
  title: string;
  description?: string;
}

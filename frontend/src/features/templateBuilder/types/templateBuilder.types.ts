export type FieldType = 'string' | 'date' | 'number' | 'boolean' | 'enum' | 'object' | 'list';

export type TemplateStatus = 'draft' | 'published' | 'archived';

export interface TemplateField {
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  jinja: string;
  sample: unknown;
  description?: string | null;
  group?: string | null;
  allowed_values?: string[] | null;
  document_types?: string[] | null;
}

export interface TemplateFieldGroup {
  key: string;
  label: string;
  fields: TemplateField[];
}

export interface TemplateFieldRegistryResponse {
  document_type: string;
  groups: TemplateFieldGroup[];
}

export interface TemplateFieldInstance {
  id: string;
  field_key: string;
  label: string;
  jinja: string;
  group_id: string | null;
  occurrence_index: number;
  required: boolean;
  field_type: FieldType;
}

export interface TemplateRecord {
  id: string;
  name: string;
  document_type: string;
  status: TemplateStatus;
  editor_json: EditorJson;
  editor_html?: string | null;
  field_manifest: TemplateFieldInstance[];
  original_docx_path?: string | null;
  exported_docx_path?: string | null;
  preview_pdf_path?: string | null;
  version: number;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
}

export interface TemplateValidationIssue {
  code: string;
  message: string;
  severity: 'error' | 'warning';
  field_key?: string | null;
}

export interface TemplateValidationResponse {
  template_id: string;
  valid: boolean;
  errors: TemplateValidationIssue[];
  warnings: TemplateValidationIssue[];
  used_fields: string[];
  missing_required_fields: string[];
}

export interface EditorJson {
  type: string;
  attrs?: Record<string, unknown>;
  content?: EditorJson[];
  text?: string;
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
}

export interface TemplateFieldNodeAttrs {
  id: string;
  fieldKey: string;
  label: string;
  jinja: string;
  groupId: string | null;
  required: boolean;
  fieldType: FieldType;
}

export interface SelectedFieldInstance extends TemplateFieldInstance {
  attrs: TemplateFieldNodeAttrs;
}


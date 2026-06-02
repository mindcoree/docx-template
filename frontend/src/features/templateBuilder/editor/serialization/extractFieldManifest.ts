import type { EditorJson, FieldType, TemplateFieldInstance } from '../../types/templateBuilder.types';

export function extractFieldManifest(editorJson: EditorJson): TemplateFieldInstance[] {
  const counts = new Map<string, number>();
  const instances: TemplateFieldInstance[] = [];

  walk(editorJson, (node) => {
    if (node.type !== 'templateField') {
      return;
    }
    const attrs = (node.attrs ?? {}) as Record<string, unknown>;
    const fieldKey = String(attrs.fieldKey ?? '');
    if (!fieldKey) {
      return;
    }
    const occurrence = (counts.get(fieldKey) ?? 0) + 1;
    counts.set(fieldKey, occurrence);
    instances.push({
      id: String(attrs.id ?? `${fieldKey}-${occurrence}`),
      field_key: fieldKey,
      label: String(attrs.label ?? fieldKey),
      jinja: String(attrs.jinja ?? `{{ ${fieldKey} }}`),
      group_id: typeof attrs.groupId === 'string' ? attrs.groupId : null,
      occurrence_index: occurrence,
      required: Boolean(attrs.required),
      field_type: (attrs.fieldType ?? 'string') as FieldType,
    });
  });

  return instances;
}

function walk(node: EditorJson, visit: (node: EditorJson) => void): void {
  visit(node);
  for (const child of node.content ?? []) {
    walk(child, visit);
  }
}


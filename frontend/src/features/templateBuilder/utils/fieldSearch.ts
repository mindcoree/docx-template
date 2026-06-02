import type { TemplateField, TemplateFieldGroup } from '../types/templateBuilder.types';

export function flattenFieldGroups(groups: TemplateFieldGroup[]): TemplateField[] {
  return groups.flatMap((group) => group.fields);
}

export function searchFields(groups: TemplateFieldGroup[], query: string): TemplateFieldGroup[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return groups;
  }
  return groups
    .map((group) => ({
      ...group,
      fields: group.fields.filter((field) => {
        return [field.key, field.label, field.description ?? ''].some((value) =>
          value.toLowerCase().includes(normalized),
        );
      }),
    }))
    .filter((group) => group.fields.length > 0);
}

export function fieldByKey(groups: TemplateFieldGroup[], key: string): TemplateField | undefined {
  return flattenFieldGroups(groups).find((field) => field.key === key);
}


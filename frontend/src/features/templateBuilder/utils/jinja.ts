export function normalizeJinja(fieldKey: string): string {
  return `{{ ${fieldKey.trim()} }}`;
}

export function extractJinjaKey(jinja: string): string | null {
  const match = jinja.match(/^\s*\{\{\s*([a-zA-Z_][\w]*(?:\.[a-zA-Z_][\w]*)*)\s*\}\}\s*$/);
  return match?.[1] ?? null;
}


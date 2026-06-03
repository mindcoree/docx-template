import type { DocxRelationship } from './docxTypes';
import { asArray, asNode, attr, parseXml, type XmlNode } from './xmlUtils';

export function parseRelationships(xml: string | undefined, basePath = 'word'): Record<string, DocxRelationship> {
  if (!xml) return {};
  const parsed = parseXml(xml);
  const relationshipsRoot = asNode(parsed.Relationships);
  const relationships: Record<string, DocxRelationship> = {};

  for (const node of asArray(relationshipsRoot?.Relationship).filter(isRecord)) {
    const id = attr(node, 'Id');
    const type = attr(node, 'Type');
    const target = attr(node, 'Target');
    if (!id || !type || !target) continue;
    const isExternal = attr(node, 'TargetMode') === 'External' || /^[a-z][a-z\d+.-]*:/i.test(target) || target.startsWith('//');
    relationships[id] = {
      id,
      type,
      target,
      targetPath: isExternal ? undefined : normalizePackagePath(basePath, target),
      isExternal,
    };
  }

  return relationships;
}

function normalizePackagePath(basePath: string, target: string): string | undefined {
  const stack = basePath.split('/').filter(Boolean);
  for (const segment of target.split('/')) {
    if (!segment || segment === '.') continue;
    if (segment === '..') {
      if (stack.length === 0) return undefined;
      stack.pop();
      continue;
    }
    stack.push(segment);
  }
  return stack.join('/');
}

function isRecord(value: unknown): value is XmlNode {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

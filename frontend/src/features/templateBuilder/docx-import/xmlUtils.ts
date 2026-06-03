import { XMLParser } from 'fast-xml-parser';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  parseAttributeValue: false,
  parseTagValue: false,
  preserveOrder: false,
  trimValues: false,
});

export type XmlNode = Record<string, unknown>;

export function parseXml(xml: string): XmlNode {
  return parser.parse(xml) as XmlNode;
}

export function asArray<T>(value: T | T[] | undefined | null): T[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

export function asNode(value: unknown): XmlNode | undefined {
  return isNode(value) ? value : undefined;
}

export function isNode(value: unknown): value is XmlNode {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function child(node: XmlNode | undefined, name: string): unknown {
  return node?.[name];
}

export function children(node: XmlNode | undefined, name: string): XmlNode[] {
  return asArray(node?.[name]).filter(isNode);
}

export function stringValue(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (isNode(value)) return stringValue(value['#text']);
  return '';
}

export function attr(node: XmlNode | undefined, name: string): string | undefined {
  if (!node) return undefined;
  const value = node[name] ?? node[`w:${name}`] ?? node[`r:${name}`] ?? node[`a:${name}`] ?? node[`wp:${name}`];
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  return undefined;
}

export function numberAttr(node: XmlNode | undefined, name: string): number | undefined {
  const value = attr(node, name);
  if (value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function hasChild(node: XmlNode | undefined, name: string): boolean {
  return node?.[name] !== undefined;
}

export function findFirstNode(node: unknown, predicate: (key: string, value: XmlNode) => boolean): XmlNode | undefined {
  if (!isNode(node)) return undefined;
  for (const [key, value] of Object.entries(node)) {
    if (isNode(value)) {
      if (predicate(key, value)) return value;
      const nested = findFirstNode(value, predicate);
      if (nested) return nested;
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        const nested = findFirstNode(item, predicate);
        if (nested) return nested;
      }
    }
  }
  return undefined;
}

export function findNodes(node: unknown, predicate: (key: string, value: XmlNode) => boolean, found: XmlNode[] = []): XmlNode[] {
  if (!isNode(node)) return found;
  for (const [key, value] of Object.entries(node)) {
    if (isNode(value)) {
      if (predicate(key, value)) found.push(value);
      findNodes(value, predicate, found);
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        findNodes(item, predicate, found);
      }
    }
  }
  return found;
}

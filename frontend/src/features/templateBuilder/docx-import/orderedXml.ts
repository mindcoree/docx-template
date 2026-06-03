import { XMLParser } from 'fast-xml-parser';

export type OrderedXmlChild = OrderedXmlElement | OrderedXmlText;

export interface OrderedXmlElement {
  name: string;
  attrs: Record<string, string>;
  children: OrderedXmlChild[];
}

export interface OrderedXmlText {
  name: '#text';
  text: string;
}

type RawOrderedNode = Record<string, unknown>;

const orderedParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  parseAttributeValue: false,
  parseTagValue: false,
  preserveOrder: true,
  trimValues: false,
});

export function parseOrderedXml(xml: string): OrderedXmlElement | undefined {
  const parsed = orderedParser.parse(xml) as RawOrderedNode[];
  return convertChildren(parsed).find((child): child is OrderedXmlElement => isOrderedElement(child) && !child.name.startsWith('?'));
}

export function orderedChildren(node: OrderedXmlElement | undefined, name: string): OrderedXmlElement[] {
  if (!node) return [];
  return node.children.filter((child): child is OrderedXmlElement => isOrderedElement(child) && child.name === name);
}

export function firstOrderedChild(node: OrderedXmlElement | undefined, name: string): OrderedXmlElement | undefined {
  return orderedChildren(node, name)[0];
}

export function orderedAttr(node: OrderedXmlElement | undefined, name: string): string | undefined {
  if (!node) return undefined;
  return node.attrs[name] ?? node.attrs[`w:${name}`] ?? node.attrs[`r:${name}`] ?? node.attrs[`a:${name}`] ?? node.attrs[`wp:${name}`];
}

export function orderedNumberAttr(node: OrderedXmlElement | undefined, name: string): number | undefined {
  const value = orderedAttr(node, name);
  if (value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function orderedHasChild(node: OrderedXmlElement | undefined, name: string): boolean {
  return firstOrderedChild(node, name) !== undefined;
}

export function orderedText(node: OrderedXmlElement | undefined): string {
  if (!node) return '';
  return node.children
    .map((child) => {
      if (!isOrderedElement(child)) return child.text;
      return orderedText(child);
    })
    .join('');
}

export function findOrderedNodes(
  node: OrderedXmlChild | OrderedXmlChild[] | undefined,
  predicate: (node: OrderedXmlElement) => boolean,
  found: OrderedXmlElement[] = [],
): OrderedXmlElement[] {
  if (!node) return found;
  if (Array.isArray(node)) {
    for (const child of node) findOrderedNodes(child, predicate, found);
    return found;
  }
  if (!isOrderedElement(node)) return found;
  if (predicate(node)) found.push(node);
  for (const child of node.children) findOrderedNodes(child, predicate, found);
  return found;
}

export function findFirstOrderedNode(
  node: OrderedXmlChild | OrderedXmlChild[] | undefined,
  predicate: (node: OrderedXmlElement) => boolean,
): OrderedXmlElement | undefined {
  return findOrderedNodes(node, predicate)[0];
}

export function isOrderedElement(child: OrderedXmlChild): child is OrderedXmlElement {
  return child.name !== '#text';
}

function convertChildren(rawNodes: RawOrderedNode[]): OrderedXmlChild[] {
  const children: OrderedXmlChild[] = [];
  for (const rawNode of rawNodes) {
    const attrs = normalizeAttrs(rawNode[':@']);
    for (const [name, value] of Object.entries(rawNode)) {
      if (name === ':@') continue;
      if (name === '#text') {
        children.push({ name: '#text', text: String(value) });
        continue;
      }
      children.push({
        name,
        attrs,
        children: Array.isArray(value) ? convertChildren(value as RawOrderedNode[]) : [],
      });
    }
  }
  return children;
}

function normalizeAttrs(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, attrValue]) => [key, String(attrValue)]),
  );
}

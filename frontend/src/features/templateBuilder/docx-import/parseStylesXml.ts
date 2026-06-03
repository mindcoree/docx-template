import type { DocxStyle } from './docxTypes';
import { parseParagraphProperties, parseRunProperties } from './parseDocumentXml';
import { asArray, asNode, attr, parseXml, type XmlNode } from './xmlUtils';

export function parseStylesXml(xml: string | undefined): Record<string, DocxStyle> {
  if (!xml) return {};
  const parsed = parseXml(xml);
  const stylesRoot = asNode(parsed['w:styles']);
  const styles: Record<string, DocxStyle> = {};

  for (const styleNode of asArray(stylesRoot?.['w:style']).filter(isRecord)) {
    const id = attr(styleNode, 'styleId');
    if (!id) continue;
    styles[id] = {
      id,
      type: attr(styleNode, 'type') ?? 'paragraph',
      name: attr(asNode(styleNode['w:name']), 'val'),
      paragraphProperties: parseParagraphProperties(asNode(styleNode['w:pPr'])),
      runProperties: parseRunProperties(asNode(styleNode['w:rPr'])),
    };
  }

  return styles;
}

function isRecord(value: unknown): value is XmlNode {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

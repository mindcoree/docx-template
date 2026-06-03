import type { DocxNumberingDefinition } from './docxTypes';
import { parseParagraphProperties, parseRunProperties } from './parseDocumentXml';
import { asArray, asNode, attr, numberAttr, parseXml, type XmlNode } from './xmlUtils';

export function parseNumberingXml(xml: string | undefined): Record<string, DocxNumberingDefinition> {
  if (!xml) return {};
  const parsed = parseXml(xml);
  const numberingRoot = asNode(parsed['w:numbering']);
  const abstractNumbers = new Map<string, DocxNumberingDefinition['levels']>();

  for (const abstractNode of asArray(numberingRoot?.['w:abstractNum']).filter(isRecord)) {
    const id = attr(abstractNode, 'abstractNumId');
    if (!id) continue;
    const levels: DocxNumberingDefinition['levels'] = {};
    for (const levelNode of asArray(abstractNode['w:lvl']).filter(isRecord)) {
      const level = numberAttr(levelNode, 'ilvl') ?? 0;
      levels[String(level)] = {
        level,
        start: numberAttr(asNode(levelNode['w:start']), 'val'),
        format: attr(asNode(levelNode['w:numFmt']), 'val'),
        text: attr(asNode(levelNode['w:lvlText']), 'val'),
        paragraphProperties: parseParagraphProperties(asNode(levelNode['w:pPr'])),
        runProperties: parseRunProperties(asNode(levelNode['w:rPr'])),
      };
    }
    abstractNumbers.set(id, levels);
  }

  const numbering: Record<string, DocxNumberingDefinition> = {};
  for (const numNode of asArray(numberingRoot?.['w:num']).filter(isRecord)) {
    const id = attr(numNode, 'numId');
    if (!id) continue;
    const abstractNumId = attr(asNode(numNode['w:abstractNumId']), 'val');
    numbering[id] = {
      id,
      abstractNumId,
      levels: abstractNumId ? (abstractNumbers.get(abstractNumId) ?? {}) : {},
    };
  }

  return numbering;
}

function isRecord(value: unknown): value is XmlNode {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

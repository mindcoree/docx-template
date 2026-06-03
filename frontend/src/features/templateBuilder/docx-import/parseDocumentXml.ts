import { ooxmlColorToCss } from './docxUnits';
import type {
  DocxBlock,
  DocxBorder,
  DocxBorderMap,
  DocxDocumentParseResult,
  DocxParagraphBlock,
  DocxParagraphProperties,
  DocxRun,
  DocxRunProperties,
  DocxSectionProperties,
  DocxTableBlock,
  DocxTableCell,
  DocxTableCellProperties,
  DocxTableProperties,
} from './docxTypes';
import {
  findFirstOrderedNode,
  findOrderedNodes,
  firstOrderedChild,
  isOrderedElement,
  orderedAttr,
  orderedChildren,
  orderedHasChild,
  orderedNumberAttr,
  orderedText,
  parseOrderedXml,
  type OrderedXmlElement,
} from './orderedXml';
import { asNode, attr, hasChild, numberAttr, type XmlNode } from './xmlUtils';

const DEFAULT_SECTION: DocxSectionProperties = {
  pageSize: { widthTwips: 11906, heightTwips: 16838 },
  margins: { topTwips: 1440, rightTwips: 1440, bottomTwips: 1440, leftTwips: 1440 },
};

export function parseDocumentXml(xml: string): DocxDocumentParseResult {
  const document = parseOrderedXml(xml);
  const body = firstOrderedChild(document, 'w:body');
  const diagnostics: DocxDocumentParseResult['diagnostics'] = [];

  if (!body) {
    return {
      blocks: [],
      defaultSection: DEFAULT_SECTION,
      diagnostics: [{ level: 'error', code: 'missing-body', message: 'В DOCX не найден w:body', path: 'word/document.xml' }],
    };
  }

  const defaultSection = parseOrderedSectionProperties(firstOrderedChild(body, 'w:sectPr')) ?? DEFAULT_SECTION;
  const blocks: DocxBlock[] = [];

  for (const child of body.children) {
    if (!isOrderedElement(child)) continue;
    if (child.name === 'w:p') {
      const paragraph = parseOrderedParagraph(child);
      if (isExplicitPageBreakParagraph(paragraph)) {
        blocks.push({ type: 'pageBreak' });
      } else {
        blocks.push(paragraph);
      }
      continue;
    }
    if (child.name === 'w:tbl') {
      blocks.push(parseOrderedTable(child));
      continue;
    }
    if (child.name === 'w:sectPr') continue;
    diagnostics.push({
      level: 'warning',
      code: 'unsupported-body-element',
      message: `Элемент ${child.name} пока не поддерживается DOCX importer`,
      path: `word/document.xml/${child.name}`,
    });
  }

  return { blocks, defaultSection, diagnostics };
}

export function parseParagraphProperties(node: XmlNode | undefined): DocxParagraphProperties {
  if (!node) return {};
  const spacing = asNode(node['w:spacing']);
  const indent = asNode(node['w:ind']);
  return {
    alignment: normalizeAlignment(attr(asNode(node['w:jc']), 'val')),
    spacing: spacing
      ? {
          beforeTwips: numberAttr(spacing, 'before'),
          afterTwips: numberAttr(spacing, 'after'),
          lineTwips: numberAttr(spacing, 'line'),
        }
      : undefined,
    indent: indent
      ? {
          leftTwips: numberAttr(indent, 'left'),
          rightTwips: numberAttr(indent, 'right'),
          firstLineTwips: numberAttr(indent, 'firstLine'),
          hangingTwips: numberAttr(indent, 'hanging'),
        }
      : undefined,
    pageBreakBefore: hasChild(node, 'w:pageBreakBefore') || undefined,
    keepNext: hasChild(node, 'w:keepNext') || undefined,
    keepLines: hasChild(node, 'w:keepLines') || undefined,
  };
}

export function parseRunProperties(node: XmlNode | undefined): DocxRunProperties {
  if (!node) return {};
  const fonts = asNode(node['w:rFonts']);
  return {
    styleId: attr(asNode(node['w:rStyle']), 'val'),
    bold: propertyIsEnabled(node['w:b']),
    italic: propertyIsEnabled(node['w:i']),
    underline: underlineIsEnabled(node['w:u']),
    color: ooxmlColorToCss(attr(asNode(node['w:color']), 'val')),
    highlight: ooxmlColorToCss(attr(asNode(node['w:highlight']), 'val')) ?? attr(asNode(node['w:highlight']), 'val'),
    fontSizeHalfPoints: numberAttr(asNode(node['w:sz']), 'val'),
    fontFamily: attr(fonts, 'ascii') ?? attr(fonts, 'hAnsi') ?? attr(fonts, 'cs'),
    verticalAlign: normalizeVerticalAlign(attr(asNode(node['w:vertAlign']), 'val')),
  };
}

function parseOrderedParagraph(node: OrderedXmlElement): DocxParagraphBlock {
  const pPr = firstOrderedChild(node, 'w:pPr');
  return {
    type: 'paragraph',
    styleId: orderedAttr(firstOrderedChild(pPr, 'w:pStyle'), 'val'),
    properties: parseOrderedParagraphProperties(pPr),
    runs: orderedChildren(node, 'w:r').flatMap(parseOrderedRun),
  };
}

function parseOrderedParagraphProperties(node: OrderedXmlElement | undefined): DocxParagraphProperties {
  if (!node) return {};
  const spacing = firstOrderedChild(node, 'w:spacing');
  const indent = firstOrderedChild(node, 'w:ind');
  return {
    alignment: normalizeAlignment(orderedAttr(firstOrderedChild(node, 'w:jc'), 'val')),
    spacing: spacing
      ? {
          beforeTwips: orderedNumberAttr(spacing, 'before'),
          afterTwips: orderedNumberAttr(spacing, 'after'),
          lineTwips: orderedNumberAttr(spacing, 'line'),
        }
      : undefined,
    indent: indent
      ? {
          leftTwips: orderedNumberAttr(indent, 'left'),
          rightTwips: orderedNumberAttr(indent, 'right'),
          firstLineTwips: orderedNumberAttr(indent, 'firstLine'),
          hangingTwips: orderedNumberAttr(indent, 'hanging'),
        }
      : undefined,
    pageBreakBefore: orderedHasChild(node, 'w:pageBreakBefore') || undefined,
    keepNext: orderedHasChild(node, 'w:keepNext') || undefined,
    keepLines: orderedHasChild(node, 'w:keepLines') || undefined,
  };
}

function parseOrderedRunProperties(node: OrderedXmlElement | undefined): DocxRunProperties {
  if (!node) return {};
  const fonts = firstOrderedChild(node, 'w:rFonts');
  return {
    styleId: orderedAttr(firstOrderedChild(node, 'w:rStyle'), 'val'),
    bold: orderedPropertyIsEnabled(firstOrderedChild(node, 'w:b')),
    italic: orderedPropertyIsEnabled(firstOrderedChild(node, 'w:i')),
    underline: orderedUnderlineIsEnabled(firstOrderedChild(node, 'w:u')),
    color: ooxmlColorToCss(orderedAttr(firstOrderedChild(node, 'w:color'), 'val')),
    highlight:
      ooxmlColorToCss(orderedAttr(firstOrderedChild(node, 'w:highlight'), 'val')) ??
      orderedAttr(firstOrderedChild(node, 'w:highlight'), 'val'),
    fontSizeHalfPoints: orderedNumberAttr(firstOrderedChild(node, 'w:sz'), 'val'),
    fontFamily: orderedAttr(fonts, 'ascii') ?? orderedAttr(fonts, 'hAnsi') ?? orderedAttr(fonts, 'cs'),
    verticalAlign: normalizeVerticalAlign(orderedAttr(firstOrderedChild(node, 'w:vertAlign'), 'val')),
  };
}

function parseOrderedSectionProperties(node: OrderedXmlElement | undefined): DocxSectionProperties | undefined {
  if (!node) return undefined;
  const pageSize = firstOrderedChild(node, 'w:pgSz');
  const margins = firstOrderedChild(node, 'w:pgMar');
  return {
    pageSize: {
      widthTwips: orderedNumberAttr(pageSize, 'w') ?? DEFAULT_SECTION.pageSize.widthTwips,
      heightTwips: orderedNumberAttr(pageSize, 'h') ?? DEFAULT_SECTION.pageSize.heightTwips,
    },
    margins: {
      topTwips: orderedNumberAttr(margins, 'top') ?? DEFAULT_SECTION.margins.topTwips,
      rightTwips: orderedNumberAttr(margins, 'right') ?? DEFAULT_SECTION.margins.rightTwips,
      bottomTwips: orderedNumberAttr(margins, 'bottom') ?? DEFAULT_SECTION.margins.bottomTwips,
      leftTwips: orderedNumberAttr(margins, 'left') ?? DEFAULT_SECTION.margins.leftTwips,
    },
    columns: orderedNumberAttr(firstOrderedChild(node, 'w:cols'), 'num'),
  };
}

function parseOrderedRun(node: OrderedXmlElement): DocxRun[] {
  const properties = parseOrderedRunProperties(firstOrderedChild(node, 'w:rPr'));
  const runs: DocxRun[] = [];

  for (const child of node.children) {
    if (!isOrderedElement(child) || child.name === 'w:rPr') continue;
    if (child.name === 'w:t') {
      runs.push({ type: 'text', text: orderedText(child), properties });
      continue;
    }
    if (child.name === 'w:tab') {
      runs.push({ type: 'tab', properties });
      continue;
    }
    if (child.name === 'w:br' || child.name === 'w:lastRenderedPageBreak') {
      runs.push({ type: 'lineBreak', properties });
      continue;
    }
    if (child.name === 'w:drawing' || child.name === 'w:pict') {
      const embedded = findOrderedNodes(child, (candidate) => candidate.name.endsWith(':blip') && orderedAttr(candidate, 'embed') !== undefined);
      for (const blip of embedded) {
        const imageRef = orderedAttr(blip, 'embed');
        const extent = findFirstOrderedNode(child, (candidate) => candidate.name.endsWith(':extent'));
        if (imageRef) {
          runs.push({
            type: 'image',
            imageRef,
            widthEmu: orderedNumberAttr(extent, 'cx'),
            heightEmu: orderedNumberAttr(extent, 'cy'),
            properties,
          });
        }
      }
    }
  }

  return runs;
}

function parseOrderedTable(node: OrderedXmlElement): DocxTableBlock {
  return {
    type: 'table',
    properties: parseOrderedTableProperties(node),
    rows: orderedChildren(node, 'w:tr').map((rowNode) => ({
      cells: orderedChildren(rowNode, 'w:tc').map(parseOrderedTableCell),
    })),
  };
}

function parseOrderedTableProperties(node: OrderedXmlElement): DocxTableProperties {
  const tableProperties = firstOrderedChild(node, 'w:tblPr');
  return {
    widthTwips: orderedNumberAttr(firstOrderedChild(tableProperties, 'w:tblW'), 'w'),
    gridColumnsTwips: orderedChildren(firstOrderedChild(node, 'w:tblGrid'), 'w:gridCol')
      .map((column) => orderedNumberAttr(column, 'w'))
      .filter((width): width is number => width !== undefined),
    borders: parseOrderedBorders(firstOrderedChild(tableProperties, 'w:tblBorders')),
    shading: ooxmlColorToCss(orderedAttr(firstOrderedChild(tableProperties, 'w:shd'), 'fill')),
  };
}

function parseOrderedTableCell(node: OrderedXmlElement): DocxTableCell {
  const blocks: DocxBlock[] = [];
  for (const child of node.children) {
    if (!isOrderedElement(child)) continue;
    if (child.name === 'w:p') blocks.push(parseOrderedParagraph(child));
    if (child.name === 'w:tbl') blocks.push(parseOrderedTable(child));
  }
  return {
    properties: parseOrderedTableCellProperties(firstOrderedChild(node, 'w:tcPr')),
    blocks,
  };
}

function parseOrderedTableCellProperties(node: OrderedXmlElement | undefined): DocxTableCellProperties {
  const verticalMerge = firstOrderedChild(node, 'w:vMerge');
  return {
    widthTwips: orderedNumberAttr(firstOrderedChild(node, 'w:tcW'), 'w'),
    gridSpan: orderedNumberAttr(firstOrderedChild(node, 'w:gridSpan'), 'val'),
    verticalMerge: verticalMerge ? (orderedAttr(verticalMerge, 'val') === 'restart' ? 'restart' : 'continue') : undefined,
    borders: parseOrderedBorders(firstOrderedChild(node, 'w:tcBorders')),
    shading: ooxmlColorToCss(orderedAttr(firstOrderedChild(node, 'w:shd'), 'fill')),
  };
}

function parseOrderedBorders(node: OrderedXmlElement | undefined): DocxBorderMap | undefined {
  if (!node) return undefined;
  const borders: DocxBorderMap = {};
  for (const side of ['top', 'right', 'bottom', 'left', 'insideH', 'insideV'] as const) {
    const border = parseOrderedBorder(firstOrderedChild(node, `w:${side}`));
    if (border) borders[side] = border;
  }
  return Object.keys(borders).length > 0 ? borders : undefined;
}

function parseOrderedBorder(node: OrderedXmlElement | undefined): DocxBorder | undefined {
  if (!node) return undefined;
  const style = orderedAttr(node, 'val');
  if (!style || style === 'nil' || style === 'none') return undefined;
  return {
    style,
    size: orderedNumberAttr(node, 'sz'),
    color: ooxmlColorToCss(orderedAttr(node, 'color')),
  };
}

function isExplicitPageBreakParagraph(paragraph: DocxParagraphBlock): boolean {
  return paragraph.runs.length === 1 && paragraph.runs[0].type === 'lineBreak';
}

function normalizeAlignment(value: string | undefined): DocxParagraphProperties['alignment'] {
  if (value === 'center' || value === 'right' || value === 'both') return value;
  if (value === 'left') return 'left';
  return undefined;
}

function normalizeVerticalAlign(value: string | undefined): DocxRunProperties['verticalAlign'] {
  if (value === 'superscript' || value === 'subscript' || value === 'baseline') return value;
  return undefined;
}

function propertyIsEnabled(value: unknown): boolean | undefined {
  if (value === undefined) return undefined;
  const node = asNode(value);
  if (!node) return true;
  const attrValue = attr(node, 'val');
  return attrValue === undefined || attrValue === '1' || attrValue === 'true';
}

function underlineIsEnabled(value: unknown): boolean | undefined {
  if (value === undefined) return undefined;
  const node = asNode(value);
  if (!node) return true;
  const attrValue = attr(node, 'val');
  return attrValue !== 'none' && attrValue !== '0' && attrValue !== 'false';
}

function orderedPropertyIsEnabled(node: OrderedXmlElement | undefined): boolean | undefined {
  if (!node) return undefined;
  const value = orderedAttr(node, 'val');
  return value === undefined || value === '1' || value === 'true';
}

function orderedUnderlineIsEnabled(node: OrderedXmlElement | undefined): boolean | undefined {
  if (!node) return undefined;
  const value = orderedAttr(node, 'val');
  return value !== 'none' && value !== '0' && value !== 'false';
}

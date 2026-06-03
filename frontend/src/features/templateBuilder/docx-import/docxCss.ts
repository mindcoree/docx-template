import type { CSSProperties } from 'react';
import type {
  DocxBorderMap,
  DocxParagraphProperties,
  DocxRunProperties,
  DocxSectionProperties,
  DocxTableCellProperties,
  DocxTableProperties,
} from './docxTypes';
import { emuToPx, halfPointsToPx, twipsToPx } from './docxUnits';

export function sectionToPageStyle(section: DocxSectionProperties): CSSProperties {
  return {
    width: `${twipsToPx(section.pageSize.widthTwips)}px`,
    minHeight: `${twipsToPx(section.pageSize.heightTwips)}px`,
  };
}

export function sectionToContentStyle(section: DocxSectionProperties): CSSProperties {
  return {
    paddingTop: `${twipsToPx(section.margins.topTwips)}px`,
    paddingRight: `${twipsToPx(section.margins.rightTwips)}px`,
    paddingBottom: `${twipsToPx(section.margins.bottomTwips)}px`,
    paddingLeft: `${twipsToPx(section.margins.leftTwips)}px`,
  };
}

export function paragraphToStyle(properties: DocxParagraphProperties): CSSProperties {
  return {
    textAlign: properties.alignment === 'both' ? 'justify' : properties.alignment,
    marginTop: `${twipsToPx(properties.spacing?.beforeTwips)}px`,
    marginBottom: `${twipsToPx(properties.spacing?.afterTwips ?? 160)}px`,
    marginLeft: properties.indent?.leftTwips ? `${twipsToPx(properties.indent.leftTwips)}px` : undefined,
    marginRight: properties.indent?.rightTwips ? `${twipsToPx(properties.indent.rightTwips)}px` : undefined,
    textIndent: textIndent(properties),
    lineHeight: properties.spacing?.lineTwips ? `${twipsToPx(properties.spacing.lineTwips)}px` : undefined,
  };
}

export function runToStyle(properties: DocxRunProperties): CSSProperties {
  return {
    fontWeight: properties.bold ? 700 : undefined,
    fontStyle: properties.italic ? 'italic' : undefined,
    textDecoration: properties.underline ? 'underline' : undefined,
    color: properties.color,
    backgroundColor: properties.highlight,
    fontSize: properties.fontSizeHalfPoints ? `${halfPointsToPx(properties.fontSizeHalfPoints)}px` : undefined,
    fontFamily: properties.fontFamily,
    verticalAlign:
      properties.verticalAlign === 'superscript' ? 'super' : properties.verticalAlign === 'subscript' ? 'sub' : undefined,
  };
}

export function tableToStyle(properties: DocxTableProperties): CSSProperties {
  return {
    width: properties.widthTwips ? `${twipsToPx(properties.widthTwips)}px` : '100%',
    backgroundColor: properties.shading,
    ...borderMapToStyle(properties.borders),
  };
}

export function cellToStyle(properties: DocxTableCellProperties): CSSProperties {
  return {
    width: properties.widthTwips ? `${twipsToPx(properties.widthTwips)}px` : undefined,
    backgroundColor: properties.shading,
    ...borderMapToStyle(properties.borders),
  };
}

export function imageToStyle(widthEmu: number | undefined, heightEmu: number | undefined): CSSProperties {
  return {
    width: widthEmu ? `${emuToPx(widthEmu)}px` : undefined,
    height: heightEmu ? `${emuToPx(heightEmu)}px` : undefined,
  };
}

function textIndent(properties: DocxParagraphProperties): string | undefined {
  if (properties.indent?.firstLineTwips) return `${twipsToPx(properties.indent.firstLineTwips)}px`;
  if (properties.indent?.hangingTwips) return `-${twipsToPx(properties.indent.hangingTwips)}px`;
  return undefined;
}

function borderMapToStyle(borders: DocxBorderMap | undefined): CSSProperties {
  if (!borders) return {};
  const style: CSSProperties = {};
  if (borders.top) style.borderTop = borderToCss(borders.top);
  if (borders.right) style.borderRight = borderToCss(borders.right);
  if (borders.bottom) style.borderBottom = borderToCss(borders.bottom);
  if (borders.left) style.borderLeft = borderToCss(borders.left);
  return style;
}

function borderToCss(border: NonNullable<DocxBorderMap[keyof DocxBorderMap]>): string {
  const width = Math.max(1, (border.size ?? 4) / 8);
  return `${width}px solid ${border.color ?? '#1f2933'}`;
}

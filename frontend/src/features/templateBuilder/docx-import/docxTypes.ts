export type DocxDiagnosticLevel = 'warning' | 'error';

export interface DocxImportDiagnostic {
  level: DocxDiagnosticLevel;
  code: string;
  message: string;
  path?: string;
}

export interface DocxDocumentModel {
  metadata: {
    fileName: string;
  };
  packageInfo: {
    hasStyles: boolean;
    hasNumbering: boolean;
    hasHeaders: boolean;
    hasFooters: boolean;
    mediaCount: number;
  };
  defaultSection: DocxSectionProperties;
  blocks: DocxBlock[];
  styles: Record<string, DocxStyle>;
  numbering: Record<string, DocxNumberingDefinition>;
  relationships: Record<string, DocxRelationship>;
  media: Record<string, DocxMediaAsset>;
  diagnostics: DocxImportDiagnostic[];
}

export type DocxBlock = DocxParagraphBlock | DocxTableBlock | DocxPageBreakBlock | DocxSectionBreakBlock;

export interface DocxParagraphBlock {
  type: 'paragraph';
  styleId?: string;
  properties: DocxParagraphProperties;
  runs: DocxRun[];
}

export type DocxRun = DocxTextRun | DocxTabRun | DocxLineBreakRun | DocxImageRun;

export interface DocxTextRun {
  type: 'text';
  text: string;
  properties: DocxRunProperties;
}

export interface DocxTabRun {
  type: 'tab';
  properties: DocxRunProperties;
}

export interface DocxLineBreakRun {
  type: 'lineBreak';
  properties: DocxRunProperties;
}

export interface DocxImageRun {
  type: 'image';
  imageRef: string;
  widthEmu?: number;
  heightEmu?: number;
  properties: DocxRunProperties;
}

export interface DocxTableBlock {
  type: 'table';
  properties: DocxTableProperties;
  rows: DocxTableRow[];
}

export interface DocxTableRow {
  cells: DocxTableCell[];
}

export interface DocxTableCell {
  properties: DocxTableCellProperties;
  blocks: DocxBlock[];
}

export interface DocxPageBreakBlock {
  type: 'pageBreak';
}

export interface DocxSectionBreakBlock {
  type: 'sectionBreak';
  section: DocxSectionProperties;
}

export interface DocxSectionProperties {
  pageSize: {
    widthTwips: number;
    heightTwips: number;
  };
  margins: {
    topTwips: number;
    rightTwips: number;
    bottomTwips: number;
    leftTwips: number;
  };
  columns?: number;
}

export interface DocxParagraphProperties {
  alignment?: 'left' | 'center' | 'right' | 'both';
  spacing?: {
    beforeTwips?: number;
    afterTwips?: number;
    lineTwips?: number;
  };
  indent?: {
    leftTwips?: number;
    rightTwips?: number;
    firstLineTwips?: number;
    hangingTwips?: number;
  };
  pageBreakBefore?: boolean;
  keepNext?: boolean;
  keepLines?: boolean;
}

export interface DocxRunProperties {
  styleId?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  color?: string;
  highlight?: string;
  fontSizeHalfPoints?: number;
  fontFamily?: string;
  verticalAlign?: 'superscript' | 'subscript' | 'baseline';
}

export interface DocxTableProperties {
  widthTwips?: number;
  gridColumnsTwips: number[];
  borders?: DocxBorderMap;
  shading?: string;
}

export interface DocxTableCellProperties {
  widthTwips?: number;
  gridSpan?: number;
  verticalMerge?: 'restart' | 'continue';
  borders?: DocxBorderMap;
  shading?: string;
}

export type DocxBorderSide = 'top' | 'right' | 'bottom' | 'left' | 'insideH' | 'insideV';

export type DocxBorderMap = Partial<Record<DocxBorderSide, DocxBorder>>;

export interface DocxBorder {
  style?: string;
  size?: number;
  color?: string;
}

export interface DocxStyle {
  id: string;
  type: 'paragraph' | 'character' | 'table' | 'numbering' | string;
  name?: string;
  paragraphProperties?: DocxParagraphProperties;
  runProperties?: DocxRunProperties;
}

export interface DocxNumberingDefinition {
  id: string;
  abstractNumId?: string;
  levels: Record<string, DocxNumberingLevel>;
}

export interface DocxNumberingLevel {
  level: number;
  start?: number;
  format?: string;
  text?: string;
  paragraphProperties?: DocxParagraphProperties;
  runProperties?: DocxRunProperties;
}

export interface DocxRelationship {
  id: string;
  type: string;
  target: string;
  targetPath?: string;
  isExternal: boolean;
}

export interface DocxMediaAsset {
  relationshipId: string;
  path: string;
  contentType: string;
  dataUrl: string;
}

export interface DocxDocumentParseResult {
  blocks: DocxBlock[];
  defaultSection: DocxSectionProperties;
  diagnostics: DocxImportDiagnostic[];
}

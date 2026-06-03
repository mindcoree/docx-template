import { unzipSync } from 'fflate';
import type { DocxDocumentModel } from './docxTypes';
import { DOCX_ERROR_MESSAGES, DocxImportError } from './errors';
import { parseDocumentXml } from './parseDocumentXml';
import { parseMedia } from './parseMedia';
import { parseNumberingXml } from './parseNumberingXml';
import { parseRelationships } from './parseRelationships';
import { parseStylesXml } from './parseStylesXml';

const decoder = new TextDecoder('utf-8');

export async function parseDocxPackage(file: File): Promise<DocxDocumentModel> {
  if (!file.name.toLowerCase().endsWith('.docx')) {
    throw new DocxImportError('invalid-format', DOCX_ERROR_MESSAGES.invalidFormat);
  }
  if (file.size === 0) {
    throw new DocxImportError('empty-file', DOCX_ERROR_MESSAGES.readFailed);
  }

  let entries: Record<string, Uint8Array>;
  try {
    entries = unzipSync(new Uint8Array(await file.arrayBuffer()));
  } catch {
    throw new DocxImportError('read-failed', DOCX_ERROR_MESSAGES.readFailed);
  }

  const documentXml = readText(entries, 'word/document.xml');
  if (!documentXml) {
    throw new DocxImportError('missing-document-xml', DOCX_ERROR_MESSAGES.missingDocumentXml);
  }

  const relationships = parseRelationships(readText(entries, 'word/_rels/document.xml.rels'));
  const styles = parseStylesXml(readText(entries, 'word/styles.xml'));
  const numbering = parseNumberingXml(readText(entries, 'word/numbering.xml'));
  const media = parseMedia(relationships, entries);
  const parsedDocument = parseDocumentXml(documentXml);
  const packagePaths = Object.keys(entries);
  const hasHeaders = packagePaths.some((path) => /^word\/header\d*\.xml$/.test(path));
  const hasFooters = packagePaths.some((path) => /^word\/footer\d*\.xml$/.test(path));
  const diagnostics = [...parsedDocument.diagnostics];

  if (hasHeaders) {
    diagnostics.push({
      level: 'warning',
      code: 'headers-not-rendered',
      message: 'Колонтитулы DOCX пока не отображаются в MVP importer',
      path: 'word/header*.xml',
    });
  }
  if (hasFooters) {
    diagnostics.push({
      level: 'warning',
      code: 'footers-not-rendered',
      message: 'Нижние колонтитулы DOCX пока не отображаются в MVP importer',
      path: 'word/footer*.xml',
    });
  }

  return {
    metadata: { fileName: file.name },
    packageInfo: {
      hasStyles: Boolean(entries['word/styles.xml']),
      hasNumbering: Boolean(entries['word/numbering.xml']),
      hasHeaders,
      hasFooters,
      mediaCount: Object.keys(media).length,
    },
    defaultSection: parsedDocument.defaultSection,
    blocks: parsedDocument.blocks,
    styles,
    numbering,
    relationships,
    media,
    diagnostics,
  };
}

function readText(entries: Record<string, Uint8Array>, path: string): string | undefined {
  const bytes = entries[path];
  return bytes ? decoder.decode(bytes) : undefined;
}

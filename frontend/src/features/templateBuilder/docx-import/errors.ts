export const DOCX_ERROR_MESSAGES = {
  prompt: 'Загрузите DOCX-файл приказа',
  invalidFormat: 'Файл должен быть в формате .docx',
  readFailed: 'Не удалось прочитать DOCX-файл',
  missingDocumentXml: 'В DOCX не найден word/document.xml',
  renderFailed: 'Не удалось отобразить документ',
  partialFormatting: 'Файл отображён, но часть сложного форматирования может отличаться от Microsoft Word',
} as const;

export type DocxImportErrorCode =
  | 'invalid-format'
  | 'empty-file'
  | 'read-failed'
  | 'missing-document-xml'
  | 'render-failed';

export class DocxImportError extends Error {
  readonly code: DocxImportErrorCode;

  constructor(code: DocxImportErrorCode, message: string) {
    super(message);
    this.name = 'DocxImportError';
    this.code = code;
  }
}

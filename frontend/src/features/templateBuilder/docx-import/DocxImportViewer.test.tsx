import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { strToU8, zipSync } from 'fflate';
import { afterEach, describe, expect, it } from 'vitest';
import { DocxImportViewer } from './DocxImportViewer';

const contentTypesXml = `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
</Types>`;

const documentXml = `<?xml version="1.0" encoding="UTF-8"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Приказ из DOCX</w:t></w:r></w:p>
    <w:tbl>
      <w:tr>
        <w:tc><w:p><w:r><w:t>Период отпуска</w:t></w:r></w:p></w:tc>
      </w:tr>
    </w:tbl>
    <w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr>
  </w:body>
</w:document>`;

function createDocxFile() {
  return new File(
    [
      zipSync({
        '[Content_Types].xml': strToU8(contentTypesXml),
        'word/document.xml': strToU8(documentXml),
      }),
    ],
    'order.docx',
    { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
  );
}

describe('DocxImportViewer', () => {
  afterEach(() => {
    cleanup();
  });

  it('rejects non-DOCX files with a Russian validation error', async () => {
    render(<DocxImportViewer />);

    fireEvent.change(screen.getByLabelText('Загрузите DOCX-файл приказа'), {
      target: { files: [new File(['not a docx'], 'scan.pdf', { type: 'application/pdf' })] },
    });

    expect(await screen.findByText('Файл должен быть в формате .docx')).toBeInTheDocument();
  });

  it('renders document content after uploading a valid DOCX', async () => {
    render(<DocxImportViewer />);

    fireEvent.change(screen.getByLabelText('Загрузите DOCX-файл приказа'), {
      target: { files: [createDocxFile()] },
    });

    expect(await screen.findByText('Приказ из DOCX')).toBeInTheDocument();
    expect(await screen.findByText('Период отпуска')).toBeInTheDocument();
    expect(screen.getByText(/часть сложного форматирования может отличаться/)).toBeInTheDocument();
  });
});

import { strToU8, zipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { DocxImportError } from './errors';
import { parseDocxPackage } from './parseDocxPackage';

const contentTypesXml = `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
</Types>`;

const documentXml = `<?xml version="1.0" encoding="UTF-8"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p><w:r><w:t>Приказ о приеме</w:t></w:r></w:p>
    <w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr>
  </w:body>
</w:document>`;

const stylesXml = `<?xml version="1.0" encoding="UTF-8"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:styleId="Title">
    <w:name w:val="Title"/>
    <w:pPr><w:jc w:val="center"/></w:pPr>
    <w:rPr><w:b/><w:sz w:val="32"/></w:rPr>
  </w:style>
</w:styles>`;

const documentRelsXml = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId5" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/signature.png"/>
  <Relationship Id="rIdExternal" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="https://example.com" TargetMode="External"/>
</Relationships>`;

function createDocxFile(entries: Record<string, string | Uint8Array>, fileName = 'Приказ.docx') {
  const zipped = zipSync(
    Object.fromEntries(
      Object.entries(entries).map(([path, content]) => [path, typeof content === 'string' ? strToU8(content) : content]),
    ),
  );
  return new File([zipped], fileName, {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

describe('parseDocxPackage', () => {
  it('reads a DOCX zip into the internal document model', async () => {
    const model = await parseDocxPackage(
      createDocxFile({
        '[Content_Types].xml': contentTypesXml,
        'word/document.xml': documentXml,
        'word/styles.xml': stylesXml,
        'word/_rels/document.xml.rels': documentRelsXml,
        'word/media/signature.png': new Uint8Array([137, 80, 78, 71]),
      }),
    );

    expect(model.metadata.fileName).toBe('Приказ.docx');
    expect(model.packageInfo).toMatchObject({
      hasStyles: true,
      hasNumbering: false,
      hasHeaders: false,
      hasFooters: false,
      mediaCount: 1,
    });
    expect(model.blocks[0]).toMatchObject({ type: 'paragraph', runs: [{ type: 'text', text: 'Приказ о приеме' }] });
    expect(model.styles.Title).toMatchObject({
      id: 'Title',
      type: 'paragraph',
      name: 'Title',
      paragraphProperties: { alignment: 'center' },
      runProperties: { bold: true, fontSizeHalfPoints: 32 },
    });
    expect(model.relationships.rId5).toMatchObject({
      id: 'rId5',
      target: 'media/signature.png',
      targetPath: 'word/media/signature.png',
      isExternal: false,
    });
    expect(model.relationships.rIdExternal).toMatchObject({
      id: 'rIdExternal',
      isExternal: true,
      targetPath: undefined,
    });
    expect(model.media.rId5).toMatchObject({
      relationshipId: 'rId5',
      contentType: 'image/png',
    });
  });

  it('raises a Russian import error when word/document.xml is missing', async () => {
    await expect(parseDocxPackage(createDocxFile({ '[Content_Types].xml': contentTypesXml }))).rejects.toMatchObject({
      code: 'missing-document-xml',
      message: 'В DOCX не найден word/document.xml',
    } satisfies Partial<DocxImportError>);
  });
});

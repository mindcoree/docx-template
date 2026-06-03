import { describe, expect, it } from 'vitest';
import { parseDocumentXml } from './parseDocumentXml';

const documentXml = `<?xml version="1.0" encoding="UTF-8"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:pPr>
        <w:pStyle w:val="Title"/>
        <w:jc w:val="center"/>
        <w:spacing w:before="240" w:after="120" w:line="360"/>
        <w:ind w:left="720" w:firstLine="360"/>
      </w:pPr>
      <w:r>
        <w:rPr>
          <w:b/>
          <w:i/>
          <w:u w:val="single"/>
          <w:color w:val="1f4e79"/>
          <w:sz w:val="28"/>
          <w:rFonts w:ascii="Times New Roman"/>
        </w:rPr>
        <w:t>Приказ</w:t>
        <w:tab/>
        <w:t xml:space="preserve"> №1</w:t>
      </w:r>
    </w:p>
    <w:p>
      <w:r>
        <w:br w:type="page"/>
      </w:r>
    </w:p>
    <w:tbl>
      <w:tblPr>
        <w:tblW w:w="5000" w:type="dxa"/>
        <w:tblBorders>
          <w:top w:val="single" w:sz="4" w:color="000000"/>
          <w:bottom w:val="single" w:sz="4" w:color="000000"/>
        </w:tblBorders>
      </w:tblPr>
      <w:tblGrid>
        <w:gridCol w:w="2400"/>
        <w:gridCol w:w="2600"/>
      </w:tblGrid>
      <w:tr>
        <w:tc>
          <w:tcPr>
            <w:tcW w:w="2400" w:type="dxa"/>
            <w:gridSpan w:val="2"/>
            <w:shd w:fill="EEF4F7"/>
          </w:tcPr>
          <w:p>
            <w:r><w:t>Ячейка</w:t></w:r>
          </w:p>
        </w:tc>
      </w:tr>
    </w:tbl>
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/>
    </w:sectPr>
  </w:body>
</w:document>`;

describe('parseDocumentXml', () => {
  it('normalizes paragraphs, explicit page breaks, tables, and section geometry', () => {
    const result = parseDocumentXml(documentXml);

    expect(result.defaultSection).toMatchObject({
      pageSize: { widthTwips: 11906, heightTwips: 16838 },
      margins: { topTwips: 1440, rightTwips: 1440, bottomTwips: 1440, leftTwips: 1440 },
    });
    expect(result.blocks).toHaveLength(3);
    expect(result.blocks[0]).toMatchObject({
      type: 'paragraph',
      styleId: 'Title',
      properties: {
        alignment: 'center',
        spacing: { beforeTwips: 240, afterTwips: 120, lineTwips: 360 },
        indent: { leftTwips: 720, firstLineTwips: 360 },
      },
      runs: [
        {
          type: 'text',
          text: 'Приказ',
          properties: {
            bold: true,
            italic: true,
            underline: true,
            color: '#1F4E79',
            fontSizeHalfPoints: 28,
            fontFamily: 'Times New Roman',
          },
        },
        { type: 'tab' },
        { type: 'text', text: ' №1' },
      ],
    });
    expect(result.blocks[1]).toEqual({ type: 'pageBreak' });
    expect(result.blocks[2]).toMatchObject({
      type: 'table',
      properties: {
        widthTwips: 5000,
        gridColumnsTwips: [2400, 2600],
      },
      rows: [
        {
          cells: [
            {
              properties: {
                widthTwips: 2400,
                gridSpan: 2,
                shading: '#EEF4F7',
              },
              blocks: [{ type: 'paragraph', runs: [{ type: 'text', text: 'Ячейка' }] }],
            },
          ],
        },
      ],
    });
    expect(result.diagnostics).toEqual([]);
  });
});

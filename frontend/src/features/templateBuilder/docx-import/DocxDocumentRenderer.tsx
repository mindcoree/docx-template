import type { CSSProperties, ReactElement } from 'react';
import { cellToStyle, imageToStyle, paragraphToStyle, runToStyle, sectionToContentStyle, sectionToPageStyle, tableToStyle } from './docxCss';
import type {
  DocxBlock,
  DocxDocumentModel,
  DocxParagraphBlock,
  DocxRun,
  DocxRunProperties,
  DocxStyle,
  DocxTableBlock,
} from './docxTypes';

interface Props {
  model: DocxDocumentModel;
}

export function DocxDocumentRenderer({ model }: Props) {
  const pages = splitIntoExplicitPages(model.blocks);

  return (
    <div className="docx-preview-shell" aria-label="Предпросмотр импортированного DOCX">
      {pages.map((blocks, pageIndex) => (
        <section className="docx-page" style={sectionToPageStyle(model.defaultSection)} key={pageIndex}>
          <div className="docx-page-content" style={sectionToContentStyle(model.defaultSection)}>
            {blocks.map((block, blockIndex) => renderBlock(block, `${pageIndex}-${blockIndex}`, model))}
          </div>
        </section>
      ))}
    </div>
  );
}

function splitIntoExplicitPages(blocks: DocxBlock[]): DocxBlock[][] {
  const pages: DocxBlock[][] = [[]];
  for (const block of blocks) {
    if (block.type === 'pageBreak' || block.type === 'sectionBreak') {
      pages.push([]);
      continue;
    }
    pages[pages.length - 1].push(block);
  }
  return pages.length === 0 ? [[]] : pages;
}

function renderBlock(block: DocxBlock, key: string, model: DocxDocumentModel): ReactElement | null {
  if (block.type === 'paragraph') return renderParagraph(block, key, model);
  if (block.type === 'table') return renderTable(block, key, model);
  return null;
}

function renderParagraph(block: DocxParagraphBlock, key: string, model: DocxDocumentModel): ReactElement {
  const style = mergedParagraphStyle(block, model);
  return (
    <p className="docx-paragraph" style={style} key={key}>
      {block.runs.length === 0 ? '\u00A0' : block.runs.map((run, runIndex) => renderRun(run, `${key}-${runIndex}`, model))}
    </p>
  );
}

function renderTable(block: DocxTableBlock, key: string, model: DocxDocumentModel): ReactElement {
  return (
    <table className="docx-table" style={tableToStyle(block.properties)} key={key}>
      <tbody>
        {block.rows.map((row, rowIndex) => (
          <tr key={rowIndex}>
            {row.cells.map((cell, cellIndex) => (
              <td
                className="docx-table-cell"
                colSpan={cell.properties.gridSpan}
                style={cellToStyle(cell.properties)}
                key={cellIndex}
              >
                {cell.blocks.map((cellBlock, blockIndex) => renderBlock(cellBlock, `${key}-${rowIndex}-${cellIndex}-${blockIndex}`, model))}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function renderRun(run: DocxRun, key: string, model: DocxDocumentModel): ReactElement | string {
  if (run.type === 'tab') return <span className="docx-run docx-tab" key={key} />;
  if (run.type === 'lineBreak') return <br key={key} />;
  if (run.type === 'image') {
    const media = model.media[run.imageRef];
    if (!media) {
      return (
        <span className="docx-run docx-image-placeholder" style={runToStyle(run.properties)} key={key}>
          [изображение]
        </span>
      );
    }
    return (
      <img
        className="docx-run docx-image"
        src={media.dataUrl}
        alt=""
        style={{ ...runToStyle(run.properties), ...imageToStyle(run.widthEmu, run.heightEmu) }}
        key={key}
      />
    );
  }
  return (
    <span className="docx-run" style={runToStyle(mergedRunProperties(run.properties, model))} key={key}>
      {run.text}
    </span>
  );
}

function mergedParagraphStyle(block: DocxParagraphBlock, model: DocxDocumentModel): CSSProperties {
  const style = block.styleId ? model.styles[block.styleId] : undefined;
  return paragraphToStyle({
    ...(style?.paragraphProperties ?? {}),
    ...block.properties,
    spacing: { ...(style?.paragraphProperties?.spacing ?? {}), ...(block.properties.spacing ?? {}) },
    indent: { ...(style?.paragraphProperties?.indent ?? {}), ...(block.properties.indent ?? {}) },
  });
}

function mergedRunProperties(properties: DocxRunProperties, model: DocxDocumentModel): DocxRunProperties {
  const style = properties.styleId ? (model.styles[properties.styleId] as DocxStyle | undefined) : undefined;
  return { ...(style?.runProperties ?? {}), ...properties };
}

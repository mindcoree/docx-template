import { AlertTriangle, FileUp, Loader2 } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import type { DocxDocumentModel } from './docxTypes';
import { DOCX_ERROR_MESSAGES, DocxImportError } from './errors';
import { DocxDocumentRenderer } from './DocxDocumentRenderer';
import { parseDocxPackage } from './parseDocxPackage';

interface Props {
  onStatusChange?: (message: string) => void;
}

export function DocxImportViewer({ onStatusChange }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [model, setModel] = useState<DocxDocumentModel | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);

  const handleFile = useCallback(
    async (file: File | undefined) => {
      if (!file) return;
      setModel(null);
      setFileName(file.name);
      setError(null);

      if (!file.name.toLowerCase().endsWith('.docx')) {
        setError(DOCX_ERROR_MESSAGES.invalidFormat);
        onStatusChange?.(DOCX_ERROR_MESSAGES.invalidFormat);
        return;
      }

      setIsParsing(true);
      onStatusChange?.('Импортируем DOCX...');
      try {
        const nextModel = await parseDocxPackage(file);
        setModel(nextModel);
        if (nextModel.diagnostics.length > 0) {
          console.warn('DOCX import diagnostics', nextModel.diagnostics);
        }
        onStatusChange?.(`DOCX импортирован: ${file.name}`);
      } catch (caught) {
        const message = caught instanceof DocxImportError ? caught.message : DOCX_ERROR_MESSAGES.renderFailed;
        setError(message);
        onStatusChange?.(message);
      } finally {
        setIsParsing(false);
        if (inputRef.current) inputRef.current.value = '';
      }
    },
    [onStatusChange],
  );

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLLabelElement>) => {
      event.preventDefault();
      void handleFile(event.dataTransfer.files[0]);
    },
    [handleFile],
  );

  const warningCount = model?.diagnostics.filter((item) => item.level === 'warning').length ?? 0;

  return (
    <section className="docx-import-viewer">
      <div className="docx-import-header">
        <div>
          <h2>DOCX import</h2>
          <p>OOXML import · internal model · React renderer</p>
        </div>
        {fileName ? <span className="docx-file-name">{fileName}</span> : null}
      </div>

      <label className="docx-upload-zone" onDragOver={(event) => event.preventDefault()} onDrop={handleDrop}>
        <input
          ref={inputRef}
          aria-label={DOCX_ERROR_MESSAGES.prompt}
          type="file"
          accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={(event) => void handleFile(event.currentTarget.files?.[0])}
        />
        <FileUp size={22} />
        <span>{DOCX_ERROR_MESSAGES.prompt}</span>
        <small>Перетащите файл сюда или выберите его вручную</small>
      </label>

      {isParsing ? (
        <div className="docx-import-state">
          <Loader2 size={16} className="spin-icon" />
          Читаем OOXML-пакет...
        </div>
      ) : null}

      {error ? (
        <div className="docx-import-error" role="alert">
          <AlertTriangle size={16} />
          {error}
        </div>
      ) : null}

      {model ? (
        <>
          <div className="docx-import-warning">
            <AlertTriangle size={15} />
            {DOCX_ERROR_MESSAGES.partialFormatting}
            {warningCount > 0 ? ` · предупреждений: ${warningCount}` : null}
          </div>
          <DocxDocumentRenderer model={model} />
        </>
      ) : null}
    </section>
  );
}

import { ExternalLink } from 'lucide-react';

interface Props {
  pdfUrl: string | null;
  error: string | null;
}

export function TemplatePreviewPanel({ pdfUrl, error }: Props) {
  return (
    <section className="preview-panel">
      <h2>Preview PDF</h2>
      {error ? <p className="preview-error">{error}</p> : null}
      {pdfUrl ? (
        <a href={pdfUrl} target="_blank" rel="noreferrer">
          <ExternalLink size={15} />
          Открыть PDF
        </a>
      ) : (
        <p>PDF появится после успешного рендера через Gotenberg.</p>
      )}
    </section>
  );
}


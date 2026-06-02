import { Bold, Download, Eye, FileCheck2, Italic, Save, Send, Underline } from 'lucide-react';

interface Props {
  canPublish: boolean;
  isBusy: boolean;
  onSave: () => void;
  onValidate: () => void;
  onPreview: () => void;
  onExportDocx: () => void;
  onPublish: () => void;
  onBold: () => void;
  onItalic: () => void;
  onUnderline: () => void;
}

export function TemplateBuilderToolbar({
  canPublish,
  isBusy,
  onSave,
  onValidate,
  onPreview,
  onExportDocx,
  onPublish,
  onBold,
  onItalic,
  onUnderline,
}: Props) {
  return (
    <header className="builder-toolbar" aria-label="Панель действий шаблона">
      <div className="toolbar-format" aria-label="Форматирование">
        <button type="button" className="icon-button" onClick={onBold} title="Жирный">
          <Bold size={16} />
        </button>
        <button type="button" className="icon-button" onClick={onItalic} title="Курсив">
          <Italic size={16} />
        </button>
        <button type="button" className="icon-button" onClick={onUnderline} title="Подчеркнутый">
          <Underline size={16} />
        </button>
      </div>

      <div className="toolbar-actions">
        <button type="button" className="toolbar-button" onClick={onSave} disabled={isBusy}>
          <Save size={16} />
          Сохранить
        </button>
        <button type="button" className="toolbar-button" onClick={onValidate} disabled={isBusy}>
          <FileCheck2 size={16} />
          Проверить
        </button>
        <button type="button" className="toolbar-button" onClick={onPreview} disabled={isBusy}>
          <Eye size={16} />
          Preview PDF
        </button>
        <button type="button" className="toolbar-button" onClick={onExportDocx} disabled={isBusy}>
          <Download size={16} />
          Export DOCX
        </button>
        <button type="button" className="toolbar-button primary" onClick={onPublish} disabled={isBusy || !canPublish}>
          <Send size={16} />
          Publish
        </button>
      </div>
    </header>
  );
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FileText, Layers3 } from 'lucide-react';
import { templateBuilderApi } from '../api/templateBuilderApi';
import { editorJsonToJinjaHtml } from '../editor/serialization/editorJsonToJinjaHtml';
import { extractFieldManifest } from '../editor/serialization/extractFieldManifest';
import type {
  EditorJson,
  SelectedFieldInstance,
  TemplateField,
  TemplateFieldGroup,
  TemplateFieldInstance,
  TemplateRecord,
  TemplateValidationResponse,
} from '../types/templateBuilder.types';
import { TemplateBuilderToolbar } from './TemplateBuilderToolbar';
import { TemplateEditorCanvas, type TemplateEditorHandle } from './TemplateEditorCanvas';
import { TemplateFieldInspector } from './TemplateFieldInspector';
import { TemplateFieldsSidebar } from './TemplateFieldsSidebar';
import { TemplatePreviewPanel } from './TemplatePreviewPanel';
import { TemplateValidationPanel } from './TemplateValidationPanel';

const DOCUMENT_TYPE = 'order_vacation';

const initialEditorJson: EditorJson = {
  type: 'doc',
  content: [
    {
      type: 'heading',
      attrs: { level: 1 },
      content: [{ type: 'text', text: 'Приказ о предоставлении отпуска' }],
    },
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Предоставить ежегодный трудовой отпуск сотруднику ' },
        {
          type: 'templateField',
          attrs: {
            id: 'seed-employee',
            fieldKey: 'employee.full_name',
            label: 'ФИО сотрудника',
            jinja: '{{ employee.full_name }}',
            groupId: null,
            required: true,
            fieldType: 'string',
          },
        },
        { type: 'text', text: ' с ' },
        {
          type: 'templateField',
          attrs: {
            id: 'seed-vacation-start',
            fieldKey: 'vacation.start_date',
            label: 'Дата начала отпуска',
            jinja: '{{ vacation.start_date }}',
            groupId: null,
            required: true,
            fieldType: 'date',
          },
        },
        { type: 'text', text: ' по ' },
        {
          type: 'templateField',
          attrs: {
            id: 'seed-vacation-end',
            fieldKey: 'vacation.end_date',
            label: 'Дата окончания отпуска',
            jinja: '{{ vacation.end_date }}',
            groupId: null,
            required: true,
            fieldType: 'date',
          },
        },
        { type: 'text', text: '.' },
      ],
    },
    {
      type: 'paragraph',
      content: [{ type: 'text', text: 'Основание: заявление сотрудника и график отпусков.' }],
    },
  ],
};

export function TemplateBuilderPage() {
  const editorRef = useRef<TemplateEditorHandle | null>(null);
  const [fieldGroups, setFieldGroups] = useState<TemplateFieldGroup[]>([]);
  const [template, setTemplate] = useState<TemplateRecord | null>(null);
  const [editorJson, setEditorJson] = useState<EditorJson>(initialEditorJson);
  const [manifest, setManifest] = useState<TemplateFieldInstance[]>(extractFieldManifest(initialEditorJson));
  const [selectedField, setSelectedField] = useState<SelectedFieldInstance | null>(null);
  const [validation, setValidation] = useState<TemplateValidationResponse | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState('Черновик готов к редактированию.');
  const [isLoadingFields, setIsLoadingFields] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    templateBuilderApi
      .getFields(DOCUMENT_TYPE)
      .then((response) => {
        if (active) setFieldGroups(response.groups);
      })
      .catch((error: Error) => setApiError(error.message))
      .finally(() => {
        if (active) setIsLoadingFields(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleEditorChange = useCallback((json: EditorJson, nextManifest: TemplateFieldInstance[]) => {
    setEditorJson(json);
    setManifest(nextManifest);
    setValidation(null);
  }, []);

  const saveDraft = useCallback(async () => {
    setIsBusy(true);
    setApiError(null);
    try {
      const currentJson = editorRef.current?.getJson() ?? editorJson;
      const editorHtml = editorJsonToJinjaHtml(currentJson);
      const saved = template
        ? await templateBuilderApi.updateTemplate(template.id, {
            name: template.name,
            document_type: DOCUMENT_TYPE,
            editor_json: currentJson,
            editor_html: editorHtml,
          })
        : await templateBuilderApi.createTemplate({
            name: 'Приказ на отпуск',
            document_type: DOCUMENT_TYPE,
            editor_json: currentJson,
          });
      setTemplate(saved);
      setEditorJson(saved.editor_json);
      setManifest(saved.field_manifest);
      setStatusMessage(`Сохранено: версия ${saved.version}.`);
      return saved;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось сохранить шаблон.';
      setApiError(message);
      throw error;
    } finally {
      setIsBusy(false);
    }
  }, [editorJson, template]);

  const runValidation = useCallback(async () => {
    setIsBusy(true);
    setApiError(null);
    try {
      const saved = await saveDraft();
      const result = await templateBuilderApi.validateTemplate(saved.id);
      setValidation(result);
      setStatusMessage(result.valid ? 'Проверка пройдена.' : 'Проверка нашла ошибки.');
    } catch (error) {
      setApiError(error instanceof Error ? error.message : 'Не удалось проверить шаблон.');
    } finally {
      setIsBusy(false);
    }
  }, [saveDraft]);

  const renderPreview = useCallback(async () => {
    setIsBusy(true);
    setPreviewError(null);
    setApiError(null);
    try {
      const saved = await saveDraft();
      const result = await templateBuilderApi.renderPreview(saved.id);
      const url = result.pdf_url.startsWith('http')
        ? result.pdf_url
        : `${import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'}${result.pdf_url}`;
      setPreviewUrl(url);
      setStatusMessage('PDF preview готов.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось создать PDF preview.';
      setPreviewError(message);
      setStatusMessage('PDF preview недоступен.');
    } finally {
      setIsBusy(false);
    }
  }, [saveDraft]);

  const exportDocx = useCallback(async () => {
    try {
      const saved = await saveDraft();
      window.open(templateBuilderApi.downloadUrl(saved.id, 'docx'), '_blank', 'noreferrer');
    } catch {
      setStatusMessage('DOCX export не выполнен.');
    }
  }, [saveDraft]);

  const publishTemplate = useCallback(async () => {
    setIsBusy(true);
    setApiError(null);
    try {
      const saved = await saveDraft();
      const published = await templateBuilderApi.publishTemplate(saved.id);
      setTemplate(published);
      setStatusMessage('Шаблон опубликован.');
    } catch (error) {
      setApiError(error instanceof Error ? error.message : 'Публикация недоступна.');
    } finally {
      setIsBusy(false);
    }
  }, [saveDraft]);

  const insertField = (field: TemplateField) => {
    editorRef.current?.insertField(field);
  };

  const duplicateLinked = () => {
    if (selectedField) {
      editorRef.current?.duplicateAsLinked(selectedField);
    }
  };

  const deleteSelected = () => {
    if (selectedField) {
      editorRef.current?.deleteFieldInstance(selectedField.id);
    }
  };

  const canPublish = useMemo(
    () => Boolean(validation?.valid && validation.missing_required_fields.length === 0),
    [validation],
  );

  return (
    <div className="builder-app">
      <nav className="app-rail" aria-label="Модули">
        <div className="brand-mark">G</div>
        <a className="rail-link active" href="#builder" aria-label="Шаблоны">
          <FileText size={19} />
        </a>
        <a className="rail-link" href="#registry" aria-label="Реестр полей">
          <Layers3 size={19} />
        </a>
      </nav>

      <section className="builder-shell">
        <div className="builder-titlebar">
          <div>
            <h1>Template Builder</h1>
            <p>HR order templates · docxtpl/Jinja · original internal MVP</p>
          </div>
          <div className="status-pill" aria-live="polite">
            {statusMessage}
          </div>
        </div>

        <TemplateBuilderToolbar
          canPublish={canPublish}
          isBusy={isBusy}
          onSave={() => void saveDraft()}
          onValidate={() => void runValidation()}
          onPreview={() => void renderPreview()}
          onExportDocx={() => void exportDocx()}
          onPublish={() => void publishTemplate()}
          onBold={() => editorRef.current?.toggleBold()}
          onItalic={() => editorRef.current?.toggleItalic()}
          onUnderline={() => editorRef.current?.toggleUnderline()}
        />

        {apiError ? <div className="error-banner">{apiError}</div> : null}

        <div className="builder-grid">
          <TemplateFieldsSidebar
            groups={fieldGroups}
            manifest={manifest}
            isLoading={isLoadingFields}
            onInsertField={insertField}
          />

          <TemplateEditorCanvas
            ref={editorRef}
            value={editorJson}
            fieldGroups={fieldGroups}
            onChange={handleEditorChange}
            onSelectField={setSelectedField}
          />

          <aside className="right-panel">
            <TemplateFieldInspector field={selectedField} onDuplicateLinked={duplicateLinked} onDelete={deleteSelected} />
            <TemplateValidationPanel validation={validation} />
            <TemplatePreviewPanel pdfUrl={previewUrl} error={previewError} />
          </aside>
        </div>
      </section>
    </div>
  );
}

import { Table } from '@tiptap/extension-table';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TableRow from '@tiptap/extension-table-row';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { TemplateFieldExtension } from '../editor/extensions/TemplateFieldExtension';
import { extractFieldManifest } from '../editor/serialization/extractFieldManifest';
import type {
  EditorJson,
  SelectedFieldInstance,
  TemplateField,
  TemplateFieldInstance,
} from '../types/templateBuilder.types';
import { flattenFieldGroups } from '../utils/fieldSearch';
import type { TemplateFieldGroup } from '../types/templateBuilder.types';

export interface TemplateEditorHandle {
  insertField: (field: TemplateField, groupId?: string | null) => void;
  duplicateAsLinked: (instance: SelectedFieldInstance) => void;
  deleteFieldInstance: (id: string) => void;
  toggleBold: () => void;
  toggleItalic: () => void;
  toggleUnderline: () => void;
  getJson: () => EditorJson;
}

interface TriggerState {
  open: boolean;
  query: string;
  from: number;
  to: number;
  top: number;
  left: number;
}

interface Props {
  value: EditorJson;
  fieldGroups: TemplateFieldGroup[];
  onChange: (json: EditorJson, manifest: TemplateFieldInstance[]) => void;
  onSelectField: (field: SelectedFieldInstance | null) => void;
}

const emptyTrigger: TriggerState = { open: false, query: '', from: 0, to: 0, top: 0, left: 0 };

export const TemplateEditorCanvas = forwardRef<TemplateEditorHandle, Props>(function TemplateEditorCanvas(
  { value, fieldGroups, onChange, onSelectField },
  ref,
) {
  const editorHostRef = useRef<HTMLDivElement | null>(null);
  const [trigger, setTrigger] = useState<TriggerState>(emptyTrigger);
  const fields = useMemo(() => flattenFieldGroups(fieldGroups), [fieldGroups]);
  const filteredTriggerFields = useMemo(() => {
    const query = trigger.query.toLowerCase();
    if (!query) return fields.slice(0, 8);
    return fields
      .filter((field) => `${field.label} ${field.key}`.toLowerCase().includes(query))
      .slice(0, 8);
  }, [fields, trigger.query]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Table.configure({ resizable: false }),
      TableRow,
      TableCell,
      TableHeader,
      TemplateFieldExtension,
    ],
    content: value,
    editorProps: {
      attributes: {
        class: 'template-editor-prose',
        'aria-label': 'Редактор шаблона',
      },
    },
    onUpdate({ editor }) {
      const json = editor.getJSON() as EditorJson;
      onChange(json, extractFieldManifest(json));
      updateTriggerState(editor, editorHostRef.current, setTrigger);
    },
    onSelectionUpdate({ editor }) {
      updateTriggerState(editor, editorHostRef.current, setTrigger);
    },
  });

  useEffect(() => {
    const handler = (event: Event) => {
      const customEvent = event as CustomEvent<Record<string, unknown>>;
      const attrs = customEvent.detail;
      const fieldKey = String(attrs.fieldKey ?? '');
      if (!fieldKey) return;
      onSelectField({
        id: String(attrs.id),
        field_key: fieldKey,
        label: String(attrs.label ?? fieldKey),
        jinja: String(attrs.jinja ?? `{{ ${fieldKey} }}`),
        group_id: typeof attrs.groupId === 'string' ? attrs.groupId : null,
        occurrence_index: 1,
        required: Boolean(attrs.required),
        field_type: String(attrs.fieldType ?? 'string') as SelectedFieldInstance['field_type'],
        attrs: {
          id: String(attrs.id),
          fieldKey,
          label: String(attrs.label ?? fieldKey),
          jinja: String(attrs.jinja ?? `{{ ${fieldKey} }}`),
          groupId: typeof attrs.groupId === 'string' ? attrs.groupId : null,
          required: Boolean(attrs.required),
          fieldType: String(attrs.fieldType ?? 'string') as SelectedFieldInstance['field_type'],
        },
      });
    };
    window.addEventListener('template-field-selected', handler);
    return () => window.removeEventListener('template-field-selected', handler);
  }, [onSelectField]);

  useImperativeHandle(
    ref,
    () => ({
      insertField(field, groupId) {
        insertTemplateField(editor, field, groupId);
      },
      duplicateAsLinked(instance) {
        if (!editor) return;
        const groupId = instance.group_id ?? instance.id;
        updateFieldGroup(editor, instance.id, groupId);
        const sourceField: TemplateField = {
          key: instance.field_key,
          label: instance.label,
          type: instance.field_type,
          required: instance.required,
          jinja: instance.jinja,
          sample: '',
        };
        insertTemplateField(editor, sourceField, groupId);
      },
      deleteFieldInstance(id) {
        if (!editor) return;
        deleteFieldById(editor, id);
        onSelectField(null);
      },
      toggleBold() {
        editor?.chain().focus().toggleBold().run();
      },
      toggleItalic() {
        editor?.chain().focus().toggleItalic().run();
      },
      toggleUnderline() {
        editor?.chain().focus().toggleUnderline().run();
      },
      getJson() {
        return (editor?.getJSON() ?? value) as EditorJson;
      },
    }),
    [editor, onSelectField, value],
  );

  const insertFromTrigger = (field: TemplateField) => {
    if (!editor) return;
    editor
      .chain()
      .focus()
      .deleteRange({ from: trigger.from, to: trigger.to })
      .insertContent(createTemplateFieldNode(field))
      .insertContent(' ')
      .run();
    setTrigger(emptyTrigger);
  };

  return (
    <main className="editor-stage">
      <div className="document-meta">
        <span>Шаблон документа</span>
        <strong>A4 draft canvas</strong>
      </div>
      <div className="document-page" ref={editorHostRef}>
        {editor ? <EditorContent editor={editor} /> : <div className="empty-state">Готовим редактор...</div>}
        {trigger.open ? (
          <div className="trigger-menu" style={{ top: trigger.top, left: trigger.left }} role="listbox">
            {filteredTriggerFields.length === 0 ? (
              <div className="trigger-empty">Полей не найдено</div>
            ) : (
              filteredTriggerFields.map((field) => (
                <button key={field.key} type="button" onClick={() => insertFromTrigger(field)}>
                  <strong>{field.label}</strong>
                  <small>{field.key}</small>
                </button>
              ))
            )}
          </div>
        ) : null}
      </div>
    </main>
  );
});

function insertTemplateField(editor: NonNullable<ReturnType<typeof useEditor>>, field: TemplateField, groupId?: string | null) {
  editor.chain().focus().insertContent(createTemplateFieldNode(field, groupId)).insertContent(' ').run();
}

function createTemplateFieldNode(field: TemplateField, groupId?: string | null) {
  return {
    type: 'templateField',
    attrs: {
      id: uuidv4(),
      fieldKey: field.key,
      label: field.label,
      jinja: field.jinja,
      groupId: groupId ?? null,
      required: field.required,
      fieldType: field.type,
    },
  };
}

function updateFieldGroup(editor: NonNullable<ReturnType<typeof useEditor>>, fieldId: string, groupId: string) {
  const { state, view } = editor;
  state.doc.descendants((node, pos) => {
    if (node.type.name === 'templateField' && node.attrs.id === fieldId) {
      const transaction = state.tr.setNodeMarkup(pos, undefined, { ...node.attrs, groupId });
      view.dispatch(transaction);
      return false;
    }
    return true;
  });
}

function deleteFieldById(editor: NonNullable<ReturnType<typeof useEditor>>, fieldId: string) {
  const { state, view } = editor;
  state.doc.descendants((node, pos) => {
    if (node.type.name === 'templateField' && node.attrs.id === fieldId) {
      view.dispatch(state.tr.delete(pos, pos + node.nodeSize));
      return false;
    }
    return true;
  });
}

function updateTriggerState(
  editor: NonNullable<ReturnType<typeof useEditor>>,
  host: HTMLDivElement | null,
  setTrigger: (value: TriggerState) => void,
) {
  const { selection } = editor.state;
  if (!selection.empty) {
    setTrigger(emptyTrigger);
    return;
  }
  const cursor = selection.from;
  const lookbackStart = Math.max(1, cursor - 80);
  const textBefore = editor.state.doc.textBetween(lookbackStart, cursor, '\n', '\n');
  const match = textBefore.match(/\{\{([\w.\-\s]*)$/);
  if (!match) {
    setTrigger(emptyTrigger);
    return;
  }
  const coords = editor.view.coordsAtPos(cursor);
  const hostRect = host?.getBoundingClientRect();
  setTrigger({
    open: true,
    query: match[1].trim(),
    from: cursor - match[0].length,
    to: cursor,
    top: hostRect ? coords.bottom - hostRect.top + 8 : coords.bottom + 8,
    left: hostRect ? coords.left - hostRect.left : coords.left,
  });
}

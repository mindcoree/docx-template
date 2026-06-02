import { CopyPlus, Link2, Trash2 } from 'lucide-react';
import type { SelectedFieldInstance } from '../types/templateBuilder.types';

interface Props {
  field: SelectedFieldInstance | null;
  onDuplicateLinked: () => void;
  onDelete: () => void;
}

export function TemplateFieldInspector({ field, onDuplicateLinked, onDelete }: Props) {
  if (!field) {
    return (
      <section className="field-inspector empty" aria-label="Инспектор поля">
        <h2>Инспектор</h2>
        <p>Выберите чип поля в документе, чтобы увидеть настройки.</p>
      </section>
    );
  }

  return (
    <section className="field-inspector" aria-label="Инспектор поля">
      <h2>Инспектор</h2>
      <dl>
        <div>
          <dt>Поле</dt>
          <dd>{field.label}</dd>
        </div>
        <div>
          <dt>Ключ</dt>
          <dd>{field.field_key}</dd>
        </div>
        <div>
          <dt>Jinja</dt>
          <dd>{field.jinja}</dd>
        </div>
        <div>
          <dt>Group ID</dt>
          <dd>{field.group_id ?? 'не связано'}</dd>
        </div>
        <div>
          <dt>Required</dt>
          <dd>{field.required ? 'да' : 'нет'}</dd>
        </div>
      </dl>
      <div className="inspector-actions">
        <button type="button" className="toolbar-button" onClick={onDuplicateLinked}>
          <Link2 size={15} />
          Duplicate linked
        </button>
        <button type="button" className="toolbar-button danger" onClick={onDelete}>
          <Trash2 size={15} />
          Delete
        </button>
      </div>
      <div className="linked-note">
        <CopyPlus size={14} aria-hidden />
        Связанные копии используют тот же `groupId`, но экспортируются как обычный Jinja placeholder.
      </div>
    </section>
  );
}


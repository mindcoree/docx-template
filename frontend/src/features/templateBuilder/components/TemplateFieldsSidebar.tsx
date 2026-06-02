import { Search, Star } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { TemplateField, TemplateFieldGroup, TemplateFieldInstance } from '../types/templateBuilder.types';
import { searchFields } from '../utils/fieldSearch';

interface Props {
  groups: TemplateFieldGroup[];
  manifest: TemplateFieldInstance[];
  isLoading: boolean;
  onInsertField: (field: TemplateField) => void;
}

export function TemplateFieldsSidebar({ groups, manifest, isLoading, onInsertField }: Props) {
  const [query, setQuery] = useState('');
  const filteredGroups = useMemo(() => searchFields(groups, query), [groups, query]);
  const occurrenceCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of manifest) {
      counts.set(item.field_key, (counts.get(item.field_key) ?? 0) + 1);
    }
    return counts;
  }, [manifest]);

  return (
    <aside className="fields-sidebar" aria-label="Доступные поля">
      <div className="sidebar-header">
        <h2>Поля шаблона</h2>
        <p>Выберите поле или введите {'{{'} в документе.</p>
      </div>
      <label className="search-field">
        <Search size={16} aria-hidden />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Найти поле"
          aria-label="Найти поле"
        />
      </label>

      <div className="field-groups">
        {isLoading ? <div className="empty-state">Загружаем поля...</div> : null}
        {!isLoading && filteredGroups.length === 0 ? <div className="empty-state">Полей не найдено.</div> : null}
        {filteredGroups.map((group) => (
          <section key={group.key} className="field-group">
            <h3>{group.label}</h3>
            {group.fields.map((field) => {
              const count = occurrenceCounts.get(field.key) ?? 0;
              return (
                <button key={field.key} type="button" className="field-row" onClick={() => onInsertField(field)}>
                  <span>
                    <strong>{field.label}</strong>
                    <small>{field.key}</small>
                  </span>
                  <span className="field-row-meta">
                    {field.required ? <Star size={12} aria-label="Обязательное поле" /> : null}
                    {count > 0 ? <b>{count}</b> : null}
                  </span>
                </button>
              );
            })}
          </section>
        ))}
      </div>
    </aside>
  );
}


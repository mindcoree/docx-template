import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { TemplateValidationResponse } from '../types/templateBuilder.types';

interface Props {
  validation: TemplateValidationResponse | null;
}

export function TemplateValidationPanel({ validation }: Props) {
  if (!validation) {
    return (
      <section className="validation-panel">
        <h2>Проверка</h2>
        <p>Запустите проверку, чтобы увидеть ошибки полей и Jinja.</p>
      </section>
    );
  }

  return (
    <section className={`validation-panel ${validation.valid ? 'is-valid' : 'has-errors'}`}>
      <h2>{validation.valid ? 'Шаблон можно сохранить' : 'Нужны исправления'}</h2>
      <div className="validation-summary">
        {validation.valid ? <CheckCircle2 size={17} /> : <AlertTriangle size={17} />}
        <span>{validation.used_fields.length} полей используется</span>
      </div>
      {[...validation.errors, ...validation.warnings].length === 0 ? (
        <p>Ошибок и предупреждений нет.</p>
      ) : (
        <ul>
          {[...validation.errors, ...validation.warnings].map((issue, index) => (
            <li key={`${issue.code}-${issue.field_key ?? index}`} className={issue.severity}>
              <strong>{issue.code}</strong>
              <span>{issue.message}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}


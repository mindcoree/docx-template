import { Link2 } from 'lucide-react';
import type { TemplateFieldInstance } from '../types/templateBuilder.types';

interface Props {
  field: TemplateFieldInstance;
}

export function TemplateFieldChip({ field }: Props) {
  return (
    <span className="field-chip-preview">
      {field.group_id ? <Link2 size={12} aria-hidden /> : null}
      {field.label}
    </span>
  );
}


import { describe, expect, it } from 'vitest';
import { searchFields } from './fieldSearch';
import type { TemplateFieldGroup } from '../types/templateBuilder.types';

const groups: TemplateFieldGroup[] = [
  {
    key: 'employee',
    label: 'Сотрудник',
    fields: [
      {
        key: 'employee.full_name',
        label: 'ФИО сотрудника',
        type: 'string',
        required: true,
        jinja: '{{ employee.full_name }}',
        sample: 'Иванов',
      },
    ],
  },
  {
    key: 'order',
    label: 'Приказ',
    fields: [
      {
        key: 'order.date',
        label: 'Дата приказа',
        type: 'date',
        required: true,
        jinja: '{{ order.date }}',
        sample: '02.06.2026',
      },
    ],
  },
];

describe('searchFields', () => {
  it('filters groups by label and key', () => {
    expect(searchFields(groups, 'date')).toEqual([
      {
        ...groups[1],
        fields: [groups[1].fields[0]],
      },
    ]);

    expect(searchFields(groups, 'фио')).toEqual([
      {
        ...groups[0],
        fields: [groups[0].fields[0]],
      },
    ]);
  });
});


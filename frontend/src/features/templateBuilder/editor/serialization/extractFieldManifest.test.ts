import { describe, expect, it } from 'vitest';
import { extractFieldManifest } from './extractFieldManifest';
import type { EditorJson } from '../../types/templateBuilder.types';

describe('extractFieldManifest', () => {
  it('extracts template field chips with occurrence indexes', () => {
    const editorJson: EditorJson = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Hello ' },
            {
              type: 'templateField',
              attrs: {
                id: 'one',
                fieldKey: 'employee.full_name',
                label: 'ФИО сотрудника',
                jinja: '{{ employee.full_name }}',
                groupId: 'group-one',
                required: true,
                fieldType: 'string',
              },
            },
            {
              type: 'templateField',
              attrs: {
                id: 'two',
                fieldKey: 'employee.full_name',
                label: 'ФИО сотрудника',
                jinja: '{{ employee.full_name }}',
                groupId: 'group-one',
                required: true,
                fieldType: 'string',
              },
            },
          ],
        },
      ],
    };

    expect(extractFieldManifest(editorJson)).toEqual([
      {
        id: 'one',
        field_key: 'employee.full_name',
        label: 'ФИО сотрудника',
        jinja: '{{ employee.full_name }}',
        group_id: 'group-one',
        occurrence_index: 1,
        required: true,
        field_type: 'string',
      },
      {
        id: 'two',
        field_key: 'employee.full_name',
        label: 'ФИО сотрудника',
        jinja: '{{ employee.full_name }}',
        group_id: 'group-one',
        occurrence_index: 2,
        required: true,
        field_type: 'string',
      },
    ]);
  });
});


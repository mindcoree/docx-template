import { describe, expect, it } from 'vitest';
import { editorJsonToJinjaHtml } from './editorJsonToJinjaHtml';

describe('editorJsonToJinjaHtml', () => {
  it('serializes chip display nodes as Jinja placeholders', () => {
    expect(
      editorJsonToJinjaHtml({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Сотрудник: ' },
              {
                type: 'templateField',
                attrs: {
                  fieldKey: 'employee.full_name',
                  jinja: '{{ employee.full_name }}',
                },
              },
            ],
          },
        ],
      }),
    ).toBe('<p>Сотрудник: <span data-template-field="employee.full_name">{{ employee.full_name }}</span></p>');
  });
});


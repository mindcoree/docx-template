import { mergeAttributes, Node } from '@tiptap/core';

export const TemplateFieldExtension = Node.create({
  name: 'templateField',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    return {
      id: { default: null },
      fieldKey: { default: null },
      label: { default: null },
      jinja: { default: null },
      groupId: { default: null },
      required: { default: false },
      fieldType: { default: 'string' },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-template-field]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-template-field': HTMLAttributes.fieldKey,
        'data-field-id': HTMLAttributes.id,
        class: 'template-field-chip',
      }),
      HTMLAttributes.label ?? HTMLAttributes.fieldKey,
    ];
  },

  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement('button');
      dom.type = 'button';
      dom.className = 'template-field-chip';
      dom.contentEditable = 'false';
      dom.dataset.templateField = String(node.attrs.fieldKey ?? '');
      dom.dataset.fieldId = String(node.attrs.id ?? '');
      dom.textContent = node.attrs.label ?? node.attrs.fieldKey;
      if (node.attrs.groupId) {
        dom.classList.add('is-linked');
        dom.setAttribute('aria-label', `${node.attrs.label}, связанное поле`);
      } else {
        dom.setAttribute('aria-label', String(node.attrs.label ?? node.attrs.fieldKey));
      }
      dom.addEventListener('click', (event) => {
        event.preventDefault();
        window.dispatchEvent(new CustomEvent('template-field-selected', { detail: node.attrs }));
      });
      return { dom };
    };
  },
});


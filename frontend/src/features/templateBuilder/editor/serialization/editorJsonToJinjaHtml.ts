import type { EditorJson } from '../../types/templateBuilder.types';

export function editorJsonToJinjaHtml(editorJson: EditorJson): string {
  return renderNode(editorJson);
}

function renderNode(node: EditorJson): string {
  switch (node.type) {
    case 'doc':
      return (node.content ?? []).map(renderNode).join('');
    case 'paragraph':
      return `<p>${renderChildren(node)}</p>`;
    case 'heading': {
      const level = Number((node.attrs ?? {}).level ?? 1);
      const safeLevel = Math.min(Math.max(level, 1), 3);
      return `<h${safeLevel}>${renderChildren(node)}</h${safeLevel}>`;
    }
    case 'bulletList':
      return `<ul>${renderChildren(node)}</ul>`;
    case 'orderedList':
      return `<ol>${renderChildren(node)}</ol>`;
    case 'listItem':
      return `<li>${renderChildren(node)}</li>`;
    case 'text':
      return renderMarkedText(escapeHtml(node.text ?? ''), node.marks ?? []);
    case 'templateField': {
      const attrs = node.attrs ?? {};
      return `<span data-template-field="${escapeHtml(String(attrs.fieldKey ?? ''))}">${escapeHtml(String(attrs.jinja ?? ''))}</span>`;
    }
    case 'hardBreak':
      return '<br />';
    default:
      return renderChildren(node);
  }
}

function renderChildren(node: EditorJson): string {
  return (node.content ?? []).map(renderNode).join('');
}

function renderMarkedText(value: string, marks: Array<{ type: string }>): string {
  return marks.reduce((text, mark) => {
    if (mark.type === 'bold') return `<strong>${text}</strong>`;
    if (mark.type === 'italic') return `<em>${text}</em>`;
    if (mark.type === 'underline') return `<u>${text}</u>`;
    return text;
  }, value);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}


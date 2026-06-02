import { z } from 'zod';
import type {
  EditorJson,
  TemplateFieldRegistryResponse,
  TemplateRecord,
  TemplateValidationResponse,
} from '../types/templateBuilder.types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000';

const recordSchema = z.object({
  id: z.string(),
  name: z.string(),
  document_type: z.string(),
  status: z.enum(['draft', 'published', 'archived']),
  editor_json: z.any(),
  editor_html: z.string().nullable().optional(),
  field_manifest: z.array(z.any()),
  original_docx_path: z.string().nullable().optional(),
  exported_docx_path: z.string().nullable().optional(),
  preview_pdf_path: z.string().nullable().optional(),
  version: z.number(),
  created_by: z.string(),
  updated_by: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

async function request<T>(path: string, options?: RequestInit, parser?: (value: unknown) => T): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = payload?.detail;
    const message = typeof detail === 'string' ? detail : 'Не удалось выполнить запрос.';
    throw new Error(message);
  }
  return parser ? parser(payload) : (payload as T);
}

export const templateBuilderApi = {
  async getFields(documentType: string): Promise<TemplateFieldRegistryResponse> {
    return request(`/api/templates/fields?document_type=${encodeURIComponent(documentType)}`);
  },

  async listTemplates(): Promise<TemplateRecord[]> {
    const response = await request<{ items: TemplateRecord[] }>('/api/templates');
    return response.items;
  },

  async createTemplate(input: { name: string; document_type: string; editor_json: EditorJson }): Promise<TemplateRecord> {
    return request(
      '/api/templates',
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
      (value) => recordSchema.parse(value) as TemplateRecord,
    );
  },

  async updateTemplate(
    id: string,
    input: { name?: string; document_type?: string; editor_json?: EditorJson; editor_html?: string },
  ): Promise<TemplateRecord> {
    return request(
      `/api/templates/${id}`,
      {
        method: 'PUT',
        body: JSON.stringify(input),
      },
      (value) => recordSchema.parse(value) as TemplateRecord,
    );
  },

  async validateTemplate(id: string): Promise<TemplateValidationResponse> {
    return request(`/api/templates/${id}/validate`, { method: 'POST' });
  },

  async publishTemplate(id: string): Promise<TemplateRecord> {
    return request(`/api/templates/${id}/publish`, { method: 'POST' }, (value) => recordSchema.parse(value) as TemplateRecord);
  },

  async renderPreview(id: string): Promise<{ pdf_url: string }> {
    return request(`/api/templates/${id}/render-preview`, { method: 'POST' });
  },

  downloadUrl(id: string, format: 'docx' | 'pdf'): string {
    return `${API_BASE_URL}/api/templates/${id}/download?format=${format}`;
  },
};


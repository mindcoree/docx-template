# Dependency Notes

Checked before adding dependencies.

## Frontend

| Dependency | License | Purpose |
| --- | --- | --- |
| `@vitejs/plugin-react` | MIT | React build plugin |
| `vite` | MIT | Frontend dev/build tool |
| `typescript` | Apache-2.0 | TypeScript compiler |
| `react` | MIT | UI runtime |
| `react-dom` | MIT | DOM renderer |
| `@tiptap/react` | MIT | React editor integration |
| `@tiptap/starter-kit` | MIT | Basic ProseMirror editor nodes/marks |
| `@tiptap/extension-table` | MIT | Simple table support |
| `@tiptap/extension-table-row` | MIT | Table row support |
| `@tiptap/extension-table-cell` | MIT | Table cell support |
| `@tiptap/extension-table-header` | MIT | Table header support |
| `@tiptap/suggestion` | MIT | Trigger-menu dependency retained for future extension polish |
| `@floating-ui/react` | MIT | Floating menu positioning dependency retained for future extension polish |
| `uuid` | MIT | Field instance IDs |
| `zod` | MIT | API response validation |
| `lucide-react` | ISC | Toolbar/action icons |
| `vitest` | MIT | Frontend unit tests |
| `@testing-library/react` | MIT | Component test utilities |
| `@testing-library/jest-dom` | MIT | Test matchers |
| `jsdom` | MIT | Browser-like test environment |
| `@types/node` | MIT | Vite/Vitest Node-side type declarations |

## Backend

| Dependency | License | Purpose |
| --- | --- | --- |
| `fastapi` | MIT family project metadata unavailable in PyPI JSON | HTTP API |
| `uvicorn` | BSD family project metadata unavailable in PyPI JSON | ASGI dev server |
| `pydantic` | MIT family project metadata unavailable in PyPI JSON | Request/response models |
| `python-docx` | MIT | DOCX template export |
| `docxtpl` | LGPL-2.1-only | Required docxtpl/Jinja rendering stack from the brief |
| `Jinja2` | BSD | Jinja syntax validation/render support |
| `httpx` | BSD-3-Clause | Gotenberg HTTP client |
| `python-multipart` | Apache Software License | DOCX upload endpoint |
| `pytest` | MIT family project metadata unavailable in PyPI JSON | Backend tests |

No SuperDoc or `@superdoc-dev/template-builder` dependency is present.

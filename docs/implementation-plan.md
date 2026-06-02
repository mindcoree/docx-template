# Implementation Plan And Audit Note

## Repository Audit

The workspace was empty except for `.git`, so there were no existing frontend pages, API clients, backend routers, docxtpl services, Gotenberg services, storage patterns, auth helpers, UI libraries, or tests to extend.

## Chosen Scope

This pass creates a narrow original MVP scaffold:

- `backend/`: FastAPI app for field registry, draft template storage, validation, DOCX export, docxtpl render, and Gotenberg PDF conversion.
- `frontend/`: React + Vite + Tiptap Template Builder UI.
- `docs/`: implementation notes, dependency license notes, V1 limitations, and visual concept.

## Risks

- This is not wired into the real GMS ERP repository because the current workspace contains no ERP code.
- Auth is represented by a simple `X-User-Id` header stub; real RBAC must be integrated later.
- Storage uses local SQLite plus local files; real MinIO/S3 integration is deferred.
- PDF preview requires a running Gotenberg instance and is not mocked in the UI.
- DOCX import is intentionally simplified for V1 and does not promise layout fidelity.

## Quality Trio Summary

Mode: Split streams conceptually, executed as one consolidated pass.

Streams:

- Backend/API/storage/render
- Frontend editor UI
- QA/docs

Search checked:

- Workspace tree
- Provided phased brief
- Dependency license metadata
- Quality Trio, Worksplit, SOLID/DRY/KISS/Reuse, Impeccable, Documents, and Build Web Apps skill instructions

Decision: create

Why: no existing implementation owner exists in the empty repo.

UI pass: yes

Concept reference: `docs/concepts/template-builder-primary.png`


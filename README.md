# GMS ERP Template Builder MVP

Custom internal browser Template Builder for HR orders, employment contracts, and internal ERP documents.

This repository is a narrow MVP scaffold because the workspace was empty when audited. It includes:

- FastAPI backend for field registry, template drafts, validation, DOCX export, docxtpl rendering, and Gotenberg PDF preview integration.
- React + TypeScript frontend with a Tiptap editor, field chips, sidebar insertion, `{{` trigger menu, inspector, validation panel, and export/preview actions.
- Focused backend and frontend tests.

Legal and dependency boundary:

- No SuperDoc or `@superdoc-dev/template-builder` dependency is used.
- No SuperDoc source, component names, CSS, layout, icons, or exact design were copied.
- No AGPL dependency was added.

## Quick Start

Backend:

```bash
cd backend
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173`.

PDF preview requires Gotenberg:

```bash
export GOTENBERG_URL=http://localhost:3000
```

Without `GOTENBERG_URL`, DOCX export and docxtpl render still work, but PDF preview returns a clear unavailable error.


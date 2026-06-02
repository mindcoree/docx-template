from __future__ import annotations

import json
import os
import sqlite3
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from uuid import uuid4

from app.schemas.templates import (
    TemplateCreateRequest,
    TemplateFieldInstance,
    TemplateRecord,
    TemplateStatus,
    TemplateUpdateRequest,
)
from app.utils.editor_json import default_editor_json, extract_field_manifest


def _default_db_path() -> Path:
    return Path(os.environ.get("TEMPLATE_DB_PATH", Path(__file__).resolve().parents[2] / "data" / "templates.db"))


class TemplateNotFoundError(KeyError):
    pass


class TemplateStore:
    def __init__(self, db_path: Path | None = None) -> None:
        self.db_path = db_path or _default_db_path()
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_schema()

    def _connect(self) -> sqlite3.Connection:
        connection = sqlite3.connect(self.db_path)
        connection.row_factory = sqlite3.Row
        return connection

    def _init_schema(self) -> None:
        with self._connect() as connection:
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS templates (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    document_type TEXT NOT NULL,
                    status TEXT NOT NULL,
                    editor_json TEXT NOT NULL,
                    editor_html TEXT,
                    field_manifest TEXT NOT NULL,
                    original_docx_path TEXT,
                    exported_docx_path TEXT,
                    preview_pdf_path TEXT,
                    version INTEGER NOT NULL,
                    created_by TEXT NOT NULL,
                    updated_by TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )
                """
            )

    def create(self, payload: TemplateCreateRequest, actor_user_id: str) -> TemplateRecord:
        now = datetime.now(UTC).isoformat()
        template_id = str(uuid4())
        editor_json = payload.editor_json or default_editor_json()
        manifest = payload.field_manifest or extract_field_manifest(editor_json)
        with self._connect() as connection:
            connection.execute(
                """
                INSERT INTO templates (
                    id, name, document_type, status, editor_json, editor_html, field_manifest,
                    original_docx_path, exported_docx_path, preview_pdf_path, version,
                    created_by, updated_by, created_at, updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL, ?, ?, ?, ?, ?)
                """,
                (
                    template_id,
                    payload.name,
                    payload.document_type,
                    "draft",
                    json.dumps(editor_json, ensure_ascii=False),
                    payload.editor_html,
                    _dump_manifest(manifest),
                    1,
                    actor_user_id,
                    actor_user_id,
                    now,
                    now,
                ),
            )
        return self.get(template_id)

    def list(self) -> list[TemplateRecord]:
        with self._connect() as connection:
            rows = connection.execute("SELECT * FROM templates ORDER BY updated_at DESC").fetchall()
        return [_row_to_record(row) for row in rows]

    def get(self, template_id: str) -> TemplateRecord:
        with self._connect() as connection:
            row = connection.execute("SELECT * FROM templates WHERE id = ?", (template_id,)).fetchone()
        if row is None:
            raise TemplateNotFoundError(template_id)
        return _row_to_record(row)

    def update(self, template_id: str, payload: TemplateUpdateRequest, actor_user_id: str) -> TemplateRecord:
        current = self.get(template_id)
        next_editor_json = payload.editor_json if payload.editor_json is not None else current.editor_json
        next_manifest = payload.field_manifest
        if next_manifest is None:
            next_manifest = extract_field_manifest(next_editor_json)
        now = datetime.now(UTC).isoformat()
        with self._connect() as connection:
            connection.execute(
                """
                UPDATE templates
                SET name = ?,
                    document_type = ?,
                    status = ?,
                    editor_json = ?,
                    editor_html = ?,
                    field_manifest = ?,
                    version = ?,
                    updated_by = ?,
                    updated_at = ?
                WHERE id = ?
                """,
                (
                    payload.name if payload.name is not None else current.name,
                    payload.document_type if payload.document_type is not None else current.document_type,
                    payload.status if payload.status is not None else current.status,
                    json.dumps(next_editor_json, ensure_ascii=False),
                    payload.editor_html if payload.editor_html is not None else current.editor_html,
                    _dump_manifest(next_manifest),
                    current.version + 1,
                    actor_user_id,
                    now,
                    template_id,
                ),
            )
        return self.get(template_id)

    def update_paths(
        self,
        template_id: str,
        *,
        original_docx_path: str | None = None,
        exported_docx_path: str | None = None,
        preview_pdf_path: str | None = None,
    ) -> TemplateRecord:
        current = self.get(template_id)
        with self._connect() as connection:
            connection.execute(
                """
                UPDATE templates
                SET original_docx_path = ?,
                    exported_docx_path = ?,
                    preview_pdf_path = ?
                WHERE id = ?
                """,
                (
                    original_docx_path if original_docx_path is not None else current.original_docx_path,
                    exported_docx_path if exported_docx_path is not None else current.exported_docx_path,
                    preview_pdf_path if preview_pdf_path is not None else current.preview_pdf_path,
                    template_id,
                ),
            )
        return self.get(template_id)

    def publish(self, template_id: str, actor_user_id: str) -> TemplateRecord:
        return self.update(template_id, TemplateUpdateRequest(status="published"), actor_user_id)


def _dump_manifest(manifest: list[TemplateFieldInstance]) -> str:
    return json.dumps([item.model_dump() for item in manifest], ensure_ascii=False)


def _row_to_record(row: sqlite3.Row) -> TemplateRecord:
    data: dict[str, Any] = dict(row)
    data["editor_json"] = json.loads(data["editor_json"])
    data["field_manifest"] = [TemplateFieldInstance(**item) for item in json.loads(data["field_manifest"])]
    data["created_at"] = datetime.fromisoformat(data["created_at"])
    data["updated_at"] = datetime.fromisoformat(data["updated_at"])
    data["status"] = data["status"] if data["status"] in {"draft", "published", "archived"} else "draft"
    return TemplateRecord(**data)


def ensure_status(value: str) -> TemplateStatus:
    if value not in {"draft", "published", "archived"}:
        raise ValueError(f"Unsupported template status: {value}")
    return value  # type: ignore[return-value]


def get_template_store() -> TemplateStore:
    return TemplateStore()


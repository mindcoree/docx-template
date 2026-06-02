from __future__ import annotations

import os
import zipfile
from pathlib import Path

from fastapi.testclient import TestClient

from app.main import app
from app.schemas.templates import TemplateCreateRequest
from app.services.docx_service import export_template_docx, render_template_docx
from app.services.template_store import TemplateStore


def _client(tmp_path: Path) -> TestClient:
    os.environ["TEMPLATE_DB_PATH"] = str(tmp_path / "templates.db")
    return TestClient(app)


def _editor_json() -> dict:
    return {
        "type": "doc",
        "content": [
            {"type": "heading", "attrs": {"level": 1}, "content": [{"type": "text", "text": "Приказ"}]},
            {
                "type": "paragraph",
                "content": [
                    {"type": "text", "text": "Сотрудник: "},
                    {
                        "type": "templateField",
                        "attrs": {
                            "id": "field-1",
                            "fieldKey": "employee.full_name",
                            "label": "ФИО сотрудника",
                            "jinja": "{{ employee.full_name }}",
                            "groupId": None,
                            "required": True,
                            "fieldType": "string",
                        },
                    },
                    {"type": "text", "text": ". Дата приказа: "},
                    {
                        "type": "templateField",
                        "attrs": {
                            "id": "field-2",
                            "fieldKey": "order.date",
                            "label": "Дата приказа",
                            "jinja": "{{ order.date }}",
                            "groupId": None,
                            "required": True,
                            "fieldType": "date",
                        },
                    },
                ],
            },
        ],
    }


def test_create_update_validate_template(tmp_path: Path) -> None:
    client = _client(tmp_path)
    create_response = client.post(
        "/api/templates",
        json={"name": "Приказ отпуск", "document_type": "order_vacation", "editor_json": _editor_json()},
    )

    assert create_response.status_code == 201
    template_id = create_response.json()["id"]

    update_response = client.put(
        f"/api/templates/{template_id}",
        json={"name": "Приказ отпуск v2", "editor_json": _editor_json()},
        headers={"X-User-Id": "42"},
    )
    assert update_response.status_code == 200
    assert update_response.json()["name"] == "Приказ отпуск v2"
    assert update_response.json()["updated_by"] == "42"

    validation_response = client.post(f"/api/templates/{template_id}/validate")
    assert validation_response.status_code == 200
    validation = validation_response.json()
    assert validation["valid"] is True
    assert "employee.full_name" in validation["used_fields"]
    assert "order.date" in validation["used_fields"]
    assert validation["missing_required_fields"]


def test_validation_reports_unknown_fields(tmp_path: Path) -> None:
    client = _client(tmp_path)
    editor_json = _editor_json()
    editor_json["content"][1]["content"][1]["attrs"]["fieldKey"] = "employee.unknown"
    editor_json["content"][1]["content"][1]["attrs"]["jinja"] = "{{ employee.unknown }}"

    create_response = client.post(
        "/api/templates",
        json={"name": "Bad", "document_type": "order_vacation", "editor_json": editor_json},
    )
    template_id = create_response.json()["id"]

    validation_response = client.post(f"/api/templates/{template_id}/validate")

    assert validation_response.status_code == 200
    data = validation_response.json()
    assert data["valid"] is False
    assert data["errors"][0]["code"] == "unknown_field"


def test_publish_blocks_missing_required_fields(tmp_path: Path) -> None:
    client = _client(tmp_path)
    create_response = client.post(
        "/api/templates",
        json={"name": "Incomplete", "document_type": "order_vacation", "editor_json": _editor_json()},
    )
    template_id = create_response.json()["id"]

    publish_response = client.post(f"/api/templates/{template_id}/publish")

    assert publish_response.status_code == 422
    detail = publish_response.json()["detail"]
    assert any(issue["code"] == "missing_required_field" for issue in detail)


def test_exported_docx_contains_jinja_and_rendered_docx_resolves_it(tmp_path: Path) -> None:
    os.environ["TEMPLATE_DB_PATH"] = str(tmp_path / "templates.db")
    store = TemplateStore()
    template = store.create(
        payload=TemplateCreateRequest(
            name="Render",
            document_type="order_vacation",
            editor_json=_editor_json(),
            field_manifest=[],
        ),
        actor_user_id="tester",
    )

    exported = export_template_docx(template)
    exported_xml = _docx_xml(exported)
    assert "{{ employee.full_name }}" in exported_xml
    assert "{{ order.date }}" in exported_xml

    rendered = render_template_docx(template, exported)
    rendered_xml = _docx_xml(rendered)
    assert "{{ employee.full_name }}" not in rendered_xml
    assert "{{ order.date }}" not in rendered_xml
    assert "Иванов Иван Иванович" in rendered_xml
    assert "02.06.2026" in rendered_xml


def _docx_xml(path: Path) -> str:
    with zipfile.ZipFile(path) as archive:
        return archive.read("word/document.xml").decode("utf-8")

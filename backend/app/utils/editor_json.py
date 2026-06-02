from __future__ import annotations

from collections.abc import Iterator
from typing import Any

from app.schemas.templates import TemplateFieldInstance


SUPPORTED_NODE_TYPES = {
    "doc",
    "paragraph",
    "text",
    "heading",
    "bulletList",
    "orderedList",
    "listItem",
    "table",
    "tableRow",
    "tableCell",
    "tableHeader",
    "hardBreak",
    "templateField",
}


def default_editor_json() -> dict[str, Any]:
    return {
        "type": "doc",
        "content": [
            {
                "type": "heading",
                "attrs": {"level": 1},
                "content": [{"type": "text", "text": "Приказ"}],
            },
            {
                "type": "paragraph",
                "content": [
                    {"type": "text", "text": "Назначить сотрудника "},
                    {
                        "type": "templateField",
                        "attrs": {
                            "id": "seed-employee-full-name",
                            "fieldKey": "employee.full_name",
                            "label": "ФИО сотрудника",
                            "jinja": "{{ employee.full_name }}",
                            "groupId": None,
                            "required": True,
                            "fieldType": "string",
                        },
                    },
                    {"type": "text", "text": " ответственным по документу."},
                ],
            },
        ],
    }


def walk_nodes(node: dict[str, Any]) -> Iterator[dict[str, Any]]:
    yield node
    for child in node.get("content") or []:
        if isinstance(child, dict):
            yield from walk_nodes(child)


def node_text(node: dict[str, Any]) -> str:
    if node.get("type") == "text":
        return str(node.get("text") or "")
    if node.get("type") == "templateField":
        attrs = node.get("attrs") or {}
        return str(attrs.get("jinja") or "")
    return "".join(node_text(child) for child in node.get("content") or [] if isinstance(child, dict))


def editor_has_body(editor_json: dict[str, Any]) -> bool:
    return bool(node_text(editor_json).strip())


def extract_field_manifest(editor_json: dict[str, Any]) -> list[TemplateFieldInstance]:
    counts: dict[str, int] = {}
    instances: list[TemplateFieldInstance] = []
    for node in walk_nodes(editor_json):
        if node.get("type") != "templateField":
            continue
        attrs = node.get("attrs") or {}
        field_key = str(attrs.get("fieldKey") or "")
        if not field_key:
            continue
        counts[field_key] = counts.get(field_key, 0) + 1
        instances.append(
            TemplateFieldInstance(
                id=str(attrs.get("id") or f"{field_key}-{counts[field_key]}"),
                field_key=field_key,
                label=str(attrs.get("label") or field_key),
                jinja=str(attrs.get("jinja") or "{{ " + field_key + " }}"),
                group_id=attrs.get("groupId"),
                occurrence_index=counts[field_key],
                required=bool(attrs.get("required") or False),
                field_type=attrs.get("fieldType") or "string",
            )
        )
    return instances


def unsupported_node_types(editor_json: dict[str, Any]) -> list[str]:
    found = {str(node.get("type")) for node in walk_nodes(editor_json) if node.get("type")}
    return sorted(found - SUPPORTED_NODE_TYPES)


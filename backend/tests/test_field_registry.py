from fastapi.testclient import TestClient

from app.main import app
from app.services.field_registry import get_field_registry


client = TestClient(app)


def test_registry_returns_grouped_fields() -> None:
    response = client.get("/api/templates/fields", params={"document_type": "order_vacation"})

    assert response.status_code == 200
    data = response.json()
    assert data["document_type"] == "order_vacation"
    fields = [field for group in data["groups"] for field in group["fields"]]
    field_keys = {field["key"] for field in fields}
    assert "employee.full_name" in field_keys
    assert "vacation.start_date" in field_keys
    assert "substitute.position" in field_keys


def test_unknown_document_type_returns_clear_error() -> None:
    response = client.get("/api/templates/fields", params={"document_type": "unknown"})

    assert response.status_code == 404
    assert "Unknown document_type" in response.json()["detail"]


def test_all_registry_fields_have_required_metadata() -> None:
    registry = get_field_registry("order_vacation")

    for group in registry.groups:
        assert group.key
        assert group.label
        for field in group.fields:
            assert field.key
            assert field.label
            assert field.type
            assert field.jinja == "{{ " + field.key + " }}"


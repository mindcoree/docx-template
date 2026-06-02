from __future__ import annotations

from collections import defaultdict
from typing import Any

from app.schemas.templates import TemplateField, TemplateFieldGroup, TemplateFieldRegistryResponse


SUPPORTED_DOCUMENT_TYPES = {
    "order_vacation": "Приказ на отпуск",
    "employment_contract": "Трудовой договор",
    "order_termination": "Приказ на увольнение",
}


def _field(
    key: str,
    label: str,
    field_type: str,
    required: bool,
    sample: Any,
    group: str,
    document_types: list[str] | None = None,
    description: str | None = None,
    allowed_values: list[str] | None = None,
) -> TemplateField:
    return TemplateField(
        key=key,
        label=label,
        type=field_type,  # type: ignore[arg-type]
        required=required,
        jinja="{{ " + key + " }}",
        sample=sample,
        group=group,
        document_types=document_types,
        description=description,
        allowed_values=allowed_values,
    )


FIELD_GROUP_LABELS = {
    "employee": "Сотрудник",
    "company": "Компания",
    "order": "Приказ",
    "vacation": "Отпуск",
    "substitute": "Замещающий сотрудник",
}


FIELDS: list[TemplateField] = [
    _field("employee.full_name", "ФИО сотрудника", "string", True, "Иванов Иван Иванович", "employee"),
    _field("employee.position", "Должность сотрудника", "string", True, "Инженер ПТО", "employee"),
    _field("employee.department", "Подразделение", "string", False, "Производственно-технический отдел", "employee"),
    _field("employee.iin", "ИИН сотрудника", "string", True, "990101300123", "employee"),
    _field("employee.hire_date", "Дата приема", "date", False, "15.03.2021", "employee"),
    _field("company.name", "Название компании", "string", True, "ТОО «GMS Kazakhstan»", "company"),
    _field("company.bin", "БИН компании", "string", True, "123456789012", "company"),
    _field("order.number", "Номер приказа", "string", True, "№ 12-к", "order"),
    _field("order.date", "Дата приказа", "date", True, "02.06.2026", "order"),
    _field("order.reason", "Основание приказа", "string", False, "Заявление сотрудника", "order"),
    _field("order.created_by", "Подготовил", "string", False, "Айгуль Смагулова", "order"),
    _field("order.signer_name", "Подписант", "string", True, "Петров Петр Петрович", "order"),
    _field("order.signer_position", "Должность подписанта", "string", True, "Директор", "order"),
    _field(
        "vacation.start_date",
        "Дата начала отпуска",
        "date",
        True,
        "10.06.2026",
        "vacation",
        ["order_vacation"],
    ),
    _field(
        "vacation.end_date",
        "Дата окончания отпуска",
        "date",
        True,
        "24.06.2026",
        "vacation",
        ["order_vacation"],
    ),
    _field(
        "vacation.days_count",
        "Количество дней",
        "number",
        True,
        14,
        "vacation",
        ["order_vacation"],
    ),
    _field(
        "substitute.full_name",
        "ФИО замещающего",
        "string",
        False,
        "Сидорова Мария Сергеевна",
        "substitute",
        ["order_vacation"],
    ),
    _field(
        "substitute.position",
        "Должность замещающего",
        "string",
        False,
        "Ведущий инженер",
        "substitute",
        ["order_vacation"],
    ),
]


class UnknownDocumentTypeError(ValueError):
    pass


def get_field_registry(document_type: str) -> TemplateFieldRegistryResponse:
    if document_type not in SUPPORTED_DOCUMENT_TYPES:
        supported = ", ".join(sorted(SUPPORTED_DOCUMENT_TYPES))
        raise UnknownDocumentTypeError(f"Unknown document_type '{document_type}'. Supported: {supported}")

    grouped: dict[str, list[TemplateField]] = defaultdict(list)
    for field in FIELDS:
        if field.document_types is None or document_type in field.document_types:
            grouped[field.group or "other"].append(field)

    groups = [
        TemplateFieldGroup(
            key=group_key,
            label=FIELD_GROUP_LABELS.get(group_key, group_key),
            fields=fields,
        )
        for group_key, fields in grouped.items()
    ]
    return TemplateFieldRegistryResponse(document_type=document_type, groups=groups)


def flatten_registry(document_type: str) -> dict[str, TemplateField]:
    registry = get_field_registry(document_type)
    return {field.key: field for group in registry.groups for field in group.fields}


def sample_context(document_type: str) -> dict[str, Any]:
    context: dict[str, Any] = {}
    for field in flatten_registry(document_type).values():
        current = context
        parts = field.key.split(".")
        for part in parts[:-1]:
            current = current.setdefault(part, {})
        current[parts[-1]] = field.sample
    return context


from __future__ import annotations

from collections import defaultdict

from jinja2 import Environment, TemplateSyntaxError

from app.schemas.templates import TemplateRecord, TemplateValidationIssue, TemplateValidationResponse
from app.services.field_registry import flatten_registry
from app.utils.editor_json import editor_has_body, extract_field_manifest, unsupported_node_types


def validate_template(template: TemplateRecord) -> TemplateValidationResponse:
    errors: list[TemplateValidationIssue] = []
    warnings: list[TemplateValidationIssue] = []

    registry = flatten_registry(template.document_type)
    manifest = extract_field_manifest(template.editor_json)
    used_fields = sorted({item.field_key for item in manifest})

    if not editor_has_body(template.editor_json):
        errors.append(
            TemplateValidationIssue(
                code="empty_template_body",
                message="Шаблон пустой. Добавьте текст документа или поля.",
            )
        )

    for field in manifest:
        if field.field_key not in registry:
            errors.append(
                TemplateValidationIssue(
                    code="unknown_field",
                    message=f"Поле `{field.field_key}` не найдено в реестре для типа документа.",
                    field_key=field.field_key,
                )
            )
        _validate_jinja(field.jinja, field.field_key, errors)

    required_fields = {key for key, field in registry.items() if field.required}
    missing = sorted(required_fields - set(used_fields))
    for field_key in missing:
        warnings.append(
            TemplateValidationIssue(
                code="missing_required_field",
                message=f"Обязательное поле `{field_key}` не вставлено в шаблон.",
                severity="warning",
                field_key=field_key,
            )
        )

    group_fields: dict[str, set[str]] = defaultdict(set)
    for field in manifest:
        if field.group_id:
            group_fields[field.group_id].add(field.field_key)
    for group_id, field_keys in group_fields.items():
        if len(field_keys) > 1:
            errors.append(
                TemplateValidationIssue(
                    code="broken_group_id",
                    message=f"Связанная группа `{group_id}` содержит разные поля: {', '.join(sorted(field_keys))}.",
                )
            )

    for node_type in unsupported_node_types(template.editor_json):
        errors.append(
            TemplateValidationIssue(
                code="unsupported_node",
                message=f"Тип блока `{node_type}` пока не поддерживается в DOCX export MVP.",
            )
        )

    return TemplateValidationResponse(
        template_id=template.id,
        valid=not errors,
        errors=errors,
        warnings=warnings,
        used_fields=used_fields,
        missing_required_fields=missing,
    )


def _validate_jinja(jinja: str, field_key: str, errors: list[TemplateValidationIssue]) -> None:
    environment = Environment(autoescape=False)
    try:
        environment.parse(jinja)
    except TemplateSyntaxError as exc:
        errors.append(
            TemplateValidationIssue(
                code="invalid_jinja",
                message=f"Некорректный Jinja для `{field_key}`: {exc.message}.",
                field_key=field_key,
            )
        )


from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


FieldType = Literal["string", "date", "number", "boolean", "enum", "object", "list"]
TemplateStatus = Literal["draft", "published", "archived"]
ValidationSeverity = Literal["error", "warning"]


class TemplateField(BaseModel):
    key: str
    label: str
    type: FieldType
    required: bool
    jinja: str
    sample: Any
    description: str | None = None
    group: str | None = None
    allowed_values: list[str] | None = None
    document_types: list[str] | None = None


class TemplateFieldGroup(BaseModel):
    key: str
    label: str
    fields: list[TemplateField]


class TemplateFieldRegistryResponse(BaseModel):
    document_type: str
    groups: list[TemplateFieldGroup]


class TemplateFieldInstance(BaseModel):
    id: str
    field_key: str
    label: str
    jinja: str
    group_id: str | None = None
    occurrence_index: int = 1
    required: bool = False
    field_type: FieldType = "string"


class TemplateCreateRequest(BaseModel):
    name: str = Field(min_length=1)
    document_type: str
    editor_json: dict[str, Any] | None = None
    editor_html: str | None = None
    field_manifest: list[TemplateFieldInstance] = Field(default_factory=list)


class TemplateUpdateRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1)
    document_type: str | None = None
    editor_json: dict[str, Any] | None = None
    editor_html: str | None = None
    field_manifest: list[TemplateFieldInstance] | None = None
    status: TemplateStatus | None = None


class TemplateRecord(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    document_type: str
    status: TemplateStatus
    editor_json: dict[str, Any]
    editor_html: str | None = None
    field_manifest: list[TemplateFieldInstance] = Field(default_factory=list)
    original_docx_path: str | None = None
    exported_docx_path: str | None = None
    preview_pdf_path: str | None = None
    version: int
    created_by: str
    updated_by: str
    created_at: datetime
    updated_at: datetime


class TemplateListResponse(BaseModel):
    items: list[TemplateRecord]


class TemplateValidationIssue(BaseModel):
    code: str
    message: str
    severity: ValidationSeverity = "error"
    field_key: str | None = None


class TemplateValidationResponse(BaseModel):
    template_id: str
    valid: bool
    errors: list[TemplateValidationIssue] = Field(default_factory=list)
    warnings: list[TemplateValidationIssue] = Field(default_factory=list)
    used_fields: list[str] = Field(default_factory=list)
    missing_required_fields: list[str] = Field(default_factory=list)


class TemplateRenderPreviewResponse(BaseModel):
    template_id: str
    status: Literal["ready"]
    pdf_url: str


class TemplateUploadResponse(BaseModel):
    template_id: str
    original_docx_path: str
    extracted_fields: list[str]
    unknown_fields: list[str]
    warning: str


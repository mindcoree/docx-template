from __future__ import annotations

import tempfile
from pathlib import Path
from typing import Literal

from fastapi import APIRouter, Depends, File, Header, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse

from app.schemas.templates import (
    TemplateCreateRequest,
    TemplateListResponse,
    TemplateRecord,
    TemplateRenderPreviewResponse,
    TemplateUpdateRequest,
    TemplateUploadResponse,
    TemplateValidationResponse,
)
from app.services.docx_service import (
    extract_placeholders_from_docx,
    export_template_docx,
    render_template_docx,
    store_uploaded_docx,
    template_dir,
    unknown_placeholders,
)
from app.services.field_registry import UnknownDocumentTypeError, get_field_registry
from app.services.gotenberg import GotenbergConversionError, GotenbergUnavailableError, convert_docx_to_pdf
from app.services.template_store import TemplateNotFoundError, TemplateStore, get_template_store
from app.services.template_validation import validate_template


router = APIRouter()


def actor_user_id(x_user_id: str | None = Header(default=None, alias="X-User-Id")) -> str:
    return x_user_id or "system"


def store_dependency() -> TemplateStore:
    return get_template_store()


@router.get("/fields")
def fields(document_type: str = Query(...)):
    try:
        return get_field_registry(document_type)
    except UnknownDocumentTypeError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("", response_model=TemplateRecord, status_code=201)
def create_template(
    payload: TemplateCreateRequest,
    store: TemplateStore = Depends(store_dependency),
    user_id: str = Depends(actor_user_id),
) -> TemplateRecord:
    _assert_document_type(payload.document_type)
    return store.create(payload, user_id)


@router.get("", response_model=TemplateListResponse)
def list_templates(store: TemplateStore = Depends(store_dependency)) -> TemplateListResponse:
    return TemplateListResponse(items=store.list())


@router.get("/{template_id}", response_model=TemplateRecord)
def get_template(template_id: str, store: TemplateStore = Depends(store_dependency)) -> TemplateRecord:
    return _get_or_404(store, template_id)


@router.put("/{template_id}", response_model=TemplateRecord)
def update_template(
    template_id: str,
    payload: TemplateUpdateRequest,
    store: TemplateStore = Depends(store_dependency),
    user_id: str = Depends(actor_user_id),
) -> TemplateRecord:
    if payload.document_type:
        _assert_document_type(payload.document_type)
    _get_or_404(store, template_id)
    return store.update(template_id, payload, user_id)


@router.post("/{template_id}/validate", response_model=TemplateValidationResponse)
def validate(template_id: str, store: TemplateStore = Depends(store_dependency)) -> TemplateValidationResponse:
    template = _get_or_404(store, template_id)
    return validate_template(template)


@router.post("/{template_id}/publish", response_model=TemplateRecord)
def publish(
    template_id: str,
    store: TemplateStore = Depends(store_dependency),
    user_id: str = Depends(actor_user_id),
) -> TemplateRecord:
    template = _get_or_404(store, template_id)
    validation = validate_template(template)
    if not validation.valid or validation.missing_required_fields:
        issues = validation.errors + validation.warnings
        raise HTTPException(status_code=422, detail=[issue.model_dump() for issue in issues])
    render_template_docx(template, export_template_docx(template))
    return store.publish(template_id, user_id)


@router.get("/{template_id}/download")
def download(
    template_id: str,
    format: Literal["docx", "pdf"] = Query("docx"),
    store: TemplateStore = Depends(store_dependency),
):
    template = _get_or_404(store, template_id)
    if format == "docx":
        path = export_template_docx(template)
        store.update_paths(template_id, exported_docx_path=str(path))
        return FileResponse(
            path,
            filename=f"{template.name}.docx",
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        )

    if not template.preview_pdf_path:
        raise HTTPException(status_code=404, detail="PDF preview has not been generated yet.")
    pdf_path = Path(template.preview_pdf_path)
    if not pdf_path.exists():
        raise HTTPException(status_code=404, detail="PDF preview file is missing.")
    return FileResponse(pdf_path, filename=f"{template.name}.pdf", media_type="application/pdf")


@router.post("/{template_id}/render-preview", response_model=TemplateRenderPreviewResponse)
def render_preview(
    template_id: str,
    store: TemplateStore = Depends(store_dependency),
) -> TemplateRenderPreviewResponse:
    template = _get_or_404(store, template_id)
    validation = validate_template(template)
    if not validation.valid:
        raise HTTPException(status_code=422, detail=[issue.model_dump() for issue in validation.errors])

    template_docx = export_template_docx(template)
    rendered_docx = render_template_docx(template, template_docx)
    pdf_path = template_dir(template_id) / "preview.pdf"
    try:
        convert_docx_to_pdf(rendered_docx, pdf_path)
    except GotenbergUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except GotenbergConversionError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    store.update_paths(template_id, exported_docx_path=str(template_docx), preview_pdf_path=str(pdf_path))
    return TemplateRenderPreviewResponse(template_id=template_id, status="ready", pdf_url=f"/api/templates/{template_id}/download?format=pdf")


@router.post("/{template_id}/upload-docx", response_model=TemplateUploadResponse)
async def upload_docx(
    template_id: str,
    file: UploadFile = File(...),
    store: TemplateStore = Depends(store_dependency),
) -> TemplateUploadResponse:
    template = _get_or_404(store, template_id)
    if not file.filename or not file.filename.lower().endswith(".docx"):
        raise HTTPException(status_code=400, detail="Only .docx files are accepted.")
    if file.filename.lower().endswith(".docm"):
        raise HTTPException(status_code=400, detail="Macro-enabled .docm files are not accepted.")

    content = await file.read()
    max_size = 15 * 1024 * 1024
    if len(content) > max_size:
        raise HTTPException(status_code=413, detail="DOCX file is too large.")

    with tempfile.NamedTemporaryFile(suffix=".docx", delete=False) as tmp:
        tmp.write(content)
        tmp_path = Path(tmp.name)

    original_path = store_uploaded_docx(template, tmp_path)
    placeholders = extract_placeholders_from_docx(original_path)
    unknown = unknown_placeholders(template, placeholders)
    store.update_paths(template_id, original_docx_path=str(original_path))
    return TemplateUploadResponse(
        template_id=template_id,
        original_docx_path=str(original_path),
        extracted_fields=placeholders,
        unknown_fields=unknown,
        warning="Импорт DOCX выполнен в режиме упрощенного редактирования. Сложная верстка может отличаться.",
    )


def _get_or_404(store: TemplateStore, template_id: str) -> TemplateRecord:
    try:
        return store.get(template_id)
    except TemplateNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Template not found.") from exc


def _assert_document_type(document_type: str) -> None:
    try:
        get_field_registry(document_type)
    except UnknownDocumentTypeError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

from __future__ import annotations

import os
from pathlib import Path

import httpx


class GotenbergUnavailableError(RuntimeError):
    pass


class GotenbergConversionError(RuntimeError):
    pass


def convert_docx_to_pdf(docx_path: Path, pdf_path: Path) -> Path:
    base_url = os.environ.get("GOTENBERG_URL", "").rstrip("/")
    if not base_url:
        raise GotenbergUnavailableError("GOTENBERG_URL is not configured.")

    endpoint = f"{base_url}/forms/libreoffice/convert"
    with docx_path.open("rb") as file_handle:
        files = {"files": (docx_path.name, file_handle, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")}
        response = httpx.post(endpoint, files=files, timeout=60)
    if response.status_code >= 400:
        raise GotenbergConversionError(f"Gotenberg conversion failed with HTTP {response.status_code}.")

    pdf_path.write_bytes(response.content)
    return pdf_path


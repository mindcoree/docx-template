from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.templates import router as templates_router


app = FastAPI(
    title="GMS Template Builder API",
    version="0.1.0",
    description="Original internal template builder API for HR and ERP documents.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(templates_router, prefix="/api/templates", tags=["templates"])


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


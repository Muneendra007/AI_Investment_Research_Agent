"""FastAPI HTTP & SSE microservice for Document RAG and the Microsoft Agent Framework Committee."""

from __future__ import annotations

import json
import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import AsyncIterator

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import StreamingResponse

from committee_service.config import Settings, get_settings
from committee_service.llm_factory import ChatClientFactory, DefaultChatClientFactory
from committee_service.models import CommitteeRunRequest
from committee_service.rag import DocumentVectorStore
from committee_service.workflow import stream_committee_events

logger = logging.getLogger(__name__)


def create_app(
    *,
    settings: Settings | None = None,
    vector_store: DocumentVectorStore | None = None,
    client_factory: ChatClientFactory | None = None,
) -> FastAPI:
    """Create the FastAPI application with injectable store & LLM factory for testing."""
    app_settings = settings or get_settings()
    owns_store = vector_store is None
    store_holder: dict[str, DocumentVectorStore] = {}
    if vector_store is not None:
        store_holder["store"] = vector_store

    factory = client_factory or DefaultChatClientFactory()

    @asynccontextmanager
    async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
        if "store" not in store_holder:
            store_holder["store"] = DocumentVectorStore(settings=app_settings)
        try:
            yield
        finally:
            if owns_store and "store" in store_holder:
                store_holder["store"].close()

    app = FastAPI(
        title="AuraInvest Debate Committee Service",
        version="1.0.0",
        lifespan=lifespan,
    )

    def _get_store() -> DocumentVectorStore:
        if "store" not in store_holder:
            store_holder["store"] = DocumentVectorStore(settings=app_settings)
        return store_holder["store"]

    @app.get("/health")
    async def health() -> dict[str, str]:
        return {"status": "ok", "framework": "microsoft-agent-framework"}

    @app.get("/documents")
    async def list_documents():
        docs = _get_store().list_documents()
        return {"documents": [d.model_dump() for d in docs]}

    @app.post("/documents/upload")
    async def upload_document(file: UploadFile = File(...)):
        if not file.filename or not file.filename.lower().endswith(".pdf"):
            raise HTTPException(status_code=400, detail="Only PDF files are supported.")

        pdf_bytes = await file.read()
        if len(pdf_bytes) == 0:
            raise HTTPException(status_code=400, detail="Uploaded PDF file is empty.")
        if len(pdf_bytes) > 25 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="PDF file exceeds 25 MB limit.")

        try:
            record = _get_store().ingest_pdf(file.filename, pdf_bytes)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        except Exception as exc:
            logger.exception("Failed to ingest PDF")
            raise HTTPException(status_code=500, detail=f"PDF ingestion failed: {exc}") from exc

        return record.model_dump()

    @app.delete("/documents/{doc_id}")
    async def delete_document(doc_id: str):
        deleted = _get_store().delete_document(doc_id)
        if not deleted:
            raise HTTPException(status_code=404, detail=f"Document '{doc_id}' not found.")
        return {"deleted": True, "doc_id": doc_id}

    @app.post("/committee/run")
    async def run_committee(payload: CommitteeRunRequest):
        store = _get_store()

        async def event_stream() -> AsyncIterator[str]:
            sent_terminal_error = False
            try:
                async for evt in stream_committee_events(
                    request=payload,
                    vector_store=store,
                    client_factory=factory,
                ):
                    if evt.get("type") == "error":
                        sent_terminal_error = True
                    yield f"data: {json.dumps(evt)}\n\n"
            except Exception as exc:
                logger.exception("Investment Committee execution failed")
                if not sent_terminal_error:
                    err_evt = {
                        "type": "error",
                        "error": str(exc),
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                    }
                    yield f"data: {json.dumps(err_evt)}\n\n"

        return StreamingResponse(
            event_stream(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            },
        )

    return app


app = create_app()


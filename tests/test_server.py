"""FastAPI server integration tests for PDF upload, listing, deletion, and SSE committee stream."""

from __future__ import annotations

import json

from fastapi.testclient import TestClient

from committee_service.rag import DocumentVectorStore
from committee_service.server import create_app
from tests.conftest import ScriptedChatClientFactory, ScriptedCommitteeChatClient
from tests.pdf_helpers import build_multipage_pdf


def test_fastapi_document_lifecycle_and_committee_sse_stream(
    vector_store: DocumentVectorStore,
) -> None:
    mock_client = ScriptedCommitteeChatClient(judge_recommendation="BUY")
    app = create_app(
        vector_store=vector_store,
        client_factory=ScriptedChatClientFactory(mock_client),
    )

    with TestClient(app) as client:
        # 1. Health check
        health = client.get("/health")
        assert health.status_code == 200
        assert health.json()["framework"] == "microsoft-agent-framework"

        # 2. Reject non-PDF uploads
        bad_upload = client.post(
            "/documents/upload",
            files={"file": ("notes.txt", b"plain text", "text/plain")},
        )
        assert bad_upload.status_code == 400

        # 3. Upload valid multi-page PDF
        pdf_bytes = build_multipage_pdf([
            "Acme Corp Financial Highlights: Revenue reached $4.2B (+22% YoY).",
            "Acme Corp Debt & Risk: Total debt is $3.1B with ongoing patent litigation.",
        ])
        upload = client.post(
            "/documents/upload",
            files={"file": ("acme_report.pdf", pdf_bytes, "application/pdf")},
        )
        assert upload.status_code == 200
        doc = upload.json()
        assert doc["filename"] == "acme_report.pdf"
        assert doc["page_count"] == 2
        doc_id = doc["doc_id"]

        # 4. List documents
        listed = client.get("/documents")
        assert listed.status_code == 200
        assert len(listed.json()["documents"]) == 1

        # 5. Stream Investment Committee run via SSE
        with client.stream(
            "POST",
            "/committee/run",
            json={
                "company_name": "Acme Corp",
                "query": "Evaluate financials and risk",
                "doc_ids": [doc_id],
                "risk_veto_threshold": 70,
            },
        ) as sse:
            assert sse.status_code == 200
            events = []
            for raw_line in sse.iter_lines():
                if raw_line.startswith("data: "):
                    events.append(json.loads(raw_line[6:]))

        final_events = [e for e in events if e["type"] == "final_report"]
        assert len(final_events) == 1
        report = final_events[0]["report"]
        assert report["company_name"] == "Acme Corp"
        assert report["final_decision"] == "BUY"
        assert report["citation_map"]["C1"]["document_name"] == "acme_report.pdf"

        # 6. Delete document and verify 404 on second delete
        deleted = client.delete(f"/documents/{doc_id}")
        assert deleted.status_code == 200
        assert client.delete(f"/documents/{doc_id}").status_code == 404


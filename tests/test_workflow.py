"""End-to-end tests for the Microsoft Agent Framework 8-stage debate workflow."""

from __future__ import annotations

import pytest

from committee_service.models import CommitteeRunRequest
from committee_service.rag import DocumentVectorStore
from committee_service.workflow import run_committee_workflow, stream_committee_events
from tests.conftest import ScriptedChatClientFactory, ScriptedCommitteeChatClient
from tests.pdf_helpers import build_multipage_pdf


def _ingest_sample_acme_pdf(vector_store: DocumentVectorStore) -> str:
    pdf_bytes = build_multipage_pdf([
        "Acme Corp FY2026 Report: Annual revenue reached $4.2B (+22% YoY) with 18% operating margin and 74% recurring revenue.",
        "Acme Corp Growth Strategy: Enterprise AI cloud backlog grew 35% YoY across North America.",
        "Acme Corp Risk & Debt Note: Long-term debt rose to $3.1B alongside an ongoing European patent lawsuit.",
    ])
    record = vector_store.ingest_pdf("acme_fy2026.pdf", pdf_bytes)
    return record.doc_id


@pytest.mark.asyncio
async def test_complete_debate_workflow_order_concurrency_and_citation_traceability(
    vector_store: DocumentVectorStore,
) -> None:
    doc_id = _ingest_sample_acme_pdf(vector_store)
    client = ScriptedCommitteeChatClient(
        judge_recommendation="BUY",
        risk_scores={
            "financial_leverage_risk": 10,
            "operational_execution_risk": 8,
            "regulatory_legal_governance_risk": 8,
            "market_competitive_risk": 7,
            "evidence_uncertainty_risk": 5,
        },
        delay_seconds=0.05,
    )

    request = CommitteeRunRequest(
        company_name="Acme Corp",
        query="Assess growth, leverage, and patent litigation risks",
        doc_ids=[doc_id],
        risk_veto_threshold=70,
    )

    report = await run_committee_workflow(
        request=request,
        vector_store=vector_store,
        client_factory=ScriptedChatClientFactory(client),
    )

    # 1. Non-veto case: Risk score 38 < 70 preserves Judge's BUY decision
    assert report.judge_evaluation.recommendation == "BUY"
    assert report.risk_assessment.risk_score == 38
    assert report.veto_triggered is False
    assert report.final_decision == "BUY"

    # 2. Verify exact 8-step Microsoft Agent Framework execution trace order
    trace_ids = [t.agent_id for t in report.execution_trace]
    assert trace_ids[0] == "research"
    assert set(trace_ids[1:3]) == {"bull", "bear"}
    assert trace_ids[3:] == ["exchange", "rebuttal", "judge", "risk", "enforcement", "report"]

    # 3. Verify Bull and Bear ran concurrently in the fan-out superstep
    assert client.max_concurrent_calls >= 2

    # 4. Verify Risk Agent did NOT see Judge's recommendation in its prompt
    risk_call = next(c for c in client.calls if c["role"] == "risk")
    assert "You have NOT been given any Bull, Bear, or Judge recommendation" in risk_call["prompt"]
    assert "Judge Agent" not in risk_call["prompt"]

    # 5. Verify full citation traceability from final decision back to PDF document & page numbers
    assert len(report.citation_map) >= 1
    for cid in report.judge_evaluation.cited_evidence_ids:
        cit = report.citation_map[cid]
        assert cit.document_name == "acme_fy2026.pdf"
        assert cit.page_number in {1, 2, 3}
        assert len(cit.excerpt) > 0


@pytest.mark.asyncio
async def test_workflow_risk_veto_overrides_judge_to_hold(
    vector_store: DocumentVectorStore,
) -> None:
    doc_id = _ingest_sample_acme_pdf(vector_store)
    client = ScriptedCommitteeChatClient(
        judge_recommendation="BUY",
        risk_scores={
            "financial_leverage_risk": 24,
            "operational_execution_risk": 18,
            "regulatory_legal_governance_risk": 19,
            "market_competitive_risk": 15,
            "evidence_uncertainty_risk": 10,
        },
    )

    report = await run_committee_workflow(
        request=CommitteeRunRequest(
            company_name="Acme Corp",
            doc_ids=[doc_id],
            risk_veto_threshold=70,
        ),
        vector_store=vector_store,
        client_factory=ScriptedChatClientFactory(client),
    )

    assert report.judge_evaluation.recommendation == "BUY"
    assert report.risk_assessment.risk_score == 86
    assert report.veto_triggered is True
    assert report.final_decision == "HOLD"
    assert "RISK VETO TRIGGERED" in report.decision_enforcement.veto_explanation


@pytest.mark.asyncio
async def test_workflow_handles_missing_documents_without_hallucinating(
    vector_store: DocumentVectorStore,
) -> None:
    client = ScriptedCommitteeChatClient(judge_recommendation="BUY")

    report = await run_committee_workflow(
        request=CommitteeRunRequest(
            company_name="Unknown Private Co",
            doc_ids=[],
            risk_veto_threshold=70,
        ),
        vector_store=vector_store,
        client_factory=ScriptedChatClientFactory(client),
    )

    assert report.research.insufficient_evidence is True
    assert report.citation_map == {}
    assert report.judge_evaluation.evidence_sufficiency == "insufficient"
    assert report.judge_evaluation.recommendation == "HOLD"
    assert report.final_decision == "HOLD"


@pytest.mark.asyncio
async def test_streaming_workflow_emits_stage_and_final_report_events(
    vector_store: DocumentVectorStore,
) -> None:
    doc_id = _ingest_sample_acme_pdf(vector_store)
    client = ScriptedCommitteeChatClient(judge_recommendation="AVOID")

    events = [
        evt
        async for evt in stream_committee_events(
            request=CommitteeRunRequest(company_name="Acme Corp", doc_ids=[doc_id], risk_veto_threshold=80),
            vector_store=vector_store,
            client_factory=ScriptedChatClientFactory(client),
        )
    ]

    completed_stages = [e["stage"] for e in events if e["type"] == "stage_complete"]
    assert completed_stages == [
        "research",
        "bull_bear",
        "exchange",
        "rebuttal",
        "judge",
        "risk",
        "enforcement",
        "report",
    ]
    final_events = [e for e in events if e["type"] == "final_report"]
    assert len(final_events) == 1
    assert final_events[0]["report"]["final_decision"] == "AVOID"


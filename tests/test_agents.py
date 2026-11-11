"""Unit tests for each of the 6 Microsoft Agent Framework agents and deterministic veto."""

from __future__ import annotations

import pytest

from committee_service.agents import (
    create_bear_agent,
    create_bull_agent,
    create_judge_agent,
    create_rebuttal_agent,
    create_research_agent,
    create_risk_agent,
    enforce_risk_veto,
    run_bear_agent,
    run_bull_agent,
    run_judge_agent,
    run_rebuttal_stage,
    run_research_agent,
    run_risk_agent,
)
from committee_service.models import CitationRef
from tests.conftest import ScriptedCommitteeChatClient


SAMPLE_CITATIONS = [
    CitationRef(
        citation_id="C1",
        doc_id="doc_1",
        document_name="acme_q4.pdf",
        page_number=1,
        chunk_id="doc_1_p1_c0",
        excerpt="Revenue grew 22% YoY to $4.2B with 74% recurring enterprise revenue.",
        score=0.91,
    ),
    CitationRef(
        citation_id="C2",
        doc_id="doc_1",
        document_name="acme_q4.pdf",
        page_number=4,
        chunk_id="doc_1_p4_c0",
        excerpt="Long-term debt rose to $3.1B alongside an active European patent lawsuit.",
        score=0.87,
    ),
]


@pytest.mark.asyncio
async def test_research_agent_extracts_findings_and_strips_hallucinated_citations() -> None:
    client = ScriptedCommitteeChatClient(inject_fake_citation=True)
    agent = create_research_agent(client)
    warnings: list[str] = []

    dossier = await run_research_agent(
        agent=agent,
        company_name="Acme Corp",
        query="Evaluate financials and risks",
        citations=SAMPLE_CITATIONS,
        warnings_out=warnings,
    )

    assert dossier.insufficient_evidence is False
    assert len(dossier.financial_findings) == 1
    assert dossier.financial_findings[0].citation_ids == ["C1"]
    assert any("C999" in w for w in warnings)


@pytest.mark.asyncio
async def test_research_agent_handles_insufficient_evidence_honestly() -> None:
    client = ScriptedCommitteeChatClient()
    agent = create_research_agent(client)

    dossier = await run_research_agent(
        agent=agent,
        company_name="Missing Corp",
        query="",
        citations=[],
    )

    assert dossier.insufficient_evidence is True
    assert dossier.citations == []
    assert len(dossier.evidence_gaps) >= 1
    assert len(client.calls) == 0


@pytest.mark.asyncio
async def test_bull_and_bear_agents_generate_grounded_opposing_arguments() -> None:
    client = ScriptedCommitteeChatClient()
    dossier = await run_research_agent(
        create_research_agent(client), "Acme Corp", "", SAMPLE_CITATIONS
    )

    bull_brief = await run_bull_agent(create_bull_agent(client), dossier)
    bear_brief = await run_bear_agent(create_bear_agent(client), dossier)

    assert bull_brief.stance == "BUY"
    assert len(bull_brief.arguments) >= 1
    assert bull_brief.arguments[0].citation_ids == ["C1"]

    assert bear_brief.stance == "AVOID"
    assert len(bear_brief.arguments) >= 1
    assert bear_brief.arguments[0].citation_ids == ["C2"]


@pytest.mark.asyncio
async def test_rebuttal_agent_generates_both_sides_rebuttals() -> None:
    client = ScriptedCommitteeChatClient()
    dossier = await run_research_agent(
        create_research_agent(client), "Acme Corp", "", SAMPLE_CITATIONS
    )
    bull_brief = await run_bull_agent(create_bull_agent(client), dossier)
    bear_brief = await run_bear_agent(create_bear_agent(client), dossier)

    rebuttals = await run_rebuttal_stage(
        rebuttal_agent=create_rebuttal_agent(client),
        bull_agent=create_bull_agent(client),
        bear_agent=create_bear_agent(client),
        dossier=dossier,
        bull_brief=bull_brief,
        bear_brief=bear_brief,
    )

    assert rebuttals.bull_rebuttal.agent_name == "BullAgent"
    assert rebuttals.bull_rebuttal.responding_to == "BearAgent"
    assert len(rebuttals.bull_rebuttal.rebuttals) >= 1
    assert rebuttals.bull_rebuttal.rebuttals[0].citation_ids == ["C1"]

    assert rebuttals.bear_rebuttal.agent_name == "BearAgent"
    assert rebuttals.bear_rebuttal.responding_to == "BullAgent"
    assert len(rebuttals.bear_rebuttal.rebuttals) >= 1
    assert rebuttals.bear_rebuttal.rebuttals[0].citation_ids == ["C2"]


@pytest.mark.asyncio
async def test_judge_agent_evaluates_complete_debate_with_citations() -> None:
    client = ScriptedCommitteeChatClient(judge_recommendation="BUY")
    dossier = await run_research_agent(
        create_research_agent(client), "Acme Corp", "", SAMPLE_CITATIONS
    )
    bull_brief = await run_bull_agent(create_bull_agent(client), dossier)
    bear_brief = await run_bear_agent(create_bear_agent(client), dossier)
    rebuttals = await run_rebuttal_stage(
        create_rebuttal_agent(client),
        create_bull_agent(client),
        create_bear_agent(client),
        dossier,
        bull_brief,
        bear_brief,
    )

    evaluation = await run_judge_agent(
        create_judge_agent(client), dossier, bull_brief, bear_brief, rebuttals
    )

    assert evaluation.recommendation == "BUY"
    assert set(evaluation.cited_evidence_ids).issubset({"C1", "C2"})
    assert len(evaluation.cited_evidence_ids) >= 1


@pytest.mark.asyncio
async def test_risk_agent_scores_independently_across_five_criteria() -> None:
    scores = {
        "financial_leverage_risk": 22,
        "operational_execution_risk": 16,
        "regulatory_legal_governance_risk": 18,
        "market_competitive_risk": 14,
        "evidence_uncertainty_risk": 10,
    }
    client = ScriptedCommitteeChatClient(risk_scores=scores)
    dossier = await run_research_agent(
        create_research_agent(client), "Acme Corp", "", SAMPLE_CITATIONS
    )

    assessment = await run_risk_agent(create_risk_agent(client), dossier)

    assert assessment.risk_score == 80
    assert assessment.criteria_breakdown.total_score == 80
    assert assessment.key_risk_drivers[0].citation_ids == ["C2"]


def test_deterministic_risk_veto_boundary_and_override() -> None:
    from committee_service.models import RiskAssessment, RiskCriteriaBreakdown

    high_risk = RiskAssessment(
        risk_score=70,
        criteria_breakdown=RiskCriteriaBreakdown(
            financial_leverage_risk=20,
            operational_execution_risk=15,
            regulatory_legal_governance_risk=15,
            market_competitive_risk=12,
            evidence_uncertainty_risk=8,
        ),
        assessment_summary="High leverage risk.",
    )

    # Exact threshold (70 >= 70) forces BUY -> HOLD
    vetoed_buy = enforce_risk_veto("BUY", high_risk, risk_veto_threshold=70)
    assert vetoed_buy.veto_triggered is True
    assert vetoed_buy.final_decision == "HOLD"
    assert "70/100" in vetoed_buy.veto_explanation

    # Also forces AVOID -> HOLD when score >= threshold per spec
    vetoed_avoid = enforce_risk_veto("AVOID", high_risk, risk_veto_threshold=70)
    assert vetoed_avoid.veto_triggered is True
    assert vetoed_avoid.final_decision == "HOLD"

    # Below threshold (70 < 71) preserves Judge recommendation
    passed_buy = enforce_risk_veto("BUY", high_risk, risk_veto_threshold=71)
    assert passed_buy.veto_triggered is False
    assert passed_buy.final_decision == "BUY"

    passed_avoid = enforce_risk_veto("AVOID", high_risk, risk_veto_threshold=71)
    assert passed_avoid.veto_triggered is False
    assert passed_avoid.final_decision == "AVOID"


@pytest.mark.asyncio
async def test_structured_agent_recovers_via_json_fallback_on_schema_error() -> None:
    client = ScriptedCommitteeChatClient(fail_first_call=True)
    dossier = await run_research_agent(
        create_research_agent(client), "Acme Corp", "", SAMPLE_CITATIONS
    )
    assert dossier.insufficient_evidence is False
    assert len(dossier.financial_findings) == 1
    assert len(client.calls) == 1


@pytest.mark.asyncio
async def test_structured_agent_recovers_groq_failed_generation_and_compacts_schema() -> None:
    from types import SimpleNamespace
    from committee_service.agents import _compact_schema_hint, _recover_failed_generation, _RiskLLMOutput

    hint = _compact_schema_hint(_RiskLLMOutput)
    assert "financial_leverage_risk" in hint
    assert "int(0..25)" in hint
    assert len(hint) < 700

    valid_json = (
        '{"summary":"Acme grew 22% YoY.","financial_findings":[],"opportunities":[],'
        '"risks":[],"supporting_facts":[],"insufficient_evidence":false,"evidence_gaps":[]}'
    )
    wrapped = SimpleNamespace(
        inner_exception=SimpleNamespace(
            body={"error": {"code": "json_validate_failed", "failed_generation": valid_json}}
        )
    )
    from committee_service.agents import _ResearchLLMOutput

    recovered = _recover_failed_generation(wrapped, _ResearchLLMOutput)  # type: ignore[arg-type]
    assert recovered is not None
    assert recovered.summary == "Acme grew 22% YoY."


@pytest.mark.asyncio
async def test_structured_agent_retries_on_rate_limit_without_schema_fallback(monkeypatch) -> None:
    import json as _json
    from agent_framework import BaseChatClient, ChatResponse, Message

    class RateLimitThenOkClient(BaseChatClient):
        def __init__(self) -> None:
            super().__init__()
            self.attempts = 0
            self.prompts: list[str] = []

        async def _inner_get_response(self, *, messages, stream, options, **kwargs):
            self.attempts += 1
            self.prompts.append("\n".join(m.text for m in messages if m.text))
            if self.attempts == 1:
                raise RuntimeError("Error code: 429 - rate_limit_exceeded. Please try again in 0.01s.")
            payload = {
                "summary": "Recovered after rate limit wait.",
                "financial_findings": [],
                "opportunities": [],
                "risks": [],
                "supporting_facts": [],
                "insufficient_evidence": False,
                "evidence_gaps": [],
            }
            return ChatResponse(messages=[Message(role="assistant", contents=[_json.dumps(payload)])])

    sleep_calls: list[float] = []

    async def _fast_sleep(secs: float) -> None:
        sleep_calls.append(secs)

    monkeypatch.setattr("committee_service.agents.asyncio.sleep", _fast_sleep)
    client = RateLimitThenOkClient()
    dossier = await run_research_agent(
        create_research_agent(client), "Acme Corp", "", SAMPLE_CITATIONS
    )
    assert dossier.summary == "Recovered after rate limit wait."
    assert client.attempts == 2
    assert len(sleep_calls) == 1
    assert "Respond ONLY with a valid JSON object" not in client.prompts[1]

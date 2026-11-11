"""Shared test fixtures: deterministic embeddings and scripted MAF BaseChatClient."""

from __future__ import annotations

import asyncio
import json
from pathlib import Path
from typing import Any

import pytest
from agent_framework import BaseChatClient, ChatResponse, ChatResponseUpdate, Message

from committee_service.config import Settings
from committee_service.rag import DeterministicHashEmbeddingProvider, DocumentVectorStore


class ScriptedCommitteeChatClient(BaseChatClient):
    """Test double implementing Microsoft Agent Framework BaseChatClient.

    Records every agent invocation in order (plus concurrency overlap) and returns
    deterministic structured JSON payloads tailored to each committee role.
    """

    def __init__(
        self,
        *,
        judge_recommendation: str = "BUY",
        risk_scores: dict[str, int] | None = None,
        delay_seconds: float = 0.0,
        inject_fake_citation: bool = False,
        fail_first_call: bool = False,
    ) -> None:
        super().__init__()
        self.judge_recommendation = judge_recommendation
        self.risk_scores = risk_scores or {
            "financial_leverage_risk": 10,
            "operational_execution_risk": 8,
            "regulatory_legal_governance_risk": 7,
            "market_competitive_risk": 8,
            "evidence_uncertainty_risk": 5,
        }
        self.delay_seconds = delay_seconds
        self.inject_fake_citation = inject_fake_citation
        self.fail_first_call = fail_first_call
        self._failed_once = False
        self.calls: list[dict[str, Any]] = []
        self._active_calls = 0
        self.max_concurrent_calls = 0

    def _detect_role(self, messages: list[Message], options: dict[str, Any] | None = None) -> str:
        instructions = str((options or {}).get("instructions") or "")
        msg_text = "\n".join(m.text for m in messages if m.text)
        if "REBUTTAL ROUND" in msg_text and "Respond as Bull Agent" in msg_text:
            return "bull_rebuttal"
        if "REBUTTAL ROUND" in msg_text and "Respond as Bear Agent" in msg_text:
            return "bear_rebuttal"
        if "As RebuttalAgent" in msg_text or "You are the Rebuttal Agent" in instructions:
            return "rebuttal_moderator"
        if "You are the Research Agent" in instructions:
            return "research"
        if "You are the Bull Agent" in instructions:
            return "bull"
        if "You are the Bear Agent" in instructions:
            return "bear"
        if "You are the neutral Judge Agent" in instructions:
            return "judge"
        if "You are the mandatory, independent Risk Agent" in instructions:
            return "risk"
        return "unknown"

    def _build_payload(self, role: str, prompt_text: str) -> dict[str, Any]:
        # Pick the first available citation IDs found in the prompt
        c1 = "C1" if 'id="C1"' in prompt_text or "[Citations: C1" in prompt_text or "C1" in prompt_text else ""
        c2 = "C2" if 'id="C2"' in prompt_text or "C2" in prompt_text else c1
        has_evidence = 'id="C1"' in prompt_text or "C1" in prompt_text

        extra_bad = ["C999"] if self.inject_fake_citation and c1 else []
        cids1 = ([c1] if c1 else []) + extra_bad
        cids2 = [c2] if c2 else ([c1] if c1 else [])

        if role == "research":
            if not has_evidence:
                return {
                    "summary": "Insufficient documentary evidence for evaluation.",
                    "financial_findings": [],
                    "opportunities": [],
                    "risks": [],
                    "supporting_facts": [],
                    "insufficient_evidence": True,
                    "evidence_gaps": ["No relevant company financial disclosures found in uploaded documents."],
                }
            return {
                "summary": "Acme Corp generated strong revenue growth alongside rising debt service costs.",
                "financial_findings": [
                    {
                        "claim": "Annual revenue reached $4.2B (+22% YoY) with 18% operating margin.",
                        "category": "financial",
                        "citation_ids": cids1,
                    }
                ],
                "opportunities": [
                    {
                        "claim": "Enterprise AI cloud backlog grew 35% YoY.",
                        "category": "opportunity",
                        "citation_ids": cids2,
                    }
                ],
                "risks": [
                    {
                        "claim": "Long-term debt rose to $3.1B with an ongoing patent lawsuit.",
                        "category": "risk",
                        "citation_ids": cids2,
                    }
                ],
                "supporting_facts": [
                    {
                        "claim": "Recurring enterprise contracts account for 74% of revenue.",
                        "category": "fact",
                        "citation_ids": cids1,
                    }
                ],
                "insufficient_evidence": False,
                "evidence_gaps": [],
            }

        if role == "bull":
            return {
                "thesis": "Acme Corp offers compelling top-line growth and recurring margin expansion.",
                "arguments": [
                    {
                        "point": "Durable Revenue Acceleration",
                        "reasoning": "22% YoY revenue growth and 35% backlog expansion demonstrate strong demand.",
                        "citation_ids": cids1,
                    }
                ],
                "acknowledged_gaps": [] if has_evidence else ["Missing uploaded financial disclosures."],
            }

        if role == "bear":
            return {
                "thesis": "Rising leverage and legal headwinds threaten equity returns.",
                "arguments": [
                    {
                        "point": "Leverage and Litigation Overhang",
                        "reasoning": "$3.1B debt load combined with active patent litigation creates downside risk.",
                        "citation_ids": cids2,
                    }
                ],
                "acknowledged_gaps": [] if has_evidence else ["Missing uploaded financial disclosures."],
            }

        if role == "bull_rebuttal":
            return {
                "summary": "Bull counters that recurring cash flows comfortably service debt.",
                "rebuttals": [
                    {
                        "opposing_claim": "Leverage and Litigation Overhang",
                        "counter_argument": "74% recurring enterprise revenue and 18% margins cushion debt obligations.",
                        "citation_ids": cids1,
                    }
                ],
                "acknowledged_gaps": [],
            }

        if role == "bear_rebuttal":
            return {
                "summary": "Bear counters that margin gains could erode if litigation escalates.",
                "rebuttals": [
                    {
                        "opposing_claim": "Durable Revenue Acceleration",
                        "counter_argument": "Growth relies on debt-funded expansion while patent litigation poses contingent liabilities.",
                        "citation_ids": cids2,
                    }
                ],
                "acknowledged_gaps": [],
            }

        if role == "rebuttal_moderator":
            return {
                "bull_summary_refinement": "Bull counters that recurring cash flows comfortably service debt.",
                "bear_summary_refinement": "Bear counters that margin gains could erode if litigation escalates.",
                "cross_examination_notes": ["Both sides addressed opposing claims with verified citations."],
            }

        if role == "judge":
            rec = self.judge_recommendation if has_evidence else "HOLD"
            return {
                "recommendation": rec,
                "reasoning": f"Based strictly on cited evidence, the committee leans {rec}.",
                "bull_strengths": ["22% revenue growth and 74% recurring revenue mix."],
                "bear_strengths": ["$3.1B debt load and patent litigation exposure."],
                "deciding_factors": ["Balance between recurring growth and leverage risk."],
                "cited_evidence_ids": [c for c in dict.fromkeys(cids1 + cids2) if c],
                "evidence_sufficiency": "sufficient" if has_evidence else "insufficient",
            }

        if role == "risk":
            return {
                "criteria_breakdown": self.risk_scores,
                "financial_leverage_rationale": "Debt burden evaluated from disclosures.",
                "operational_execution_rationale": "Operating margin and concentration assessed.",
                "regulatory_legal_governance_rationale": "Patent litigation risk evaluated.",
                "market_competitive_rationale": "Competitive pressure assessed.",
                "evidence_uncertainty_rationale": "Evidence coverage evaluated.",
                "key_risk_drivers": [
                    {
                        "risk": "Elevated debt load and patent litigation uncertainty.",
                        "severity": "high" if sum(self.risk_scores.values()) >= 70 else "medium",
                        "criteria_category": "financial_leverage_risk",
                        "citation_ids": cids2,
                    }
                ],
                "assessment_summary": "Independent risk assessment complete across all 5 criteria.",
            }

        return {}

    async def _inner_get_response(
        self,
        *,
        messages: list[Message],
        stream: bool,
        options: dict[str, Any],
        **kwargs: Any,
    ) -> ChatResponse:
        if self.fail_first_call and not self._failed_once:
            self._failed_once = True
            raise RuntimeError("Simulated primary structured output failure")

        self._active_calls += 1
        self.max_concurrent_calls = max(self.max_concurrent_calls, self._active_calls)
        try:
            if self.delay_seconds > 0:
                await asyncio.sleep(self.delay_seconds)
            role = self._detect_role(messages, options)
            prompt_text = "\n".join(m.text for m in messages if m.text)
            self.calls.append({"role": role, "prompt": prompt_text, "instructions": str((options or {}).get("instructions") or "")})
            payload = self._build_payload(role, prompt_text)
            json_str = json.dumps(payload)

            if stream:
                async def _gen():
                    yield ChatResponseUpdate(role="assistant", contents=[{"type": "text", "text": json_str}])
                return _gen()  # type: ignore[return-value]

            return ChatResponse(
                messages=[Message(role="assistant", contents=[json_str])],
                response_id=f"mock-{len(self.calls)}",
            )
        finally:
            self._active_calls -= 1


class ScriptedChatClientFactory:
    """ChatClientFactory returning a shared ScriptedCommitteeChatClient."""

    def __init__(self, client: ScriptedCommitteeChatClient) -> None:
        self.client = client

    def create_client(self, *, temperature: float = 0.1) -> BaseChatClient:
        return self.client


@pytest.fixture
def test_settings(tmp_path: Path) -> Settings:
    data_dir = tmp_path / "data"
    return Settings(
        data_dir=data_dir,
        uploads_dir=data_dir / "uploads",
        vectordb_dir=data_dir / "vectordb",
        doc_registry_path=data_dir / "documents.json",
        default_risk_veto_threshold=70,
        embedding_model="test-hash",
        chunk_size=450,
        chunk_overlap=80,
        retrieval_top_k=8,
        min_retrieval_score=0.05,
    )


@pytest.fixture
def vector_store(test_settings: Settings):
    store = DocumentVectorStore(
        settings=test_settings,
        embedding_provider=DeterministicHashEmbeddingProvider(),
    )
    yield store
    store.close()

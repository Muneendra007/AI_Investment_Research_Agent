"""Pydantic models shared across RAG, Microsoft Agent Framework workflows, and FastAPI."""

from __future__ import annotations

from typing import Literal
from pydantic import BaseModel, Field, field_validator


Recommendation = Literal["BUY", "HOLD", "AVOID"]


class DocumentRecord(BaseModel):
    """Metadata describing an uploaded and indexed PDF document."""

    doc_id: str
    filename: str
    page_count: int
    chunk_count: int
    file_size_bytes: int
    uploaded_at: str
    injection_warnings: list[str] = Field(default_factory=list)


class DocumentChunk(BaseModel):
    """Single chunk extracted from a specific page of an uploaded PDF."""

    chunk_id: str
    doc_id: str
    document_name: str
    page_number: int
    chunk_index: int
    text: str
    char_start: int
    char_end: int
    prompt_injection_flagged: bool = False


class CitationRef(BaseModel):
    """Verifiable citation traceable back to exact document, page, and excerpt."""

    citation_id: str
    doc_id: str
    document_name: str
    page_number: int
    chunk_id: str
    excerpt: str
    score: float = 0.0
    prompt_injection_flagged: bool = False


class CitedFinding(BaseModel):
    """A factual finding linked to one or more verified citation IDs."""

    claim: str
    category: Literal["financial", "opportunity", "risk", "fact"] = "fact"
    citation_ids: list[str] = Field(default_factory=list)


class ResearchDossier(BaseModel):
    """Structured output produced by the Research Agent."""

    company_name: str
    summary: str
    financial_findings: list[CitedFinding] = Field(default_factory=list)
    opportunities: list[CitedFinding] = Field(default_factory=list)
    risks: list[CitedFinding] = Field(default_factory=list)
    supporting_facts: list[CitedFinding] = Field(default_factory=list)
    insufficient_evidence: bool = False
    evidence_gaps: list[str] = Field(default_factory=list)
    citations: list[CitationRef] = Field(default_factory=list)


class DebatePoint(BaseModel):
    """A single supported argument in the Bull or Bear brief."""

    point: str
    reasoning: str
    citation_ids: list[str] = Field(default_factory=list)


class AgentBrief(BaseModel):
    """Independent opening brief from the Bull Agent or Bear Agent."""

    agent_name: str
    stance: Literal["BUY", "AVOID"]
    thesis: str
    arguments: list[DebatePoint] = Field(default_factory=list)
    acknowledged_gaps: list[str] = Field(default_factory=list)


class ArgumentExchange(BaseModel):
    """Structured exchange pairing Bull and Bear arguments before rebuttal."""

    bull_brief: AgentBrief
    bear_brief: AgentBrief
    contested_topics: list[str] = Field(default_factory=list)


class RebuttalItem(BaseModel):
    """Direct response addressing an opposing agent's argument."""

    opposing_claim: str
    counter_argument: str
    citation_ids: list[str] = Field(default_factory=list)


class SideRebuttal(BaseModel):
    """Rebuttal generated for one side of the debate."""

    agent_name: str
    responding_to: str
    summary: str
    rebuttals: list[RebuttalItem] = Field(default_factory=list)
    acknowledged_gaps: list[str] = Field(default_factory=list)


class RebuttalSuite(BaseModel):
    """Combined Bull and Bear rebuttals produced by the Rebuttal stage."""

    bull_rebuttal: SideRebuttal
    bear_rebuttal: SideRebuttal


class JudgeEvaluation(BaseModel):
    """Neutral evaluation and non-vetoed recommendation from the Judge Agent."""

    recommendation: Recommendation
    reasoning: str
    bull_strengths: list[str] = Field(default_factory=list)
    bear_strengths: list[str] = Field(default_factory=list)
    deciding_factors: list[str] = Field(default_factory=list)
    cited_evidence_ids: list[str] = Field(default_factory=list)
    evidence_sufficiency: Literal["sufficient", "partial", "insufficient"] = "sufficient"


class RiskCriteriaBreakdown(BaseModel):
    """Deterministic 100-point risk scoring rubric across 5 explicit criteria."""

    financial_leverage_risk: int = Field(ge=0, le=25, description="0-25: debt burden, liquidity, cash burn, coverage")
    operational_execution_risk: int = Field(ge=0, le=20, description="0-20: supply chain, concentration, execution/margins")
    regulatory_legal_governance_risk: int = Field(ge=0, le=20, description="0-20: litigation, compliance, governance")
    market_competitive_risk: int = Field(ge=0, le=20, description="0-20: competitive threats, cyclicality, moat erosion")
    evidence_uncertainty_risk: int = Field(ge=0, le=15, description="0-15: missing disclosures, conflicting/thin data")

    @property
    def total_score(self) -> int:
        return (
            self.financial_leverage_risk
            + self.operational_execution_risk
            + self.regulatory_legal_governance_risk
            + self.market_competitive_risk
            + self.evidence_uncertainty_risk
        )


class RiskDriver(BaseModel):
    """Individual risk factor identified by the Risk Agent."""

    risk: str
    severity: Literal["low", "medium", "high", "critical"]
    criteria_category: str
    citation_ids: list[str] = Field(default_factory=list)


class RiskAssessment(BaseModel):
    """Independent risk evaluation produced by the mandatory Risk Agent."""

    risk_score: int = Field(ge=0, le=100)
    criteria_breakdown: RiskCriteriaBreakdown
    criteria_rationales: dict[str, str] = Field(default_factory=dict)
    key_risk_drivers: list[RiskDriver] = Field(default_factory=list)
    assessment_summary: str


class DecisionEnforcementResult(BaseModel):
    """Deterministic post-Judge / post-Risk veto enforcement output."""

    judge_recommendation: Recommendation
    risk_score: int = Field(ge=0, le=100)
    risk_veto_threshold: int = Field(ge=0, le=100)
    veto_triggered: bool
    veto_explanation: str
    final_decision: Recommendation
    final_decision_explanation: str


class ExecutionStepTrace(BaseModel):
    """Audit record for a single stage in the Microsoft Agent Framework workflow."""

    step_number: int
    agent_id: str
    agent_name: str
    status: Literal["completed", "warning", "error"] = "completed"
    started_at: str
    completed_at: str
    summary: str


class CommitteeRunRequest(BaseModel):
    """Request payload to start a Debate-Driven Investment Committee run."""

    company_name: str = Field(min_length=1, max_length=120)
    query: str = Field(default="", max_length=500)
    doc_ids: list[str] = Field(default_factory=list)
    risk_veto_threshold: int = Field(default=70, ge=0, le=100)

    @field_validator("company_name")
    @classmethod
    def strip_company_name(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("company_name cannot be blank")
        return cleaned


class InvestmentCommitteeReport(BaseModel):
    """Complete structured output report for the Investment Committee run."""

    report_id: str
    created_at: str
    company_name: str
    query: str
    document_ids: list[str] = Field(default_factory=list)
    documents_analyzed: list[DocumentRecord] = Field(default_factory=list)
    research: ResearchDossier
    bull_argument: AgentBrief
    bear_argument: AgentBrief
    argument_exchange: ArgumentExchange
    rebuttals: RebuttalSuite
    judge_evaluation: JudgeEvaluation
    risk_assessment: RiskAssessment
    decision_enforcement: DecisionEnforcementResult
    final_decision: Recommendation
    veto_triggered: bool
    final_decision_explanation: str
    citation_map: dict[str, CitationRef] = Field(default_factory=dict)
    execution_trace: list[ExecutionStepTrace] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)


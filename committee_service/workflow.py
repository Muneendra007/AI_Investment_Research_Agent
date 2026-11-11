"""Microsoft Agent Framework workflow orchestrating the Debate-Driven Investment Committee."""

from __future__ import annotations

import logging
import uuid
from collections.abc import AsyncIterator
from datetime import datetime, timezone
from typing import Any
from typing_extensions import Never

from agent_framework import (
    Executor,
    Workflow,
    WorkflowBuilder,
    WorkflowContext,
    WorkflowEvent,
    handler,
)

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
from committee_service.llm_factory import ChatClientFactory, DefaultChatClientFactory
from committee_service.models import (
    AgentBrief,
    ArgumentExchange,
    CitationRef,
    CommitteeRunRequest,
    DecisionEnforcementResult,
    DocumentRecord,
    ExecutionStepTrace,
    InvestmentCommitteeReport,
    JudgeEvaluation,
    RebuttalSuite,
    ResearchDossier,
    RiskAssessment,
)
from committee_service.rag import DocumentVectorStore

logger = logging.getLogger(__name__)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ─── Microsoft Agent Framework Executors (Steps 1-8) ─────────────────────


class ResearchExecutor(Executor):
    """Step 1: Retrieve PDF evidence from Qdrant and run the Microsoft Agent Framework ResearchAgent."""

    def __init__(self, vector_store: DocumentVectorStore, agent: Any) -> None:
        super().__init__(id="research")
        self._vector_store = vector_store
        self._agent = agent

    @handler
    async def handle(
        self,
        request: CommitteeRunRequest,
        ctx: WorkflowContext[ResearchDossier],
    ) -> None:
        started_at = _now_iso()
        warnings: list[str] = []

        docs: list[DocumentRecord] = self._vector_store.get_documents(
            request.doc_ids if request.doc_ids else None
        )
        queries = [
            f"{request.company_name} financial performance revenue earnings cash flow debt margins",
            f"{request.company_name} growth opportunities competitive advantages strategy outlook",
            f"{request.company_name} risks litigation regulatory governance weaknesses headwinds",
        ]
        if request.query:
            queries.insert(0, f"{request.company_name} {request.query}")

        citations: list[CitationRef] = []
        if docs:
            citations = self._vector_store.retrieve(
                queries=queries,
                doc_ids=[d.doc_id for d in docs],
            )
        else:
            warnings.append("No uploaded PDF documents were selected or available in the document vault.")

        for doc in docs:
            for inj_w in doc.injection_warnings:
                warnings.append(f"{doc.filename}: {inj_w}")

        dossier = await run_research_agent(
            agent=self._agent,
            company_name=request.company_name,
            query=request.query,
            citations=citations,
            warnings_out=warnings,
        )

        ctx.set_state("request", request)
        ctx.set_state("documents_analyzed", docs)
        ctx.set_state("research_dossier", dossier)
        ctx.set_state("warnings_research", warnings)
        ctx.set_state(
            "trace_research",
            ExecutionStepTrace(
                step_number=1,
                agent_id="research",
                agent_name="Research Agent",
                status="warning" if dossier.insufficient_evidence else "completed",
                started_at=started_at,
                completed_at=_now_iso(),
                summary=f"Retrieved {len(citations)} verified chunks across {len(docs)} document(s).",
            ),
        )
        await ctx.send_message(dossier)


class BullExecutor(Executor):
    """Step 2a: Argues BUY using Research Agent's cited evidence (runs concurrently with Bear)."""

    def __init__(self, agent: Any) -> None:
        super().__init__(id="bull")
        self._agent = agent

    @handler
    async def handle(
        self,
        dossier: ResearchDossier,
        ctx: WorkflowContext[AgentBrief],
    ) -> None:
        started_at = _now_iso()
        warnings: list[str] = []

        brief = await run_bull_agent(self._agent, dossier, warnings_out=warnings)

        ctx.set_state("bull_brief", brief)
        ctx.set_state("warnings_bull", warnings)
        ctx.set_state(
            "trace_bull",
            ExecutionStepTrace(
                step_number=2,
                agent_id="bull",
                agent_name="Bull Agent (BUY)",
                status="completed",
                started_at=started_at,
                completed_at=_now_iso(),
                summary=f"Formulated {len(brief.arguments)} BUY argument(s) concurrently.",
            ),
        )
        await ctx.send_message(brief)


class BearExecutor(Executor):
    """Step 2b: Argues AVOID using Research Agent's cited evidence (runs concurrently with Bull)."""

    def __init__(self, agent: Any) -> None:
        super().__init__(id="bear")
        self._agent = agent

    @handler
    async def handle(
        self,
        dossier: ResearchDossier,
        ctx: WorkflowContext[AgentBrief],
    ) -> None:
        started_at = _now_iso()
        warnings: list[str] = []

        brief = await run_bear_agent(self._agent, dossier, warnings_out=warnings)

        ctx.set_state("bear_brief", brief)
        ctx.set_state("warnings_bear", warnings)
        ctx.set_state(
            "trace_bear",
            ExecutionStepTrace(
                step_number=2,
                agent_id="bear",
                agent_name="Bear Agent (AVOID)",
                status="completed",
                started_at=started_at,
                completed_at=_now_iso(),
                summary=f"Formulated {len(brief.arguments)} AVOID argument(s) concurrently.",
            ),
        )
        await ctx.send_message(brief)


class ArgumentExchangeExecutor(Executor):
    """Step 3: Synchronizes Bull & Bear opening briefs and prepares structured exchange."""

    def __init__(self) -> None:
        super().__init__(id="exchange")

    @handler
    async def handle(
        self,
        briefs: list[AgentBrief],
        ctx: WorkflowContext[ArgumentExchange],
    ) -> None:
        started_at = _now_iso()
        bull_brief = next((b for b in briefs if b.stance == "BUY"), None) or ctx.get_state("bull_brief")
        bear_brief = next((b for b in briefs if b.stance == "AVOID"), None) or ctx.get_state("bear_brief")

        if bull_brief is None or bear_brief is None:
            raise RuntimeError("ArgumentExchangeExecutor expected both Bull and Bear opening briefs.")

        contested_topics = [a.point for a in bull_brief.arguments[:3]] + [
            a.point for a in bear_brief.arguments[:3]
        ]

        exchange = ArgumentExchange(
            bull_brief=bull_brief,
            bear_brief=bear_brief,
            contested_topics=contested_topics,
        )
        ctx.set_state("argument_exchange", exchange)
        ctx.set_state(
            "trace_exchange",
            ExecutionStepTrace(
                step_number=3,
                agent_id="exchange",
                agent_name="Argument Exchange",
                status="completed",
                started_at=started_at,
                completed_at=_now_iso(),
                summary=(
                    f"Exchanged {len(bull_brief.arguments)} Bull points and "
                    f"{len(bear_brief.arguments)} Bear points."
                ),
            ),
        )
        await ctx.send_message(exchange)


class RebuttalExecutor(Executor):
    """Step 4: Rebuttal Agent coordinates Bull-to-Bear and Bear-to-Bull responses."""

    def __init__(self, rebuttal_agent: Any, bull_agent: Any, bear_agent: Any) -> None:
        super().__init__(id="rebuttal")
        self._rebuttal_agent = rebuttal_agent
        self._bull_agent = bull_agent
        self._bear_agent = bear_agent

    @handler
    async def handle(
        self,
        exchange: ArgumentExchange,
        ctx: WorkflowContext[RebuttalSuite],
    ) -> None:
        started_at = _now_iso()
        warnings: list[str] = []
        dossier: ResearchDossier = ctx.get_state("research_dossier")

        rebuttals = await run_rebuttal_stage(
            rebuttal_agent=self._rebuttal_agent,
            bull_agent=self._bull_agent,
            bear_agent=self._bear_agent,
            dossier=dossier,
            bull_brief=exchange.bull_brief,
            bear_brief=exchange.bear_brief,
            warnings_out=warnings,
        )

        ctx.set_state("rebuttals", rebuttals)
        ctx.set_state("warnings_rebuttal", warnings)
        ctx.set_state(
            "trace_rebuttal",
            ExecutionStepTrace(
                step_number=4,
                agent_id="rebuttal",
                agent_name="Rebuttal Agent",
                status="completed",
                started_at=started_at,
                completed_at=_now_iso(),
                summary=(
                    f"Generated {len(rebuttals.bull_rebuttal.rebuttals)} Bull rebuttals and "
                    f"{len(rebuttals.bear_rebuttal.rebuttals)} Bear rebuttals."
                ),
            ),
        )
        await ctx.send_message(rebuttals)


class JudgeExecutor(Executor):
    """Step 5: Neutral Judge Agent evaluates research, arguments, and rebuttals."""

    def __init__(self, agent: Any) -> None:
        super().__init__(id="judge")
        self._agent = agent

    @handler
    async def handle(
        self,
        rebuttals: RebuttalSuite,
        ctx: WorkflowContext[JudgeEvaluation],
    ) -> None:
        started_at = _now_iso()
        warnings: list[str] = []
        dossier: ResearchDossier = ctx.get_state("research_dossier")
        exchange: ArgumentExchange = ctx.get_state("argument_exchange")

        evaluation = await run_judge_agent(
            agent=self._agent,
            dossier=dossier,
            bull_brief=exchange.bull_brief,
            bear_brief=exchange.bear_brief,
            rebuttals=rebuttals,
            warnings_out=warnings,
        )

        ctx.set_state("judge_evaluation", evaluation)
        ctx.set_state("warnings_judge", warnings)
        ctx.set_state(
            "trace_judge",
            ExecutionStepTrace(
                step_number=5,
                agent_id="judge",
                agent_name="Judge Agent",
                status="completed",
                started_at=started_at,
                completed_at=_now_iso(),
                summary=(
                    f"Judge recommended {evaluation.recommendation} "
                    f"(evidence sufficiency: {evaluation.evidence_sufficiency})."
                ),
            ),
        )
        await ctx.send_message(evaluation)


class RiskExecutor(Executor):
    """Step 6: Mandatory Risk Agent evaluates risk independently of the Judge's recommendation."""

    def __init__(self, agent: Any) -> None:
        super().__init__(id="risk")
        self._agent = agent

    @handler
    async def handle(
        self,
        _judge_eval: JudgeEvaluation,
        ctx: WorkflowContext[RiskAssessment],
    ) -> None:
        started_at = _now_iso()
        warnings: list[str] = []
        # Deliberately ignore _judge_eval so risk scoring remains independent
        dossier: ResearchDossier = ctx.get_state("research_dossier")

        assessment = await run_risk_agent(
            agent=self._agent,
            dossier=dossier,
            warnings_out=warnings,
        )

        ctx.set_state("risk_assessment", assessment)
        ctx.set_state("warnings_risk", warnings)
        ctx.set_state(
            "trace_risk",
            ExecutionStepTrace(
                step_number=6,
                agent_id="risk",
                agent_name="Risk Agent (Independent)",
                status="completed",
                started_at=started_at,
                completed_at=_now_iso(),
                summary=f"Calculated independent risk score: {assessment.risk_score}/100.",
            ),
        )
        await ctx.send_message(assessment)


class DecisionEnforcementExecutor(Executor):
    """Step 7: Deterministic veto mechanism independent of LLM reasoning."""

    def __init__(self) -> None:
        super().__init__(id="enforcement")

    @handler
    async def handle(
        self,
        risk_assessment: RiskAssessment,
        ctx: WorkflowContext[DecisionEnforcementResult],
    ) -> None:
        started_at = _now_iso()
        request: CommitteeRunRequest = ctx.get_state("request")
        judge_eval: JudgeEvaluation = ctx.get_state("judge_evaluation")

        enforcement = enforce_risk_veto(
            judge_recommendation=judge_eval.recommendation,
            risk_assessment=risk_assessment,
            risk_veto_threshold=request.risk_veto_threshold,
        )

        ctx.set_state("decision_enforcement", enforcement)
        ctx.set_state(
            "trace_enforcement",
            ExecutionStepTrace(
                step_number=7,
                agent_id="enforcement",
                agent_name="Deterministic Risk Veto",
                status="warning" if enforcement.veto_triggered else "completed",
                started_at=started_at,
                completed_at=_now_iso(),
                summary=(
                    f"Veto TRIGGERED ({enforcement.risk_score} ≥ {enforcement.risk_veto_threshold}) → HOLD"
                    if enforcement.veto_triggered
                    else f"Passed ({enforcement.risk_score} < {enforcement.risk_veto_threshold}) → {enforcement.final_decision}"
                ),
            ),
        )
        await ctx.send_message(enforcement)


class ReportGeneratorExecutor(Executor):
    """Step 8: Assemble traceable Investment Committee Report and yield workflow output."""

    def __init__(self) -> None:
        super().__init__(id="report")

    @handler
    async def handle(
        self,
        enforcement: DecisionEnforcementResult,
        ctx: WorkflowContext[Never, InvestmentCommitteeReport],
    ) -> None:
        started_at = _now_iso()
        request: CommitteeRunRequest = ctx.get_state("request")
        docs: list[DocumentRecord] = ctx.get_state("documents_analyzed", [])
        dossier: ResearchDossier = ctx.get_state("research_dossier")
        exchange: ArgumentExchange = ctx.get_state("argument_exchange")
        rebuttals: RebuttalSuite = ctx.get_state("rebuttals")
        judge_eval: JudgeEvaluation = ctx.get_state("judge_evaluation")
        risk_assessment: RiskAssessment = ctx.get_state("risk_assessment")

        all_warnings: list[str] = []
        for key in (
            "warnings_research",
            "warnings_bull",
            "warnings_bear",
            "warnings_rebuttal",
            "warnings_judge",
            "warnings_risk",
        ):
            items = ctx.get_state(key, [])
            if items:
                all_warnings.extend(items)

        trace: list[ExecutionStepTrace] = []
        for key in (
            "trace_research",
            "trace_bull",
            "trace_bear",
            "trace_exchange",
            "trace_rebuttal",
            "trace_judge",
            "trace_risk",
            "trace_enforcement",
        ):
            entry = ctx.get_state(key)
            if entry is not None:
                trace.append(entry)

        trace.append(
            ExecutionStepTrace(
                step_number=8,
                agent_id="report",
                agent_name="Committee Report Generator",
                status="completed",
                started_at=started_at,
                completed_at=_now_iso(),
                summary=f"Compiled final {enforcement.final_decision} report with {len(dossier.citations)} traceable citations.",
            )
        )

        citation_map = {c.citation_id: c for c in dossier.citations}

        report = InvestmentCommitteeReport(
            report_id=f"rep_{uuid.uuid4().hex[:12]}",
            created_at=_now_iso(),
            company_name=request.company_name,
            query=request.query,
            document_ids=[d.doc_id for d in docs],
            documents_analyzed=docs,
            research=dossier,
            bull_argument=exchange.bull_brief,
            bear_argument=exchange.bear_brief,
            argument_exchange=exchange,
            rebuttals=rebuttals,
            judge_evaluation=judge_eval,
            risk_assessment=risk_assessment,
            decision_enforcement=enforcement,
            final_decision=enforcement.final_decision,
            veto_triggered=enforcement.veto_triggered,
            final_decision_explanation=enforcement.final_decision_explanation,
            citation_map=citation_map,
            execution_trace=trace,
            warnings=all_warnings,
        )
        await ctx.yield_output(report)


# ─── Workflow Assembly & Streaming Runner ────────────────────────────────


def build_committee_workflow(
    vector_store: DocumentVectorStore,
    client_factory: ChatClientFactory | None = None,
) -> Workflow:
    """Build a fresh Microsoft Agent Framework Workflow for an Investment Committee run."""
    factory = client_factory or DefaultChatClientFactory()
    factual_client = factory.create_client(temperature=0.1)
    debate_client = factory.create_client(temperature=0.2)

    research_agent = create_research_agent(factual_client)
    bull_agent = create_bull_agent(debate_client)
    bear_agent = create_bear_agent(debate_client)
    rebuttal_agent = create_rebuttal_agent(factual_client)
    judge_agent = create_judge_agent(factual_client)
    risk_agent = create_risk_agent(factual_client)

    research_exec = ResearchExecutor(vector_store=vector_store, agent=research_agent)
    bull_exec = BullExecutor(agent=bull_agent)
    bear_exec = BearExecutor(agent=bear_agent)
    exchange_exec = ArgumentExchangeExecutor()
    rebuttal_exec = RebuttalExecutor(
        rebuttal_agent=rebuttal_agent,
        bull_agent=bull_agent,
        bear_agent=bear_agent,
    )
    judge_exec = JudgeExecutor(agent=judge_agent)
    risk_exec = RiskExecutor(agent=risk_agent)
    enforcement_exec = DecisionEnforcementExecutor()
    report_exec = ReportGeneratorExecutor()

    return (
        WorkflowBuilder(
            start_executor=research_exec,
            name="DebateInvestmentCommittee",
            description="8-stage Microsoft Agent Framework Debate-Driven Investment Committee",
            output_from=[report_exec],
        )
        .add_fan_out_edges(research_exec, [bull_exec, bear_exec])
        .add_fan_in_edges([bull_exec, bear_exec], exchange_exec)
        .add_edge(exchange_exec, rebuttal_exec)
        .add_edge(rebuttal_exec, judge_exec)
        .add_edge(judge_exec, risk_exec)
        .add_edge(risk_exec, enforcement_exec)
        .add_edge(enforcement_exec, report_exec)
        .build()
    )


async def run_committee_workflow(
    request: CommitteeRunRequest,
    vector_store: DocumentVectorStore,
    client_factory: ChatClientFactory | None = None,
) -> InvestmentCommitteeReport:
    """Execute the Investment Committee workflow to completion and return the report."""
    workflow = build_committee_workflow(vector_store=vector_store, client_factory=client_factory)
    result = await workflow.run(request)
    outputs = result.get_outputs()
    if not outputs or not isinstance(outputs[0], InvestmentCommitteeReport):
        raise RuntimeError("Committee workflow finished without yielding an InvestmentCommitteeReport.")
    return outputs[0]


# Map internal executor IDs to frontend UI stage IDs (merging concurrent bull+bear into 'bull_bear')
_STAGE_MAP = {
    "research": "research",
    "bull": "bull_bear",
    "bear": "bull_bear",
    "exchange": "exchange",
    "rebuttal": "rebuttal",
    "judge": "judge",
    "risk": "risk",
    "enforcement": "enforcement",
    "report": "report",
}


async def stream_committee_events(
    request: CommitteeRunRequest,
    vector_store: DocumentVectorStore,
    client_factory: ChatClientFactory | None = None,
) -> AsyncIterator[dict[str, Any]]:
    """Run the Microsoft Agent Framework workflow in streaming mode and yield UI-ready progress dicts."""
    workflow = build_committee_workflow(vector_store=vector_store, client_factory=client_factory)
    started_stages: set[str] = set()
    bull_bear_done: set[str] = set()

    stream = workflow.run(request, stream=True)
    async for event in stream:
        if not isinstance(event, WorkflowEvent):
            continue

        if event.type == "executor_invoked" and event.executor_id:
            stage = _STAGE_MAP.get(event.executor_id)
            if stage and stage not in started_stages:
                started_stages.add(stage)
                yield {
                    "type": "stage_start",
                    "stage": stage,
                    "timestamp": _now_iso(),
                }

        elif event.type == "executor_completed" and event.executor_id:
            exec_id = event.executor_id
            stage = _STAGE_MAP.get(exec_id)
            if not stage:
                continue

            if exec_id in ("bull", "bear"):
                bull_bear_done.add(exec_id)
                if len(bull_bear_done) < 2:
                    continue
                yield {
                    "type": "stage_complete",
                    "stage": "bull_bear",
                    "summary": "Bull (BUY) and Bear (AVOID) arguments completed concurrently.",
                    "timestamp": _now_iso(),
                }
            else:
                yield {
                    "type": "stage_complete",
                    "stage": stage,
                    "timestamp": _now_iso(),
                }

        elif event.type == "executor_failed" and event.executor_id:
            stage = _STAGE_MAP.get(event.executor_id, event.executor_id)
            err_msg = event.details.message if event.details else "Executor failed"
            yield {
                "type": "stage_error",
                "stage": stage,
                "error": err_msg,
                "timestamp": _now_iso(),
            }

        elif event.type == "output" and isinstance(event.data, InvestmentCommitteeReport):
            yield {
                "type": "final_report",
                "report": event.data.model_dump(),
                "timestamp": _now_iso(),
            }

        elif event.type == "failed":
            err_msg = event.details.message if event.details else "Workflow failed"
            yield {
                "type": "error",
                "error": err_msg,
                "timestamp": _now_iso(),
            }


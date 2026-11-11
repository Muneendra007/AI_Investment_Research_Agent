"use client";

import { useState } from "react";
import type {
  CitationRef,
  CommitteeRecommendation,
  InvestmentCommitteeReport,
} from "@/frontend/types";
import { formatReportAsMarkdown } from "@/frontend/lib/report-export";

export { formatReportAsMarkdown };

interface CommitteeReportViewProps {
  report: InvestmentCommitteeReport;
}

function getDecisionStyle(decision: CommitteeRecommendation) {
  switch (decision) {
    case "BUY":
      return {
        badge: "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-emerald-500/25",
        border: "border-emerald-500/35 bg-emerald-950/15",
        text: "text-emerald-400",
        icon: "🟢",
      };
    case "HOLD":
      return {
        badge: "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-amber-500/25",
        border: "border-amber-500/35 bg-amber-950/15",
        text: "text-amber-400",
        icon: "🟡",
      };
    case "AVOID":
      return {
        badge: "bg-gradient-to-r from-rose-500 to-red-600 text-white shadow-rose-500/25",
        border: "border-rose-500/35 bg-rose-950/15",
        text: "text-rose-400",
        icon: "🔴",
      };
  }
}

function CitationChips({
  ids,
  citationMap,
  activeCitationId,
  onSelect,
}: {
  ids: string[];
  citationMap: Record<string, CitationRef>;
  activeCitationId: string | null;
  onSelect: (id: string) => void;
}) {
  if (!ids || ids.length === 0) return null;
  return (
    <span className="inline-flex flex-wrap gap-1.5 ml-2 align-middle">
      {ids.map((id) => {
        const cit = citationMap[id];
        const isActive = activeCitationId === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            title={
              cit
                ? `${cit.document_name} · Page ${cit.page_number}\n${cit.excerpt.slice(0, 180)}...`
                : id
            }
            className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md border transition-all cursor-pointer ${
              isActive
                ? "bg-cyan-500 text-slate-950 border-cyan-300 shadow-md shadow-cyan-500/20"
                : "bg-cyan-500/20 text-cyan-300 border-cyan-500/40 hover:bg-cyan-500/30"
            }`}
          >
            {cit ? `${id} · ${cit.document_name} p.${cit.page_number}` : id}
          </button>
        );
      })}
    </span>
  );
}

export default function CommitteeReportView({ report }: CommitteeReportViewProps) {
  const [activeCitationId, setActiveCitationId] = useState<string | null>(null);
  const [showMemoModal, setShowMemoModal] = useState(false);

  const decisionStyle = getDecisionStyle(report.final_decision);
  const enforcement = report.decision_enforcement;
  const risk = report.risk_assessment;
  const criteria = risk.criteria_breakdown;

  const handleCitationSelect = (id: string) => {
    setActiveCitationId(id);
    const el = document.getElementById(`citation-card-${report.report_id}-${id}`);
    el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  const downloadFile = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const safeSlug = report.company_name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  const criteriaRows = [
    { key: "financial_leverage_risk", label: "Financial & Leverage", score: criteria.financial_leverage_risk, max: 25 },
    { key: "operational_execution_risk", label: "Operational & Execution", score: criteria.operational_execution_risk, max: 20 },
    { key: "regulatory_legal_governance_risk", label: "Regulatory, Legal & Governance", score: criteria.regulatory_legal_governance_risk, max: 20 },
    { key: "market_competitive_risk", label: "Market & Competitive", score: criteria.market_competitive_risk, max: 20 },
    { key: "evidence_uncertainty_risk", label: "Evidence Uncertainty", score: criteria.evidence_uncertainty_risk, max: 15 },
  ];

  const allCitations = Object.values(report.citation_map);

  return (
    <div className="space-y-6 animate-slide-up">
      {/* ─── 1. Prominent Final Decision Banner ─── */}
      <div className={`glass-panel p-6 border ${decisionStyle.border}`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2 flex-1 min-w-[260px]">
            <div className="flex flex-wrap items-center gap-3">
              <span
                data-testid="final-decision-badge"
                className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-xl text-sm font-extrabold uppercase tracking-wider shadow-lg ${decisionStyle.badge}`}
              >
                <span>{decisionStyle.icon}</span>
                <span>FINAL DECISION: {report.final_decision}</span>
              </span>

              {report.veto_triggered ? (
                <span className="px-3 py-1 rounded-lg text-xs font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                  🔒 RISK VETO TRIGGERED (Judge: {enforcement.judge_recommendation} → Forced HOLD)
                </span>
              ) : (
                <span className="px-3 py-1 rounded-lg text-xs font-mono font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  ✓ Risk Check Passed (Score {risk.risk_score} &lt; {enforcement.risk_veto_threshold})
                </span>
              )}
            </div>

            <h2 className="text-xl font-bold text-white">
              Investment Committee Verdict · {report.company_name}
            </h2>
            <p className="text-sm text-slate-200 leading-relaxed">
              {report.final_decision_explanation}
            </p>
          </div>

          {/* Export / View Actions */}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowMemoModal(true)}
              className="text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 cursor-pointer"
            >
              📄 View Full Report
            </button>
            <button
              type="button"
              onClick={() =>
                downloadFile(
                  formatReportAsMarkdown(report),
                  `${safeSlug}-committee-report.md`,
                  "text/markdown;charset=utf-8"
                )
              }
              className="text-xs font-medium px-3 py-1.5 rounded-lg border border-blue-500/40 bg-blue-600/20 hover:bg-blue-600/30 text-blue-200 cursor-pointer"
            >
              ⬇ Export Markdown
            </button>
            <button
              type="button"
              onClick={() =>
                downloadFile(
                  JSON.stringify(report, null, 2),
                  `${safeSlug}-committee-report.json`,
                  "application/json;charset=utf-8"
                )
              }
              className="text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 cursor-pointer"
            >
              ⬇ Export JSON
            </button>
          </div>
        </div>

        {/* Insufficient Evidence / Warnings Banner */}
        {(report.research.insufficient_evidence || report.warnings.length > 0) && (
          <div className="mt-4 p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/30 text-xs text-amber-200 space-y-1">
            <p className="font-bold uppercase tracking-wider text-amber-300">
              ⚠️ Evidence &amp; Governance Notices
            </p>
            {report.research.insufficient_evidence && (
              <p>
                Insufficient supporting document evidence was found for parts of this assessment.
                Claims are strictly bounded to verified chunks without fabrication.
              </p>
            )}
            {report.warnings.map((w, idx) => (
              <p key={idx}>• {w}</p>
            ))}
          </div>
        )}
      </div>

      {/* ─── 2. Judge Agent & Mandatory Risk Agent Row ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Judge Evaluation */}
        <div className="glass-card p-6 space-y-5">
          <div className="flex items-center justify-between gap-3 pb-3.5 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-base">
                ⚖️
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-100">
                  Judge Agent Evaluation
                </h3>
                <p className="text-xs text-slate-400">
                  Neutral synthesis of research, arguments &amp; rebuttals
                </p>
              </div>
            </div>
            <span
              className={`text-xs font-mono font-bold px-3 py-1 rounded-lg border ${
                report.judge_evaluation.recommendation === "BUY"
                  ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                  : report.judge_evaluation.recommendation === "HOLD"
                  ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                  : "bg-rose-500/15 text-rose-300 border-rose-500/30"
              }`}
            >
              Judge: {report.judge_evaluation.recommendation}
            </span>
          </div>

          <p className="text-sm sm:text-base text-slate-100 leading-relaxed font-normal bg-slate-900/40 p-4 rounded-xl border border-white/5">
            {report.judge_evaluation.reasoning}
            <CitationChips
              ids={report.judge_evaluation.cited_evidence_ids}
              citationMap={report.citation_map}
              activeCitationId={activeCitationId}
              onSelect={handleCitationSelect}
            />
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
            <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/20 space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-1.5 flex items-center gap-1.5">
                <span>🐂</span> Bull Strengths Recognized
              </p>
              <ul className="space-y-1.5 text-slate-200">
                {report.judge_evaluation.bull_strengths.map((item, i) => (
                  <li key={i} className="leading-snug">• {item}</li>
                ))}
              </ul>
            </div>
            <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/20 space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-rose-400 mb-1.5 flex items-center gap-1.5">
                <span>🐻</span> Bear Strengths Recognized
              </p>
              <ul className="space-y-1.5 text-slate-200">
                {report.judge_evaluation.bear_strengths.map((item, i) => (
                  <li key={i} className="leading-snug">• {item}</li>
                ))}
              </ul>
            </div>
          </div>

          {report.judge_evaluation.deciding_factors.length > 0 && (
            <div className="text-xs sm:text-sm space-y-2 p-3.5 rounded-xl bg-slate-900/50 border border-white/5">
              <p className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                Deciding Factors ({report.judge_evaluation.evidence_sufficiency} evidence)
              </p>
              <ul className="space-y-1.5 text-slate-200">
                {report.judge_evaluation.deciding_factors.map((f, i) => (
                  <li key={i}>• {f}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Risk Agent & Veto Enforcement */}
        <div className="glass-card p-6 space-y-5">
          <div className="flex items-center justify-between gap-3 pb-3.5 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-base">
                🛡️
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-100">
                  Mandatory Risk Agent &amp; Deterministic Veto
                </h3>
                <p className="text-xs text-slate-400">
                  Independent 0–100 scoring · Veto threshold ≥ {enforcement.risk_veto_threshold}
                </p>
              </div>
            </div>
            <div className="text-right font-mono">
              <div
                className={`text-xl font-extrabold ${
                  report.veto_triggered ? "text-rose-400" : "text-emerald-400"
                }`}
              >
                {risk.risk_score}
                <span className="text-sm text-slate-400">/100</span>
              </div>
              <div className="text-xs uppercase text-slate-400">
                {report.veto_triggered ? "VETO TRIGGERED" : "BELOW VETO"}
              </div>
            </div>
          </div>

          {/* Score bar with threshold marker */}
          <div className="space-y-2">
            <div className="relative w-full h-3.5 bg-slate-800 rounded-full overflow-hidden border border-white/10">
              <div
                className={`h-full transition-all ${
                  report.veto_triggered
                    ? "bg-gradient-to-r from-amber-500 to-rose-500"
                    : "bg-gradient-to-r from-emerald-500 to-amber-400"
                }`}
                style={{ width: `${risk.risk_score}%` }}
              />
              <div
                className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_8px_#fff]"
                style={{ left: `${enforcement.risk_veto_threshold}%` }}
                title={`Veto Threshold: ${enforcement.risk_veto_threshold}`}
              />
            </div>
            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed bg-slate-900/50 p-3 rounded-xl border border-white/5">
              {enforcement.veto_explanation}
            </p>
          </div>

          {/* Criteria Breakdown */}
          <div className="space-y-2.5">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              5-Criteria Risk Rubric (Arithmetic Sum = Total Score)
            </p>
            <div className="space-y-2">
              {criteriaRows.map((row) => (
                <div key={row.key} className="space-y-1 p-2.5 rounded-xl bg-slate-900/40 border border-white/5">
                  <div className="flex justify-between text-xs sm:text-sm">
                    <span className="text-slate-200 font-medium">{row.label}</span>
                    <span className="font-mono text-amber-300 font-bold">
                      {row.score}/{row.max}
                    </span>
                  </div>
                  <div className="score-bar-track">
                    <div
                      className="score-bar-fill bg-gradient-to-r from-amber-400 to-rose-500"
                      style={{ width: `${Math.round((row.score / row.max) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs sm:text-sm text-slate-200 leading-relaxed bg-slate-900/40 p-3 rounded-xl border border-white/5">
            {risk.assessment_summary}
          </p>

          {risk.key_risk_drivers.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Key Identified Risk Drivers
              </p>
              {risk.key_risk_drivers.map((driver, i) => (
                <div
                  key={i}
                  className="p-3 rounded-xl bg-slate-900/60 border border-white/5 flex flex-wrap items-center gap-2 text-xs sm:text-sm text-slate-200"
                >
                  <span
                    className={`text-xs font-mono uppercase font-bold mr-2 px-2 py-0.5 rounded ${
                      driver.severity === "critical" || driver.severity === "high"
                        ? "bg-rose-500/20 text-rose-300 border border-rose-500/30"
                        : driver.severity === "medium"
                        ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                        : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    }`}
                  >
                    {driver.severity}
                  </span>
                  <span className="flex-1">{driver.risk}</span>
                  <CitationChips
                    ids={driver.citation_ids}
                    citationMap={report.citation_map}
                    activeCitationId={activeCitationId}
                    onSelect={handleCitationSelect}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── 3. Separate Bull vs Bear Argument Sections ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bull Agent */}
        <div className="glass-card p-5 border border-emerald-500/25 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-emerald-500/15">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-sm">
                🐂
              </div>
              <div>
                <h3 className="text-sm font-bold text-emerald-300">
                  Bull Agent · BUY Case
                </h3>
                <p className="text-[11px] text-slate-400">
                  Independent evidence-backed upside thesis
                </p>
              </div>
            </div>
            <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              BUY
            </span>
          </div>

          <p className="text-sm sm:text-base font-medium text-emerald-100 bg-emerald-950/30 p-4 rounded-xl border border-emerald-500/25 leading-relaxed">
            {report.bull_argument.thesis}
          </p>

          <div className="space-y-3.5">
            {report.bull_argument.arguments.map((arg, i) => (
              <div
                key={i}
                className="p-4 rounded-xl bg-slate-900/60 border border-white/5 space-y-2 hover:border-emerald-500/20 transition-all"
              >
                <p className="text-sm sm:text-base font-bold text-slate-100">{arg.point}</p>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  {arg.reasoning}
                  <CitationChips
                    ids={arg.citation_ids}
                    citationMap={report.citation_map}
                    activeCitationId={activeCitationId}
                    onSelect={handleCitationSelect}
                  />
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Bear Agent */}
        <div className="glass-card p-6 border border-rose-500/25 space-y-5">
          <div className="flex items-center justify-between pb-3.5 border-b border-rose-500/15">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-base">
                🐻
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-rose-300">
                  Bear Agent · AVOID Case
                </h3>
                <p className="text-xs text-slate-400">
                  Independent downside, threats &amp; loss thesis
                </p>
              </div>
            </div>
            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-md bg-rose-500/15 text-rose-300 border border-rose-500/30">
              AVOID
            </span>
          </div>

          <p className="text-sm sm:text-base font-medium text-rose-100 bg-rose-950/30 p-4 rounded-xl border border-rose-500/25 leading-relaxed">
            {report.bear_argument.thesis}
          </p>

          <div className="space-y-3.5">
            {report.bear_argument.arguments.map((arg, i) => (
              <div
                key={i}
                className="p-4 rounded-xl bg-slate-900/60 border border-white/5 space-y-2 hover:border-rose-500/20 transition-all"
              >
                <p className="text-sm sm:text-base font-bold text-slate-100">{arg.point}</p>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  {arg.reasoning}
                  <CitationChips
                    ids={arg.citation_ids}
                    citationMap={report.citation_map}
                    activeCitationId={activeCitationId}
                    onSelect={handleCitationSelect}
                  />
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── 4. Rebuttal Stage (Both Agents Respond) ─── */}
      <div className="glass-card p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-base">
              💬
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-100">
                Rebuttal Agent · Cross-Examination
              </h3>
              <p className="text-xs text-slate-400">
                Direct evidence-backed rebuttals exchanged after opening arguments
              </p>
            </div>
          </div>
          {report.argument_exchange.contested_topics.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {report.argument_exchange.contested_topics.map((topic, i) => (
                <span
                  key={i}
                  className="text-xs font-mono px-2.5 py-1 rounded-md bg-slate-800 text-slate-200 border border-white/10"
                >
                  {topic}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Bull Rebuttal */}
          <div className="p-5 rounded-2xl bg-emerald-950/15 border border-emerald-500/25 space-y-4">
            <h4 className="text-sm font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
              <span>🐂</span> Bull Agent Rebuttal to Bear
            </h4>
            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed bg-slate-900/40 p-3 rounded-xl border border-emerald-500/10">
              {report.rebuttals.bull_rebuttal.summary}
            </p>
            <div className="space-y-3">
              {report.rebuttals.bull_rebuttal.rebuttals.map((r, i) => (
                <div key={i} className="p-3.5 rounded-xl bg-slate-900/70 border border-white/5 space-y-1.5 text-xs sm:text-sm">
                  <p className="text-xs text-rose-300 font-medium italic">
                    Opposing claim: &ldquo;{r.opposing_claim}&rdquo;
                  </p>
                  <p className="text-slate-100 leading-relaxed font-normal">
                    {r.counter_argument}
                    <CitationChips
                      ids={r.citation_ids}
                      citationMap={report.citation_map}
                      activeCitationId={activeCitationId}
                      onSelect={handleCitationSelect}
                    />
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Bear Rebuttal */}
          <div className="p-5 rounded-2xl bg-rose-950/15 border border-rose-500/25 space-y-4">
            <h4 className="text-sm font-bold uppercase tracking-wider text-rose-400 flex items-center gap-2">
              <span>🐻</span> Bear Agent Rebuttal to Bull
            </h4>
            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed bg-slate-900/40 p-3 rounded-xl border border-rose-500/10">
              {report.rebuttals.bear_rebuttal.summary}
            </p>
            <div className="space-y-3">
              {report.rebuttals.bear_rebuttal.rebuttals.map((r, i) => (
                <div key={i} className="p-3.5 rounded-xl bg-slate-900/70 border border-white/5 space-y-1.5 text-xs sm:text-sm">
                  <p className="text-xs text-emerald-300 font-medium italic">
                    Opposing claim: &ldquo;{r.opposing_claim}&rdquo;
                  </p>
                  <p className="text-slate-100 leading-relaxed font-normal">
                    {r.counter_argument}
                    <CitationChips
                      ids={r.citation_ids}
                      citationMap={report.citation_map}
                      activeCitationId={activeCitationId}
                      onSelect={handleCitationSelect}
                    />
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ─── 5. Research Findings & Traceable Citation Ledger ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6 space-y-5">
          <div className="flex items-center gap-3 pb-3.5 border-b border-white/5">
            <div className="w-9 h-9 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-base">
              📚
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-100">
                Research Agent Findings
              </h3>
              <p className="text-xs text-slate-400">
                Factual evidence extracted from uploaded PDFs
              </p>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-slate-200 leading-relaxed bg-slate-900/50 p-4 rounded-xl border border-white/5">
            {report.research.summary}
          </p>

          {[
            { title: "Financial Findings", items: report.research.financial_findings },
            { title: "Opportunities", items: report.research.opportunities },
            { title: "Documented Risks", items: report.research.risks },
            { title: "Supporting Facts", items: report.research.supporting_facts },
          ].map((group) =>
            group.items.length > 0 ? (
              <div key={group.title} className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  {group.title}
                </h4>
                <ul className="space-y-2">
                  {group.items.map((finding, idx) => (
                    <li
                      key={idx}
                      className="text-xs sm:text-sm text-slate-100 p-3.5 rounded-xl bg-slate-900/60 border border-white/5 leading-relaxed"
                    >
                      {finding.claim}
                      <CitationChips
                        ids={finding.citation_ids}
                        citationMap={report.citation_map}
                        activeCitationId={activeCitationId}
                        onSelect={handleCitationSelect}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            ) : null
          )}

          {report.research.evidence_gaps.length > 0 && (
            <div className="p-4 rounded-xl bg-amber-950/25 border border-amber-500/30 space-y-1.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-amber-300">
                Identified Evidence Gaps
              </h4>
              <ul className="space-y-1 text-xs sm:text-sm text-amber-100/90">
                {report.research.evidence_gaps.map((gap, i) => (
                  <li key={i}>• {gap}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Traceable Source Citations */}
        <div className="glass-card p-6 space-y-5">
          <div className="flex items-center justify-between gap-3 pb-3.5 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-base">
                🔎
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-100">
                  Traceable Evidence &amp; Page Citations
                </h3>
                <p className="text-xs text-slate-400">
                  Click any citation tag to highlight its exact PDF page excerpt
                </p>
              </div>
            </div>
            <span className="text-xs font-mono text-slate-300 px-2 py-0.5 rounded bg-slate-800">
              {allCitations.length} verified chunks
            </span>
          </div>

          {allCitations.length === 0 ? (
            <p className="text-xs sm:text-sm text-slate-400 py-6 text-center">
              No matching document chunks were retrieved for this query.
            </p>
          ) : (
            <div className="space-y-3 max-h-[580px] overflow-y-auto pr-1">
              {allCitations.map((cit) => {
                const isSelected = activeCitationId === cit.citation_id;
                return (
                  <div
                    key={cit.citation_id}
                    id={`citation-card-${report.report_id}-${cit.citation_id}`}
                    className={`p-4 rounded-xl border transition-all ${
                      isSelected
                        ? "bg-cyan-950/40 border-cyan-400/70 shadow-lg shadow-cyan-500/10"
                        : "bg-slate-900/60 border-white/5 hover:border-white/10"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                          {cit.citation_id}
                        </span>
                        <span className="text-xs sm:text-sm font-semibold text-slate-100">
                          {cit.document_name}
                        </span>
                        <span className="text-xs font-mono text-slate-300 px-2 py-0.5 rounded bg-slate-800">
                          Page {cit.page_number}
                        </span>
                      </div>
                      <span className="text-xs font-mono text-slate-400">
                        {cit.chunk_id} · sim {cit.score.toFixed(2)}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-wrap font-normal">
                      {cit.excerpt}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ─── Full Report Viewer Modal ─── */}
      {showMemoModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)" }}
          onClick={() => setShowMemoModal(false)}
        >
          <div
            className="glass-panel w-full max-w-4xl max-h-[85vh] flex flex-col border-white/10 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
              <div>
                <h3 className="text-base font-bold text-white">
                  Investment Committee Memo · {report.company_name}
                </h3>
                <p className="text-xs text-slate-400">
                  Final Decision: {report.final_decision} · Risk Score: {risk.risk_score}/100
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 cursor-pointer"
                >
                  🖨️ Print / Save PDF
                </button>
                <button
                  type="button"
                  onClick={() => setShowMemoModal(false)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-800 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
            <pre className="flex-1 overflow-y-auto p-6 text-xs text-slate-200 font-mono whitespace-pre-wrap leading-relaxed">
              {formatReportAsMarkdown(report)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

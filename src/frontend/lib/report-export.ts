import type { InvestmentCommitteeReport } from "@/frontend/types";

/** Format a structured InvestmentCommitteeReport into a downloadable Markdown memo. */
export function formatReportAsMarkdown(report: InvestmentCommitteeReport): string {
  const formatCitations = (ids: string[]) =>
    ids.length > 0
      ? ` (${ids
          .map((id) => {
            const cit = report.citation_map[id];
            return cit ? `[${id}: ${cit.document_name}, p.${cit.page_number}]` : `[${id}]`;
          })
          .join(", ")})`
      : "";

  const lines: string[] = [
    `# Investment Committee Report: ${report.company_name}`,
    ``,
    `- **Report ID:** \`${report.report_id}\``,
    `- **Generated:** ${report.created_at}`,
    `- **Final Decision:** **${report.final_decision}**`,
    `- **Judge Recommendation:** ${report.judge_evaluation.recommendation}`,
    `- **Risk Score:** ${report.risk_assessment.risk_score}/100 (Veto Threshold: ${report.decision_enforcement.risk_veto_threshold})`,
    `- **Risk Veto Triggered:** ${report.veto_triggered ? "YES (Forced HOLD)" : "NO"}`,
    ``,
    `## Final Decision Explanation`,
    report.final_decision_explanation,
    ``,
    `## Decision Enforcement & Veto Audit`,
    report.decision_enforcement.veto_explanation,
    ``,
    `## 1. Research Summary & Cited Findings`,
    report.research.summary,
    ``,
  ];

  const addFindings = (
    title: string,
    items: InvestmentCommitteeReport["research"]["financial_findings"]
  ) => {
    lines.push(`### ${title}`);
    if (items.length === 0) {
      lines.push(`- None identified from uploaded documents.`);
    } else {
      items.forEach((f) => lines.push(`- ${f.claim}${formatCitations(f.citation_ids)}`));
    }
    lines.push(``);
  };

  addFindings("Financial Findings", report.research.financial_findings);
  addFindings("Opportunities", report.research.opportunities);
  addFindings("Risks Identified", report.research.risks);
  addFindings("Supporting Facts", report.research.supporting_facts);

  if (report.research.insufficient_evidence || report.research.evidence_gaps.length > 0) {
    lines.push(`### Evidence Gaps`);
    report.research.evidence_gaps.forEach((g) => lines.push(`- ${g}`));
    lines.push(``);
  }

  lines.push(`## 2. Bull Agent (BUY Case)`);
  lines.push(`**Thesis:** ${report.bull_argument.thesis}`);
  report.bull_argument.arguments.forEach((a) =>
    lines.push(`- **${a.point}:** ${a.reasoning}${formatCitations(a.citation_ids)}`)
  );
  lines.push(``);

  lines.push(`## 3. Bear Agent (AVOID Case)`);
  lines.push(`**Thesis:** ${report.bear_argument.thesis}`);
  report.bear_argument.arguments.forEach((a) =>
    lines.push(`- **${a.point}:** ${a.reasoning}${formatCitations(a.citation_ids)}`)
  );
  lines.push(``);

  lines.push(`## 4. Rebuttals`);
  lines.push(`### Bull Rebuttal to Bear`);
  lines.push(report.rebuttals.bull_rebuttal.summary);
  report.rebuttals.bull_rebuttal.rebuttals.forEach((r) =>
    lines.push(
      `- *Addressing "${r.opposing_claim}":* ${r.counter_argument}${formatCitations(r.citation_ids)}`
    )
  );
  lines.push(``);
  lines.push(`### Bear Rebuttal to Bull`);
  lines.push(report.rebuttals.bear_rebuttal.summary);
  report.rebuttals.bear_rebuttal.rebuttals.forEach((r) =>
    lines.push(
      `- *Addressing "${r.opposing_claim}":* ${r.counter_argument}${formatCitations(r.citation_ids)}`
    )
  );
  lines.push(``);

  lines.push(`## 5. Judge Agent Evaluation`);
  lines.push(`- **Judge Recommendation:** ${report.judge_evaluation.recommendation}`);
  lines.push(`- **Evidence Sufficiency:** ${report.judge_evaluation.evidence_sufficiency}`);
  lines.push(
    `- **Reasoning:** ${report.judge_evaluation.reasoning}${formatCitations(
      report.judge_evaluation.cited_evidence_ids
    )}`
  );
  lines.push(``);

  lines.push(`## 6. Risk Agent Assessment`);
  lines.push(`- **Total Risk Score:** ${report.risk_assessment.risk_score}/100`);
  lines.push(`- **Assessment:** ${report.risk_assessment.assessment_summary}`);
  const cb = report.risk_assessment.criteria_breakdown;
  lines.push(
    `- **Criteria Breakdown:** Financial & Leverage ${cb.financial_leverage_risk}/25 · Operational ${cb.operational_execution_risk}/20 · Regulatory/Governance ${cb.regulatory_legal_governance_risk}/20 · Market/Competitive ${cb.market_competitive_risk}/20 · Evidence Uncertainty ${cb.evidence_uncertainty_risk}/15`
  );
  report.risk_assessment.key_risk_drivers.forEach((d) =>
    lines.push(`- **[${d.severity.toUpperCase()}]** ${d.risk}${formatCitations(d.citation_ids)}`)
  );
  lines.push(``);

  lines.push(`## 7. Traceable Source Citations`);
  Object.values(report.citation_map).forEach((cit) => {
    lines.push(
      `- **[${cit.citation_id}] ${cit.document_name} (Page ${cit.page_number}, Chunk ${cit.chunk_id}):** "${cit.excerpt.replace(/\s+/g, " ").trim()}"`
    );
  });

  return lines.join("\n");
}


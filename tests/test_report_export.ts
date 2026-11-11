import assert from "node:assert/strict";
import test from "node:test";
import { formatReportAsMarkdown } from "../src/frontend/lib/report-export.ts";

test("formatReportAsMarkdown renders all required Investment Committee sections and citations", () => {
  const sampleReport = {
    report_id: "rep_test123",
    created_at: "2026-11-11T10:00:00Z",
    company_name: "NovaTech Systems",
    query: "Evaluate FY2026 performance",
    document_ids: ["doc_1"],
    documents_analyzed: [
      {
        doc_id: "doc_1",
        filename: "novatech_fy2026.pdf",
        page_count: 3,
        chunk_count: 5,
        file_size_bytes: 2048,
        uploaded_at: "2026-11-11T09:59:00Z",
        injection_warnings: [],
      },
    ],
    research: {
      company_name: "NovaTech Systems",
      summary: "Strong revenue growth offset by 2027 debt wall.",
      financial_findings: [
        { claim: "Revenue grew 28% YoY to $1.85B.", category: "financial" as const, citation_ids: ["C1"] },
      ],
      opportunities: [
        { claim: "Enterprise AI backlog reached $640M.", category: "opportunity" as const, citation_ids: ["C2"] },
      ],
      risks: [
        { claim: "$1.9B convertible debt matures in 2027.", category: "risk" as const, citation_ids: ["C3"] },
      ],
      supporting_facts: [],
      insufficient_evidence: false,
      evidence_gaps: [],
      citations: [],
    },
    bull_argument: {
      agent_name: "BullAgent",
      stance: "BUY" as const,
      thesis: "High-margin recurring growth drives upside.",
      arguments: [
        { point: "Margin Expansion", reasoning: "71% gross margin.", citation_ids: ["C1"] },
      ],
      acknowledged_gaps: [],
    },
    bear_argument: {
      agent_name: "BearAgent",
      stance: "AVOID" as const,
      thesis: "Refinancing and antitrust risk create downside.",
      arguments: [
        { point: "Debt Wall", reasoning: "$1.9B matures in 2027.", citation_ids: ["C3"] },
      ],
      acknowledged_gaps: [],
    },
    argument_exchange: {
      bull_brief: {
        agent_name: "BullAgent",
        stance: "BUY" as const,
        thesis: "High-margin recurring growth drives upside.",
        arguments: [],
        acknowledged_gaps: [],
      },
      bear_brief: {
        agent_name: "BearAgent",
        stance: "AVOID" as const,
        thesis: "Refinancing and antitrust risk create downside.",
        arguments: [],
        acknowledged_gaps: [],
      },
      contested_topics: ["Margin Expansion", "Debt Wall"],
    },
    rebuttals: {
      bull_rebuttal: {
        agent_name: "BullAgent",
        responding_to: "BearAgent",
        summary: "Free cash flow cushions debt.",
        rebuttals: [
          { opposing_claim: "Debt Wall", counter_argument: "$310M FCF helps refinance.", citation_ids: ["C1"] },
        ],
        acknowledged_gaps: [],
      },
      bear_rebuttal: {
        agent_name: "BearAgent",
        responding_to: "BullAgent",
        summary: "Customer concentration threatens FCF.",
        rebuttals: [
          { opposing_claim: "Margin Expansion", counter_argument: "Top 2 customers are 44% of revenue.", citation_ids: ["C3"] },
        ],
        acknowledged_gaps: [],
      },
    },
    judge_evaluation: {
      recommendation: "BUY" as const,
      reasoning: "Growth outweighs debt risks.",
      bull_strengths: ["71% gross margin"],
      bear_strengths: ["Customer concentration"],
      deciding_factors: ["Backlog visibility"],
      cited_evidence_ids: ["C1", "C2", "C3"],
      evidence_sufficiency: "sufficient" as const,
    },
    risk_assessment: {
      risk_score: 76,
      criteria_breakdown: {
        financial_leverage_risk: 22,
        operational_execution_risk: 15,
        regulatory_legal_governance_risk: 16,
        market_competitive_risk: 14,
        evidence_uncertainty_risk: 9,
      },
      criteria_rationales: {},
      key_risk_drivers: [
        { risk: "2027 convertible maturity", severity: "high" as const, criteria_category: "financial_leverage_risk", citation_ids: ["C3"] },
      ],
      assessment_summary: "High refinancing and concentration risk.",
    },
    decision_enforcement: {
      judge_recommendation: "BUY" as const,
      risk_score: 76,
      risk_veto_threshold: 70,
      veto_triggered: true,
      veto_explanation: "Risk score 76/100 >= threshold 70/100 forced HOLD.",
      final_decision: "HOLD" as const,
      final_decision_explanation: "Forced HOLD due to deterministic Risk Veto.",
    },
    final_decision: "HOLD" as const,
    veto_triggered: true,
    final_decision_explanation: "Forced HOLD due to deterministic Risk Veto.",
    citation_map: {
      C1: {
        citation_id: "C1",
        doc_id: "doc_1",
        document_name: "novatech_fy2026.pdf",
        page_number: 1,
        chunk_id: "doc_1_p1_c0",
        excerpt: "Revenue rose 28 percent YoY to 1.85 billion USD.",
        score: 0.91,
        prompt_injection_flagged: false,
      },
      C2: {
        citation_id: "C2",
        doc_id: "doc_1",
        document_name: "novatech_fy2026.pdf",
        page_number: 2,
        chunk_id: "doc_1_p2_c0",
        excerpt: "Backlog of 640 million USD.",
        score: 0.88,
        prompt_injection_flagged: false,
      },
      C3: {
        citation_id: "C3",
        doc_id: "doc_1",
        document_name: "novatech_fy2026.pdf",
        page_number: 3,
        chunk_id: "doc_1_p3_c0",
        excerpt: "Senior convertible debt matures in 2027 totaling 1.9 billion USD.",
        score: 0.9,
        prompt_injection_flagged: false,
      },
    },
    execution_trace: [],
    warnings: [],
  };

  const md = formatReportAsMarkdown(sampleReport);
  assert.match(md, /# Investment Committee Report: NovaTech Systems/);
  assert.match(md, /Final Decision:\*\* \*\*HOLD\*\*/);
  assert.match(md, /Risk Veto Triggered:\*\* YES \(Forced HOLD\)/);
  assert.match(md, /Bull Agent \(BUY Case\)/);
  assert.match(md, /Bear Agent \(AVOID Case\)/);
  assert.match(md, /Bull Rebuttal to Bear/);
  assert.match(md, /Bear Rebuttal to Bull/);
  assert.match(md, /\[C1: novatech_fy2026\.pdf, p\.1\]/);
  assert.match(md, /\[C3: novatech_fy2026\.pdf, p\.3\]/);
});


// ─── Agent State Types ────────────────────────────────────────────────
// Central data contract shared by all LangGraph nodes and the UI.
// Every node reads from and writes to a subset of this state.

/** Resolved company entity from the Entity Resolver node */
export interface ResolvedEntity {
  ticker: string;
  name: string;
  sector: string;
  exchange: string;
  logo?: string;
  marketCap?: number;
  country?: string;
  currency?: string;
}

/** Financial metrics from the Financial Data node */
export interface Financials {
  currentPrice: number;
  change: number;
  changePercent: number;
  high52Week: number;
  low52Week: number;
  peRatio: number | null;
  peerAvgPE: number | null;
  marketCap: number | null;
  revenueGrowth: number | null;
  grossMargin: number | null;
  operatingMargin: number | null;
  netMargin: number | null;
  debtToEquity: number | null;
  returnOnEquity: number | null;
  beta: number | null;
}

/** Individual news item with sentiment classification */
export interface NewsItem {
  headline: string;
  summary: string;
  sentiment: "positive" | "neutral" | "negative";
  date: string;
  url: string;
  source: string;
}

/** Competitive landscape analysis */
export interface CompetitiveAnalysis {
  peers: string[];
  marketPositionSummary: string;
  moatAssessment: string;
}

/** Individual risk flag */
export interface RiskFlag {
  flag: string;
  severity: "low" | "medium" | "high";
  source: string;
}

/** Score breakdown across 5 rubric dimensions (each 1-10) */
export interface ScoreBreakdown {
  financialHealth: number;
  valuation: number;
  momentum: number;
  riskProfile: number;
  competitivePosition: number;
}

/** Final investment decision from the Synthesis node */
export interface Decision {
  verdict: "Invest" | "Pass";
  confidence: number; // 0-100
  executiveSummary: string;
  pros: string[];
  cons: string[];
  scoreBreakdown: ScoreBreakdown;
}

/** Node status for pipeline progress tracking */
export type NodeStatus = "pending" | "running" | "completed" | "error";

/** Pipeline node metadata for UI progress display */
export interface PipelineNode {
  id: string;
  label: string;
  status: NodeStatus;
  description: string;
}

/** Detailed company overview gathered from web search */
export interface CompanyOverview {
  summary: string;
  businessModel: string;
  fundingValuation: string;
  keyProducts: string[];
}

/** Full agent state — the contract between all nodes */
export interface AgentState {
  companyName: string;
  currentNode: string;
  resolvedEntity?: ResolvedEntity;
  financials?: Financials;
  news?: NewsItem[];
  competitive?: CompetitiveAnalysis;
  risks?: RiskFlag[];
  overview?: CompanyOverview;
  decision?: Decision;
  errors: string[];
  completedNodes: string[];
}

/** Chat bubble message */
export interface ChatMessage {
  id: string;
  sender: "user" | "assistant";
  text: string;
  timestamp: string;
  analysisResult?: AgentState;
  isAnalyzing?: boolean;
  activeNode?: string;
  completedNodes?: string[];
}

/** SSE event sent from the API to the frontend */
export interface StreamEvent {
  type: "node_start" | "node_complete" | "node_error" | "final_result";
  node?: string;
  data?: Partial<AgentState>;
  error?: string;
  timestamp: string;
}

// ─── Debate-Driven Investment Committee & Document RAG Types ─────────

export type CommitteeRecommendation = "BUY" | "HOLD" | "AVOID";

export interface CommitteeDocument {
  doc_id: string;
  filename: string;
  page_count: number;
  chunk_count: number;
  file_size_bytes: number;
  uploaded_at: string;
  injection_warnings: string[];
}

export interface CitationRef {
  citation_id: string;
  doc_id: string;
  document_name: string;
  page_number: number;
  chunk_id: string;
  excerpt: string;
  score: number;
  prompt_injection_flagged: boolean;
}

export interface CitedFinding {
  claim: string;
  category: "financial" | "opportunity" | "risk" | "fact";
  citation_ids: string[];
}

export interface ResearchDossier {
  company_name: string;
  summary: string;
  financial_findings: CitedFinding[];
  opportunities: CitedFinding[];
  risks: CitedFinding[];
  supporting_facts: CitedFinding[];
  insufficient_evidence: boolean;
  evidence_gaps: string[];
  citations: CitationRef[];
}

export interface DebatePoint {
  point: string;
  reasoning: string;
  citation_ids: string[];
}

export interface AgentBrief {
  agent_name: string;
  stance: "BUY" | "AVOID";
  thesis: string;
  arguments: DebatePoint[];
  acknowledged_gaps: string[];
}

export interface ArgumentExchange {
  bull_brief: AgentBrief;
  bear_brief: AgentBrief;
  contested_topics: string[];
}

export interface RebuttalItem {
  opposing_claim: string;
  counter_argument: string;
  citation_ids: string[];
}

export interface SideRebuttal {
  agent_name: string;
  responding_to: string;
  summary: string;
  rebuttals: RebuttalItem[];
  acknowledged_gaps: string[];
}

export interface RebuttalSuite {
  bull_rebuttal: SideRebuttal;
  bear_rebuttal: SideRebuttal;
}

export interface JudgeEvaluation {
  recommendation: CommitteeRecommendation;
  reasoning: string;
  bull_strengths: string[];
  bear_strengths: string[];
  deciding_factors: string[];
  cited_evidence_ids: string[];
  evidence_sufficiency: "sufficient" | "partial" | "insufficient";
}

export interface RiskCriteriaBreakdown {
  financial_leverage_risk: number;
  operational_execution_risk: number;
  regulatory_legal_governance_risk: number;
  market_competitive_risk: number;
  evidence_uncertainty_risk: number;
}

export interface RiskDriver {
  risk: string;
  severity: "low" | "medium" | "high" | "critical";
  criteria_category: string;
  citation_ids: string[];
}

export interface RiskAssessment {
  risk_score: number;
  criteria_breakdown: RiskCriteriaBreakdown;
  criteria_rationales: Record<string, string>;
  key_risk_drivers: RiskDriver[];
  assessment_summary: string;
}

export interface DecisionEnforcementResult {
  judge_recommendation: CommitteeRecommendation;
  risk_score: number;
  risk_veto_threshold: number;
  veto_triggered: boolean;
  veto_explanation: string;
  final_decision: CommitteeRecommendation;
  final_decision_explanation: string;
}

export interface ExecutionStepTrace {
  step_number: number;
  agent_id: string;
  agent_name: string;
  status: "completed" | "warning" | "error";
  started_at: string;
  completed_at: string;
  summary: string;
}

export interface InvestmentCommitteeReport {
  report_id: string;
  created_at: string;
  company_name: string;
  query: string;
  document_ids: string[];
  documents_analyzed: CommitteeDocument[];
  research: ResearchDossier;
  bull_argument: AgentBrief;
  bear_argument: AgentBrief;
  argument_exchange: ArgumentExchange;
  rebuttals: RebuttalSuite;
  judge_evaluation: JudgeEvaluation;
  risk_assessment: RiskAssessment;
  decision_enforcement: DecisionEnforcementResult;
  final_decision: CommitteeRecommendation;
  veto_triggered: boolean;
  final_decision_explanation: string;
  citation_map: Record<string, CitationRef>;
  execution_trace: ExecutionStepTrace[];
  warnings: string[];
}

export interface CommitteeStepState {
  id: string;
  label: string;
  description: string;
  status: NodeStatus;
  summary?: string;
}

export interface CommitteeStreamEvent {
  type: "stage_start" | "stage_complete" | "stage_error" | "final_report" | "error";
  stage?: string;
  label?: string;
  summary?: string;
  data?: unknown;
  report?: InvestmentCommitteeReport;
  error?: string;
  timestamp: string;
}

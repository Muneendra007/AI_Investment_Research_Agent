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

// ─── Node ③: Synthesis / Decision ─────────────────────────────────────
// The final node that weighs all upstream signals against an explicit
// investment rubric and produces an Invest/Pass verdict with confidence
// score, reasoning, and per-dimension score breakdown.

import { z } from "zod";
import type { AgentGraphState } from "@/backend/state";
import { llm } from "@/backend/services/llm";

/** Zod schema for the final investment decision */
const DecisionSchema = z.object({
  verdict: z.enum(["Invest", "Pass"]).describe("Final investment recommendation"),
  confidence: z
    .number()
    .min(0)
    .max(100)
    .describe("Confidence in the verdict as a percentage (0-100)"),
  executiveSummary: z
    .string()
    .describe(
      "A simple 1-2 sentence executive summary of the recommendation in clear, plain English for a layperson retail user. Be direct about whether they should invest."
    ),
  pros: z
    .array(z.string())
    .min(2)
    .max(4)
    .describe(
      "2-4 explicit reasons to invest, highlighting financial strengths, competitive advantages, or growth drivers"
    ),
  cons: z
    .array(z.string())
    .min(2)
    .max(4)
    .describe(
      "2-4 explicit risks or reasons to pass/cautious, highlighting valuation concerns, risk flags, or market headwinds"
    ),
  scoreBreakdown: z.object({
    financialHealth: z
      .number()
      .min(1)
      .max(10)
      .describe("Score 1-10: revenue growth, margins, debt levels"),
    valuation: z
      .number()
      .min(1)
      .max(10)
      .describe("Score 1-10: P/E vs sector, price relative to intrinsic value"),
    momentum: z
      .number()
      .min(1)
      .max(10)
      .describe("Score 1-10: news sentiment, recent price momentum"),
    riskProfile: z
      .number()
      .min(1)
      .max(10)
      .describe("Score 1-10: 10=low risk, 1=high risk. Inverse of risk severity."),
    competitivePosition: z
      .number()
      .min(1)
      .max(10)
      .describe("Score 1-10: moat strength, market position durability"),
  }),
});

/** Format financial data for the LLM prompt */
function formatFinancials(state: AgentGraphState): string {
  const f = state.financials;
  if (!f) return "Financial data: NOT AVAILABLE (reduce confidence accordingly)";

  const lines: string[] = [
    `Current Price: $${f.currentPrice.toFixed(2)} (${f.change >= 0 ? "+" : ""}${f.changePercent.toFixed(2)}%)`,
    `52-Week Range: $${f.low52Week.toFixed(2)} - $${f.high52Week.toFixed(2)}`,
  ];

  if (f.peRatio !== null) lines.push(`P/E Ratio (TTM): ${f.peRatio.toFixed(1)}`);
  if (f.marketCap !== null) lines.push(`Market Cap: $${(f.marketCap / 1e9).toFixed(2)}B`);
  if (f.revenueGrowth !== null) lines.push(`Revenue Growth (YoY): ${f.revenueGrowth.toFixed(1)}%`);
  if (f.grossMargin !== null) lines.push(`Gross Margin: ${f.grossMargin.toFixed(1)}%`);
  if (f.operatingMargin !== null) lines.push(`Operating Margin: ${f.operatingMargin.toFixed(1)}%`);
  if (f.netMargin !== null) lines.push(`Net Margin: ${f.netMargin.toFixed(1)}%`);
  if (f.debtToEquity !== null) lines.push(`Debt-to-Equity: ${f.debtToEquity.toFixed(2)}`);
  if (f.returnOnEquity !== null) lines.push(`Return on Equity: ${f.returnOnEquity.toFixed(1)}%`);
  if (f.beta !== null) lines.push(`Beta (5Y): ${f.beta.toFixed(2)}`);

  return `Financial Metrics:\n${lines.join("\n")}`;
}

/** Format news sentiment summary */
function formatNews(state: AgentGraphState): string {
  const news = state.news;
  if (!news || news.length === 0) return "News: NO RECENT NEWS AVAILABLE";

  const sentimentCounts = { positive: 0, neutral: 0, negative: 0 };
  for (const n of news) sentimentCounts[n.sentiment]++;

  const summary = `News Sentiment (last 90 days): ${news.length} articles — ${sentimentCounts.positive} positive, ${sentimentCounts.neutral} neutral, ${sentimentCounts.negative} negative`;

  const headlines = news
    .slice(0, 5)
    .map((n) => `  [${n.sentiment.toUpperCase()}] ${n.headline} (${n.date})`)
    .join("\n");

  return `${summary}\nKey Headlines:\n${headlines}`;
}

/** Format competitive analysis */
function formatCompetitive(state: AgentGraphState): string {
  const c = state.competitive;
  if (!c) return "Competitive Analysis: NOT AVAILABLE";

  return `Competitive Analysis:
Peers: ${c.peers.join(", ")}
Market Position: ${c.marketPositionSummary}
Moat Assessment: ${c.moatAssessment}`;
}

/** Format risk flags */
function formatRisks(state: AgentGraphState): string {
  const r = state.risks;
  if (!r || r.length === 0) return "Risk Flags: NONE IDENTIFIED";

  const flagList = r
    .map((f) => `  [${f.severity.toUpperCase()}] ${f.flag} (Source: ${f.source})`)
    .join("\n");

  const highCount = r.filter((f) => f.severity === "high").length;
  const medCount = r.filter((f) => f.severity === "medium").length;

  return `Risk Flags: ${r.length} identified (${highCount} high, ${medCount} medium)\n${flagList}`;
}

/** Format company web overview context */
function formatOverview(state: AgentGraphState): string {
  const o = state.overview;
  if (!o) return "Company Overview: NOT AVAILABLE";

  return `Company Overview & Web Insights:
Summary: ${o.summary}
Business Model: ${o.businessModel}
Funding & Valuation: ${o.fundingValuation}
Key Offerings: ${o.keyProducts.join(", ")}`;
}

export async function synthesisNode(
  state: AgentGraphState
): Promise<Partial<AgentGraphState>> {
  const { resolvedEntity } = state;

  if (!resolvedEntity) {
    return {
      currentNode: "synthesis",
      decision: {
        verdict: "Pass",
        confidence: 0,
        executiveSummary: "Unable to make a decision: the company entity could not be resolved.",
        pros: [],
        cons: ["Entity resolution failed"],
        scoreBreakdown: {
          financialHealth: 1,
          valuation: 1,
          momentum: 1,
          riskProfile: 1,
          competitivePosition: 1,
        },
      },
      completedNodes: ["synthesis"],
    };
  }

  try {
    // Count data availability for confidence adjustment
    const dataGaps: string[] = [];
    if (!state.financials) dataGaps.push("financials");
    if (!state.news || state.news.length === 0) dataGaps.push("news");
    if (!state.competitive) dataGaps.push("competitive analysis");
    if (!state.risks) dataGaps.push("risk assessment");

    const structuredLlm = llm.withStructuredOutput(DecisionSchema);
    const decision = await structuredLlm.invoke(
      `You are a senior investment analyst evaluating ${resolvedEntity.name} (${resolvedEntity.ticker}) in ${resolvedEntity.sector}.

RESEARCH DATA:
${formatOverview(state)}
${formatFinancials(state)}
${formatNews(state)}
${formatCompetitive(state)}
${formatRisks(state)}

RULES:
- Evaluate Financial Health, Valuation, Momentum, Risk Profile (10=low risk, 1=high risk), and Competitive Position (1-10 each).
- Average score >= 6.0 -> Invest; else Pass.
- Confidence: 0-95% (reduce if missing data or high risks).
- Provide a plain-English executive summary, 2-4 pros, and 2-4 cons citing specific numbers.`
    );

    return {
      currentNode: "synthesis",
      decision: {
        verdict: decision.verdict,
        confidence: Math.min(decision.confidence, 95), // Cap at 95 — epistemic humility
        executiveSummary: decision.executiveSummary,
        pros: decision.pros,
        cons: decision.cons,
        scoreBreakdown: decision.scoreBreakdown,
      },
      completedNodes: ["synthesis"],
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return {
      currentNode: "synthesis",
      errors: [`Synthesis failed: ${message}`],
      decision: {
        verdict: "Pass",
        confidence: 0,
        executiveSummary: `The decision engine encountered an error: ${message}. Defaulting to Pass.`,
        pros: [],
        cons: ["System error occurred"],
        scoreBreakdown: {
          financialHealth: 1,
          valuation: 1,
          momentum: 1,
          riskProfile: 1,
          competitivePosition: 1,
        },
      },
      completedNodes: ["synthesis"],
    };
  }
}

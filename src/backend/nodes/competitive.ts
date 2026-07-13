// ─── Node ②c: Competitive Analysis ───────────────────────────────────
// Identifies peers and assesses market position using Finnhub peer
// data + LLM reasoning. Clearly labeled as LLM-generated analysis.

import { z } from "zod";
import type { AgentGraphState } from "@/backend/state";
import { llmCreative } from "@/backend/services/llm";
import { getPeers } from "@/backend/services/finnhub";

/** Zod schema for competitive analysis output */
const CompetitiveSchema = z.object({
  peers: z
    .array(z.string())
    .describe("List of 3-5 key competitor ticker symbols or company names"),
  marketPositionSummary: z
    .string()
    .describe(
      "2-3 sentence summary of the company's market position relative to competitors"
    ),
  moatAssessment: z
    .string()
    .describe(
      "Assessment of competitive moat: brand, network effects, switching costs, scale advantages, IP, etc."
    ),
});

export async function competitiveNode(
  state: AgentGraphState
): Promise<Partial<AgentGraphState>> {
  const { resolvedEntity } = state;

  if (!resolvedEntity?.ticker) {
    return {
      currentNode: "competitiveAnalysis",
      errors: ["Competitive analysis skipped: no ticker resolved"],
      completedNodes: ["competitiveAnalysis"],
    };
  }

  const ticker = resolvedEntity.ticker;

  try {
    // Get Finnhub peers list (factual data)
    const finnhubPeers = await getPeers(ticker);

    // Filter out the company itself from peers
    const filteredPeers = finnhubPeers.filter(
      (p) => p !== ticker && p.length > 0
    );

    // LLM analysis incorporating peer data
    const structuredLlm = llmCreative.withStructuredOutput(CompetitiveSchema);
    const analysis = await structuredLlm.invoke(
      `You are a competitive strategy analyst. Analyze the competitive landscape for:

Company: ${resolvedEntity.name} (${ticker})
Sector: ${resolvedEntity.sector}
${filteredPeers.length > 0 ? `Known peers from financial data: ${filteredPeers.slice(0, 8).join(", ")}` : ""}

Provide:
1. The 3-5 most relevant direct competitors (use the peer data if available, supplement with your knowledge)
2. A concise market position summary (market share insights, growth trajectory, differentiation)
3. A moat assessment covering: brand strength, network effects, switching costs, scale advantages, intellectual property, regulatory advantages

Be specific and analytical. This is labeled as AI-generated analysis for the user.`
    );

    return {
      currentNode: "competitiveAnalysis",
      competitive: {
        peers:
          analysis.peers.length > 0
            ? analysis.peers
            : filteredPeers.slice(0, 5),
        marketPositionSummary: analysis.marketPositionSummary,
        moatAssessment: analysis.moatAssessment,
      },
      completedNodes: ["competitiveAnalysis"],
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return {
      currentNode: "competitiveAnalysis",
      errors: [
        `Competitive analysis failed for ${ticker}: ${message}`,
      ],
      completedNodes: ["competitiveAnalysis"],
    };
  }
}

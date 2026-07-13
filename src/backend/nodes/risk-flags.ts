// ─── Node ②d: Risk Flags ──────────────────────────────────────────────
// Identifies regulatory, legal, governance, and operational risk flags.
// Uses LLM reasoning with structured output for severity classification.

import { z } from "zod";
import type { AgentGraphState } from "@/backend/state";
import { llmCreative } from "@/backend/services/llm";

/** Zod schema for risk flags output */
const RiskFlagsSchema = z.object({
  flags: z.array(
    z.object({
      flag: z
        .string()
        .describe("Clear, specific description of the risk"),
      severity: z
        .enum(["low", "medium", "high"])
        .describe("Severity level of the risk"),
      source: z
        .string()
        .describe(
          "Where this risk is evidenced: recent news, regulatory filings, industry analysis, etc."
        ),
    })
  ),
});

export async function riskFlagsNode(
  state: AgentGraphState
): Promise<Partial<AgentGraphState>> {
  const { resolvedEntity, news } = state;

  if (!resolvedEntity?.ticker) {
    return {
      currentNode: "riskFlags",
      errors: ["Risk analysis skipped: no ticker resolved"],
      completedNodes: ["riskFlags"],
    };
  }

  try {
    // Build context from available news
    const newsContext =
      news && news.length > 0
        ? `\nRecent news headlines:\n${news
            .map(
              (n) =>
                `- [${n.sentiment.toUpperCase()}] ${n.headline} (${n.date})`
            )
            .join("\n")}`
        : "\nNo recent news available — rely on general knowledge.";

    const structuredLlm = llmCreative.withStructuredOutput(RiskFlagsSchema);
    const result = await structuredLlm.invoke(
      `You are a risk analyst evaluating investment risks for:

Company: ${resolvedEntity.name} (${resolvedEntity.ticker})
Sector: ${resolvedEntity.sector}
Country: ${resolvedEntity.country || "Unknown"}
${newsContext}

Identify concrete risk flags across these categories:
1. **Regulatory/Legal**: Active lawsuits, regulatory investigations, compliance issues, antitrust concerns
2. **Governance**: Leadership changes, board conflicts, executive departures, compensation controversies
3. **Operational**: Supply chain vulnerabilities, key person dependencies, technology disruption threats
4. **Financial**: Debt concerns, cash flow issues, accounting irregularities
5. **Market**: Competitive threats, market saturation, changing consumer preferences

For each flag:
- Be specific (not generic industry risks — things specific to THIS company)
- Assign severity honestly: "high" = material impact on investment thesis, "medium" = notable concern, "low" = worth monitoring
- Cite the evidence source

If the company appears low-risk, still identify 1-2 monitoring items. No company has zero risks.
Return 3-7 flags total, ordered by severity.`
    );

    return {
      currentNode: "riskFlags",
      risks: result.flags,
      completedNodes: ["riskFlags"],
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return {
      currentNode: "riskFlags",
      errors: [
        `Risk analysis failed for ${resolvedEntity.ticker}: ${message}`,
      ],
      completedNodes: ["riskFlags"],
    };
  }
}

// ─── Node ②e: Company Overview ─────────────────────────────────────────
// Gathers high-level insights (business model, funding/valuation, key products)
// from the web using Tavily Search API + LLM structured synthesis.
// Fills empty space on the left column and supports non-public research.

import { z } from "zod";
import type { AgentGraphState } from "@/backend/state";
import { llm } from "@/backend/services/llm";
import { tavilySearch } from "@/backend/services/tavily";

/** Zod schema for structured Company Overview */
const OverviewSchema = z.object({
  summary: z
    .string()
    .describe(
      "A 1-2 sentence high-level summary of who the company is and what they do in plain English."
    ),
  businessModel: z
    .string()
    .describe(
      "A clear explanation of how the company makes money (e.g. SaaS subscription, ad-revenue, direct consumer sales)."
    ),
  fundingValuation: z
    .string()
    .describe(
      "Estimated valuation, recent funding rounds, revenue figures, or public market capitalization. Citing concrete numbers if found, or stating estimates if private."
    ),
  keyProducts: z
    .array(z.string())
    .min(2)
    .max(5)
    .describe("List of 2-5 flagship products, services, or core features."),
});

export async function companyOverviewNode(
  state: AgentGraphState
): Promise<Partial<AgentGraphState>> {
  const { resolvedEntity } = state;

  if (!resolvedEntity) {
    return {
      currentNode: "companyOverview",
      errors: ["Company overview skipped: entity not resolved"],
      completedNodes: ["companyOverview"],
    };
  }

  const queryName = resolvedEntity.name;

  try {
    // Perform web search via Tavily
    const searchResult = await tavilySearch(
      `"${queryName}" business model valuation estimated revenue key products`,
      5,
      true
    );

    if (!searchResult || searchResult.results.length === 0) {
      const structuredLlm = llm.withStructuredOutput(OverviewSchema);
      const overview = await structuredLlm.invoke(
        `You are an equity research analyst compiling a clean business overview for: ${resolvedEntity.name} (${resolvedEntity.ticker || "Private"}).
Sector: ${resolvedEntity.sector}.

Provide a high-level summary of who the company is and what they do, their business model (how they make money), estimated valuation/funding or market cap, and 2-5 flagship products or services.
Translate complex finance jargon into clear details for a retail investor.`
      );

      return {
        currentNode: "companyOverview",
        overview: {
          summary: overview.summary,
          businessModel: overview.businessModel,
          fundingValuation: overview.fundingValuation,
          keyProducts: overview.keyProducts,
        },
        completedNodes: ["companyOverview"],
      };
    }

    // Format concise search results for LLM (token efficient)
    const contextList = searchResult.results
      .slice(0, 3)
      .map((r, i) => `[${i + 1}] ${r.title}: ${r.content.slice(0, 250)}`)
      .join("\n");

    const answerContext = searchResult.answer
      ? `Overview Context: ${searchResult.answer.slice(0, 300)}\n`
      : "";

    // Invoke LLM to structure the overview
    const structuredLlm = llm.withStructuredOutput(OverviewSchema);
    const overview = await structuredLlm.invoke(
      `You are an equity research analyst compiling a business overview for: ${resolvedEntity.name}.
      
Context:
${answerContext}${contextList}

Provide a high-level summary, business model, funding/valuation, and 2-4 key products.`
    );

    return {
      currentNode: "companyOverview",
      overview: {
        summary: overview.summary,
        businessModel: overview.businessModel,
        fundingValuation: overview.fundingValuation,
        keyProducts: overview.keyProducts,
      },
      completedNodes: ["companyOverview"],
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return {
      currentNode: "companyOverview",
      errors: [`Company overview gathering failed: ${message}`],
      completedNodes: ["companyOverview"],
    };
  }
}

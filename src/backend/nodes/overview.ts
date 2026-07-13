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
      return {
        currentNode: "companyOverview",
        overview: {
          summary: `${resolvedEntity.name} is a resolved entity in the ${resolvedEntity.sector} sector. No additional web search results were found.`,
          businessModel: "Details not available from web search.",
          fundingValuation: resolvedEntity.marketCap
            ? `Public Market Cap: $${(resolvedEntity.marketCap / 1e9).toFixed(2)}B`
            : "Private company / estimates not available.",
          keyProducts: ["Core services"],
        },
        completedNodes: ["companyOverview"],
      };
    }

    // Format search results for LLM
    const contextList = searchResult.results
      .map((r, i) => `[Result ${i + 1}] Title: ${r.title}\nContent: ${r.content}`)
      .join("\n\n");

    const answerContext = searchResult.answer
      ? `AI Answer Summary: ${searchResult.answer}\n\n`
      : "";

    // Invoke LLM to structure the overview
    const structuredLlm = llm.withStructuredOutput(OverviewSchema);
    const overview = await structuredLlm.invoke(
      `You are an equity research analyst compiling a clean business overview for: ${resolvedEntity.name}.
      
Use the following live web search results as your context:
${answerContext}${contextList}

Compile this data into the requested structured output. Translate complex finance jargon into clear details for a retail investor.`
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

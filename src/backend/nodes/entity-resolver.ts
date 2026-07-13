// ─── Node ①: Entity Resolver ──────────────────────────────────────────
// Resolves a raw company name (e.g., "Tesla", "Tata", "Apple") into
// a structured entity with ticker, sector, exchange, etc.
//
// Strategy:
// 1. Try Finnhub symbol search first (fast, factual)
// 2. If ambiguous or no results, use LLM to resolve
// 3. Validate resolved ticker against Finnhub profile

import { z } from "zod";
import type { AgentGraphState } from "@/backend/state";
import { llm } from "@/backend/services/llm";
import {
  symbolSearch,
  getCompanyProfile,
} from "@/backend/services/finnhub";

/** Zod schema for LLM structured output */
const EntitySchema = z.object({
  ticker: z
    .string()
    .describe("The stock ticker symbol (e.g., AAPL, TSLA, TCS.NS)"),
  name: z.string().describe("Full official company name"),
  sector: z
    .string()
    .describe("Industry sector (e.g., Technology, Healthcare, Finance)"),
  exchange: z
    .string()
    .describe("Stock exchange (e.g., NASDAQ, NYSE, NSE, BSE)"),
  country: z.string().describe("Country of headquarters"),
  reasoning: z
    .string()
    .describe(
      "Brief explanation of why this entity was chosen, especially if the name was ambiguous"
    ),
});

export async function entityResolverNode(
  state: AgentGraphState
): Promise<Partial<AgentGraphState>> {
  const { companyName } = state;

  try {
    // Step 1: Try Finnhub symbol search
    const searchResult = await symbolSearch(companyName);

    let ticker: string | null = null;
    let finnhubProfile = null;

    if (searchResult && searchResult.count > 0) {
      // Filter for common stock types and US exchanges first
      const stockResults = searchResult.result.filter(
        (r) =>
          r.type === "Common Stock" ||
          r.type === "EQS" ||
          r.type === ""
      );

      if (stockResults.length > 0) {
        ticker = stockResults[0].symbol;
      } else {
        ticker = searchResult.result[0].symbol;
      }

      // Validate with profile
      finnhubProfile = await getCompanyProfile(ticker);
    }

    // Step 2: If Finnhub didn't work well, use LLM
    if (!finnhubProfile || !finnhubProfile.name) {
      const structuredLlm = llm.withStructuredOutput(EntitySchema);
      const llmResult = await structuredLlm.invoke(
        `You are a financial entity resolver. Given the company name "${companyName}", identify the most likely publicly traded company.

If the name is ambiguous (e.g., "Tata" could be TCS, Tata Motors, Tata Steel), pick the largest/most well-known entity and note the ambiguity in your reasoning.

If this is likely a private company with no public ticker, use your best judgment for the ticker field and note that financial data may be limited.

Respond with the structured entity information.`
      );

      // Try to get Finnhub profile with the LLM-resolved ticker
      if (llmResult.ticker) {
        finnhubProfile = await getCompanyProfile(llmResult.ticker);
      }

      // Build resolved entity from LLM + Finnhub data
      return {
        currentNode: "entityResolver",
        resolvedEntity: {
          ticker: llmResult.ticker,
          name: finnhubProfile?.name || llmResult.name,
          sector:
            finnhubProfile?.finnhubIndustry || llmResult.sector,
          exchange: finnhubProfile?.exchange || llmResult.exchange,
          logo: finnhubProfile?.logo,
          marketCap: finnhubProfile?.marketCapitalization
            ? finnhubProfile.marketCapitalization * 1_000_000
            : undefined,
          country: finnhubProfile?.country || llmResult.country,
          currency: finnhubProfile?.currency,
        },
        completedNodes: ["entityResolver"],
      };
    }

    // Step 3: Build from Finnhub profile directly
    return {
      currentNode: "entityResolver",
      resolvedEntity: {
        ticker: finnhubProfile.ticker,
        name: finnhubProfile.name,
        sector: finnhubProfile.finnhubIndustry,
        exchange: finnhubProfile.exchange,
        logo: finnhubProfile.logo,
        marketCap: finnhubProfile.marketCapitalization
          ? finnhubProfile.marketCapitalization * 1_000_000
          : undefined,
        country: finnhubProfile.country,
        currency: finnhubProfile.currency,
      },
      completedNodes: ["entityResolver"],
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return {
      currentNode: "entityResolver",
      errors: [
        `Entity resolution failed for "${companyName}": ${message}`,
      ],
      completedNodes: ["entityResolver"],
    };
  }
}

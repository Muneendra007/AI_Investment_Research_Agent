// ─── Node ②a: Financial Data ──────────────────────────────────────────
// Fetches financial metrics from Finnhub: quote, metrics, profile.
// Degrades gracefully when data points are missing (common for
// non-US or smaller companies).

import type { AgentGraphState } from "@/backend/state";
import {
  getQuote,
  getMetrics,
} from "@/backend/services/finnhub";

export async function financialDataNode(
  state: AgentGraphState
): Promise<Partial<AgentGraphState>> {
  const { resolvedEntity } = state;

  if (!resolvedEntity?.ticker) {
    return {
      currentNode: "financialData",
      errors: ["Financial data skipped: no ticker resolved"],
      completedNodes: ["financialData"],
    };
  }

  const ticker = resolvedEntity.ticker;

  try {
    // Fetch quote and metrics in parallel
    const [quote, metrics] = await Promise.all([
      getQuote(ticker),
      getMetrics(ticker),
    ]);

    if (!quote || quote.c === 0) {
      return {
        currentNode: "financialData",
        errors: [
          `No quote data available for ${ticker}. This may be a non-US stock or an unsupported symbol.`,
        ],
        completedNodes: ["financialData"],
      };
    }

    const m = metrics?.metric || {};

    return {
      currentNode: "financialData",
      financials: {
        currentPrice: quote.c,
        change: quote.d,
        changePercent: quote.dp,
        high52Week: m["52WeekHigh"] ?? 0,
        low52Week: m["52WeekLow"] ?? 0,
        peRatio: m.peBasicExclExtraTTM ?? m.peTTM ?? null,
        peerAvgPE: null, // Will be enriched by competitive node if needed
        marketCap: resolvedEntity.marketCap ?? null,
        revenueGrowth: m.revenueGrowthTTMYoy ?? null,
        grossMargin: m.grossMarginTTM ?? null,
        operatingMargin: m.operatingMarginTTM ?? null,
        netMargin: m.netProfitMarginTTM ?? null,
        debtToEquity: m.totalDebtToEquityQuarterly ?? null,
        returnOnEquity: m.roeTTM ?? null,
        beta: m.betaMonthly5Y ?? null,
      },
      completedNodes: ["financialData"],
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return {
      currentNode: "financialData",
      errors: [
        `Financial data fetch failed for ${ticker}: ${message}`,
      ],
      completedNodes: ["financialData"],
    };
  }
}

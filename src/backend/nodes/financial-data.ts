// ─── Node ②a: Financial Data ──────────────────────────────────────────
// Fetches financial metrics from Finnhub: quote, metrics, profile.
// Degrades gracefully when data points are missing (common for
// non-US or smaller companies).

import type { AgentGraphState } from "@/backend/state";
import {
  getQuote,
  getMetrics,
} from "@/backend/services/finnhub";
import {
  getAlphaVantageQuote,
  getAlphaVantageOverview,
} from "@/backend/services/alphavantage";

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
    // Fetch quote and metrics from Finnhub first
    let [quote, metrics] = await Promise.all([
      getQuote(ticker),
      getMetrics(ticker),
    ]);

    // Fallback: Try Alpha Vantage if Finnhub returns no quote
    if (!quote || quote.c === 0) {
      const avQuote = await getAlphaVantageQuote(ticker);
      if (avQuote && avQuote.price > 0) {
        const avOverview = await getAlphaVantageOverview(ticker);
        const pe = avOverview?.PERatio ? parseFloat(avOverview.PERatio) : null;
        const revGrowth = avOverview?.QuarterlyRevenueGrowthYOY
          ? parseFloat(avOverview.QuarterlyRevenueGrowthYOY) * 100
          : null;
        const opMargin = avOverview?.OperatingMarginTTM
          ? parseFloat(avOverview.OperatingMarginTTM) * 100
          : null;
        const profitMargin = avOverview?.ProfitMargin
          ? parseFloat(avOverview.ProfitMargin) * 100
          : null;

        return {
          currentNode: "financialData",
          financials: {
            currentPrice: avQuote.price,
            change: avQuote.change,
            changePercent: avQuote.changePercent,
            high52Week: avQuote.high,
            low52Week: avQuote.low,
            peRatio: Number.isFinite(pe) ? pe : null,
            peerAvgPE: null,
            marketCap: resolvedEntity.marketCap ?? null,
            revenueGrowth: Number.isFinite(revGrowth) ? revGrowth : null,
            grossMargin: null,
            operatingMargin: Number.isFinite(opMargin) ? opMargin : null,
            netMargin: Number.isFinite(profitMargin) ? profitMargin : null,
            debtToEquity: null,
            returnOnEquity: null,
            beta: avOverview?.Beta ? parseFloat(avOverview.Beta) : null,
          },
          completedNodes: ["financialData"],
        };
      }

      return {
        currentNode: "financialData",
        errors: [
          `No quote data available for ${ticker}. This may be a private/unlisted company or an unsupported symbol.`,
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

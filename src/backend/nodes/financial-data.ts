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
} from "@/backend/services/alphavantage";
import {
  getFMPProfile,
  getFMPRatiosTTM,
} from "@/backend/services/fmp";

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
    // Parallel fetch from Finnhub and FMP
    const [quote, metrics, fmpRatios, fmpProfile] = await Promise.all([
      getQuote(ticker),
      getMetrics(ticker),
      getFMPRatiosTTM(ticker),
      getFMPProfile(ticker),
    ]);

    // Fallback: Try Alpha Vantage if Finnhub returns no quote
    let price = quote?.c ?? 0;
    let change = quote?.d ?? 0;
    let changePercent = quote?.dp ?? 0;

    if (price === 0) {
      if (fmpProfile?.price) {
        price = fmpProfile.price;
        change = fmpProfile.changes ?? 0;
        changePercent = fmpProfile.changes
          ? (fmpProfile.changes / (fmpProfile.price - fmpProfile.changes)) * 100
          : 0;
      } else {
        const avQuote = await getAlphaVantageQuote(ticker);
        if (avQuote && avQuote.price > 0) {
          price = avQuote.price;
          change = avQuote.change;
          changePercent = avQuote.changePercent;
        }
      }
    }

    if (price === 0) {
      return {
        currentNode: "financialData",
        errors: [
          `No quote data available for ${ticker}. This may be a private/unlisted company or an unsupported symbol.`,
        ],
        completedNodes: ["financialData"],
      };
    }

    const m = metrics?.metric || {};

    // Combine Finnhub + FMP for maximum coverage
    const peRatio =
      m.peBasicExclExtraTTM ??
      m.peTTM ??
      (fmpRatios?.peRatioTTM && Number.isFinite(fmpRatios.peRatioTTM)
        ? fmpRatios.peRatioTTM
        : null);

    const grossMargin =
      m.grossMarginTTM ??
      (fmpRatios?.grossProfitMarginTTM
        ? fmpRatios.grossProfitMarginTTM * 100
        : null);

    const operatingMargin =
      m.operatingMarginTTM ??
      (fmpRatios?.operatingProfitMarginTTM
        ? fmpRatios.operatingProfitMarginTTM * 100
        : null);

    const netMargin =
      m.netProfitMarginTTM ??
      (fmpRatios?.netProfitMarginTTM
        ? fmpRatios.netProfitMarginTTM * 100
        : null);

    const debtToEquity =
      m.totalDebtToEquityQuarterly ??
      (fmpRatios?.debtEquityRatioTTM && Number.isFinite(fmpRatios.debtEquityRatioTTM)
        ? fmpRatios.debtEquityRatioTTM
        : null);

    const returnOnEquity =
      m.roeTTM ??
      (fmpRatios?.returnOnEquityTTM
        ? fmpRatios.returnOnEquityTTM * 100
        : null);

    const beta = m.betaMonthly5Y ?? fmpProfile?.beta ?? null;
    const marketCap = resolvedEntity.marketCap ?? fmpProfile?.mktCap ?? null;

    return {
      currentNode: "financialData",
      financials: {
        currentPrice: price,
        change,
        changePercent,
        high52Week: m["52WeekHigh"] ?? 0,
        low52Week: m["52WeekLow"] ?? 0,
        peRatio,
        peerAvgPE: null,
        marketCap,
        revenueGrowth: m.revenueGrowthTTMYoy ?? null,
        grossMargin,
        operatingMargin,
        netMargin,
        debtToEquity,
        returnOnEquity,
        beta,
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

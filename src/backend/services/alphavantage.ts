// ─── Alpha Vantage API Client ──────────────────────────────────────────
// Secondary / fallback financial data client.
// Free tier: 25 calls/day (5 calls/min).

const ALPHA_VANTAGE_BASE = "https://www.alphavantage.co/query";

function getApiKey(): string | null {
  return process.env.ALPHA_VANTAGE_API_KEY || null;
}

export interface AlphaVantageQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
}

export interface AlphaVantageOverview {
  Symbol: string;
  Name: string;
  Sector: string;
  Industry: string;
  MarketCapitalization: string;
  PERatio: string;
  GrossProfitTTM: string;
  RevenueTTM: string;
  OperatingMarginTTM: string;
  ProfitMargin: string;
  QuarterlyRevenueGrowthYOY: string;
  Beta: string;
  [key: string]: string | undefined;
}

/** Get quote from Alpha Vantage */
export async function getAlphaVantageQuote(
  symbol: string
): Promise<AlphaVantageQuote | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  try {
    const url = `${ALPHA_VANTAGE_BASE}?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(
      symbol
    )}&apikey=${apiKey}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;

    const data = await res.json();
    const gq = data["Global Quote"];
    if (!gq || !gq["05. price"]) return null;

    return {
      symbol: gq["01. symbol"],
      price: parseFloat(gq["05. price"]),
      change: parseFloat(gq["09. change"] || "0"),
      changePercent: parseFloat((gq["10. change percent"] || "0%").replace("%", "")),
      high: parseFloat(gq["03. high"] || "0"),
      low: parseFloat(gq["04. low"] || "0"),
    };
  } catch (err) {
    console.error("Alpha Vantage quote error:", err);
    return null;
  }
}

/** Get company overview from Alpha Vantage */
export async function getAlphaVantageOverview(
  symbol: string
): Promise<AlphaVantageOverview | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  try {
    const url = `${ALPHA_VANTAGE_BASE}?function=OVERVIEW&symbol=${encodeURIComponent(
      symbol
    )}&apikey=${apiKey}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;

    const data = await res.json();
    if (!data.Symbol) return null;

    return data as AlphaVantageOverview;
  } catch (err) {
    console.error("Alpha Vantage overview error:", err);
    return null;
  }
}

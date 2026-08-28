// ─── Finnhub API Client ───────────────────────────────────────────────
// Wrapped API client for all Finnhub endpoints used by the agent.
// Free tier: 60 calls/min. All methods include error handling and
// response validation.

const FINNHUB_BASE = "https://finnhub.io/api/v1";

function getApiKey(): string | null {
  return process.env.FINNHUB_API_KEY || null;
}

/** Rate limiter: simple delay between calls (60/min ≈ 1/sec) */
let lastCallTime = 0;
async function rateLimitDelay(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastCallTime;
  if (elapsed < 1100) {
    await new Promise((resolve) => setTimeout(resolve, 1100 - elapsed));
  }
  lastCallTime = Date.now();
}

/** Generic fetch wrapper with error handling */
async function finnhubFetch<T>(endpoint: string, params: Record<string, string> = {}): Promise<T | null> {
  const apiKey = getApiKey();
  if (!apiKey) {
    return null;
  }

  await rateLimitDelay();

  const url = new URL(`${FINNHUB_BASE}${endpoint}`);
  url.searchParams.set("token", apiKey);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  try {
    const response = await fetch(url.toString(), {
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(10000), // 10s timeout
    });

    if (!response.ok) {
      console.error(`Finnhub API error: ${response.status} ${response.statusText} for ${endpoint}`);
      return null;
    }

    const data = await response.json();
    return data as T;
  } catch (error) {
    console.error(`Finnhub fetch error for ${endpoint}:`, error);
    return null;
  }
}

// ─── Finnhub Response Types ───────────────────────────────────────────

export interface FinnhubProfile {
  country: string;
  currency: string;
  exchange: string;
  finnhubIndustry: string;
  ipo: string;
  logo: string;
  marketCapitalization: number;
  name: string;
  phone: string;
  shareOutstanding: number;
  ticker: string;
  weburl: string;
}

export interface FinnhubQuote {
  c: number;  // Current price
  d: number;  // Change
  dp: number; // Percent change
  h: number;  // High price of the day
  l: number;  // Low price of the day
  o: number;  // Open price of the day
  pc: number; // Previous close price
  t: number;  // Timestamp
}

export interface FinnhubMetrics {
  metric: {
    "10DayAverageTradingVolume"?: number;
    "52WeekHigh"?: number;
    "52WeekLow"?: number;
    peBasicExclExtraTTM?: number;
    peExclExtraTTM?: number;
    peTTM?: number;
    revenueGrowthTTMYoy?: number;
    grossMarginTTM?: number;
    operatingMarginTTM?: number;
    netProfitMarginTTM?: number;
    totalDebtToEquityQuarterly?: number;
    roeTTM?: number;
    betaMonthly5Y?: number;
    currentRatioQuarterly?: number;
    [key: string]: number | undefined;
  };
}

export interface FinnhubNewsItem {
  category: string;
  datetime: number;
  headline: string;
  id: number;
  image: string;
  related: string;
  source: string;
  summary: string;
  url: string;
}

export interface FinnhubSymbolLookup {
  count: number;
  result: Array<{
    description: string;
    displaySymbol: string;
    symbol: string;
    type: string;
  }>;
}

// ─── API Methods ──────────────────────────────────────────────────────

/** Get company profile by ticker symbol */
export async function getCompanyProfile(ticker: string): Promise<FinnhubProfile | null> {
  return finnhubFetch<FinnhubProfile>("/stock/profile2", { symbol: ticker });
}

/** Get real-time quote */
export async function getQuote(ticker: string): Promise<FinnhubQuote | null> {
  return finnhubFetch<FinnhubQuote>("/quote", { symbol: ticker });
}

/** Get financial metrics (P/E, margins, debt, growth, etc.) */
export async function getMetrics(ticker: string): Promise<FinnhubMetrics | null> {
  return finnhubFetch<FinnhubMetrics>("/stock/metric", {
    symbol: ticker,
    metric: "all",
  });
}

/** Get company news for a date range */
export async function getCompanyNews(
  ticker: string,
  from: string,
  to: string
): Promise<FinnhubNewsItem[]> {
  const data = await finnhubFetch<FinnhubNewsItem[]>("/company-news", {
    symbol: ticker,
    from,
    to,
  });
  return data ?? [];
}

/** Get peer companies */
export async function getPeers(ticker: string): Promise<string[]> {
  const data = await finnhubFetch<string[]>("/stock/peers", { symbol: ticker });
  return data ?? [];
}

/** Search for a symbol by name */
export async function symbolSearch(query: string): Promise<FinnhubSymbolLookup | null> {
  return finnhubFetch<FinnhubSymbolLookup>("/search", { q: query });
}

// ─── Helpers ──────────────────────────────────────────────────────────

/** Format a Date as YYYY-MM-DD for Finnhub API */
export function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

/** Get date string for N days ago */
export function daysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return formatDate(date);
}

/** Get today's date as YYYY-MM-DD */
export function today(): string {
  return formatDate(new Date());
}

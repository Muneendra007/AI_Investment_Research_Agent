// ─── Financial Modeling Prep (FMP) Service ──────────────────────────────
// Uses the modern /stable endpoints to fetch real-time profiles, income statements,
// and key financial ratios.

const FMP_BASE = "https://financialmodelingprep.com/stable";

function getApiKey(): string | null {
  return process.env.FMP_API_KEY || null;
}

export interface FMPProfile {
  symbol: string;
  price: number;
  beta: number;
  volAvg: number;
  mktCap: number;
  lastDiv: number;
  range: string;
  changes: number;
  companyName: string;
  currency: string;
  isin: string;
  cusip: string;
  exchange: string;
  exchangeShortName: string;
  industry: string;
  website: string;
  description: string;
  ceo: string;
  sector: string;
  country: string;
  fullTimeEmployees: string;
  dcf: number;
  image: string;
}

export interface FMPRatiosTTM {
  peRatioTTM?: number;
  pegRatioTTM?: number;
  priceToBookRatioTTM?: number;
  returnOnEquityTTM?: number;
  returnOnAssetsTTM?: number;
  grossProfitMarginTTM?: number;
  operatingProfitMarginTTM?: number;
  netProfitMarginTTM?: number;
  debtEquityRatioTTM?: number;
  currentRatioTTM?: number;
  freeCashFlowPerShareTTM?: number;
}

export interface FMPIncomeStatement {
  date: string;
  symbol: string;
  revenue: number;
  grossProfit: number;
  operatingIncome: number;
  netIncome: number;
  eps: number;
  ebitda: number;
}

/** Fetch company profile from FMP stable */
export async function getFMPProfile(symbol: string): Promise<FMPProfile | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  try {
    const url = `${FMP_BASE}/profile?symbol=${encodeURIComponent(symbol)}&apikey=${apiKey}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;

    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      return data[0] as FMPProfile;
    }
    return null;
  } catch (err) {
    console.error("FMP profile error:", err);
    return null;
  }
}

/** Fetch TTM financial ratios from FMP stable */
export async function getFMPRatiosTTM(symbol: string): Promise<FMPRatiosTTM | null> {
  const apiKey = getApiKey();
  if (!apiKey) return null;

  try {
    const url = `${FMP_BASE}/ratios-ttm?symbol=${encodeURIComponent(symbol)}&apikey=${apiKey}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;

    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      return data[0] as FMPRatiosTTM;
    }
    return null;
  } catch (err) {
    console.error("FMP ratios-ttm error:", err);
    return null;
  }
}

/** Fetch recent income statements from FMP stable */
export async function getFMPIncomeStatements(
  symbol: string,
  limit = 2
): Promise<FMPIncomeStatement[]> {
  const apiKey = getApiKey();
  if (!apiKey) return [];

  try {
    const url = `${FMP_BASE}/income-statement?symbol=${encodeURIComponent(
      symbol
    )}&limit=${limit}&apikey=${apiKey}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return [];

    const data = await res.json();
    if (Array.isArray(data)) {
      return data.slice(0, limit) as FMPIncomeStatement[];
    }
    return [];
  } catch (err) {
    console.error("FMP income statement error:", err);
    return [];
  }
}

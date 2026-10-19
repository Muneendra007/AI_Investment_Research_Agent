// ─── SEC EDGAR Service ─────────────────────────────────────────────────
// Official US SEC EDGAR API client. Free and requires no API key.
// Provides company CIK lookup and recent official 10-K / 10-Q / 8-K filings.

const SEC_TICKER_MAP_URL = "https://www.sec.gov/files/company_tickers.json";
const SEC_SUBMISSIONS_BASE = "https://data.sec.gov/submissions";

let tickerToCikCache: Map<string, string> | null = null;

function getUserAgent(): string {
  return (
    process.env.SEC_EDGAR_USER_AGENT ||
    "InvestmentAgent hackie152@gmail.com"
  );
}

export interface SECFiling {
  accessionNumber: string;
  filingDate: string;
  reportDate: string;
  form: string;
  primaryDocument: string;
  primaryDocDescription: string;
}

/** Get CIK by ticker symbol from SEC company_tickers.json */
async function getCikForTicker(ticker: string): Promise<string | null> {
  const cleanTicker = ticker.trim().toUpperCase();

  if (!tickerToCikCache) {
    try {
      const res = await fetch(SEC_TICKER_MAP_URL, {
        headers: { "User-Agent": getUserAgent() },
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) return null;

      const data = await res.json();
      tickerToCikCache = new Map<string, string>();
      for (const key of Object.keys(data)) {
        const item = data[key];
        if (item.ticker && item.cik_str !== undefined) {
          tickerToCikCache.set(
            item.ticker.toUpperCase(),
            String(item.cik_str).padStart(10, "0")
          );
        }
      }
    } catch (err) {
      console.error("SEC EDGAR CIK mapping error:", err);
      return null;
    }
  }

  return tickerToCikCache.get(cleanTicker) || null;
}

/** Fetch recent official SEC filings for a company */
export async function getRecentSECFilings(
  ticker: string,
  limit = 5
): Promise<SECFiling[]> {
  try {
    const cik = await getCikForTicker(ticker);
    if (!cik) return [];

    const url = `${SEC_SUBMISSIONS_BASE}/CIK${cik}.json`;
    const res = await fetch(url, {
      headers: { "User-Agent": getUserAgent() },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];

    const data = await res.json();
    const recent = data?.filings?.recent;
    if (!recent || !recent.form) return [];

    const filings: SECFiling[] = [];
    const count = Math.min(recent.form.length, 50);

    for (let i = 0; i < count && filings.length < limit; i++) {
      const form = recent.form[i];
      // Target key reporting forms: 10-K (Annual), 10-Q (Quarterly), 8-K (Material events)
      if (form === "10-K" || form === "10-Q" || form === "8-K") {
        filings.push({
          accessionNumber: recent.accessionNumber[i],
          filingDate: recent.filingDate[i],
          reportDate: recent.reportDate[i],
          form: form,
          primaryDocument: recent.primaryDocument[i],
          primaryDocDescription: recent.primaryDocDescription?.[i] || form,
        });
      }
    }

    return filings;
  } catch (err) {
    console.error("SEC filings error:", err);
    return [];
  }
}

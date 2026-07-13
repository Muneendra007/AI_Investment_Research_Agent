// ─── Tavily Web Search API Client ─────────────────────────────────────
// Simple client to query Tavily API for fallback news and company overviews.

function getApiKey(): string {
  const key = process.env.TAVILY_API_KEY;
  if (!key) {
    throw new Error(
      "TAVILY_API_KEY is not set. Please add it to your .env file."
    );
  }
  return key;
}

export interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
  published_date?: string;
}

export interface TavilyResponse {
  results: TavilySearchResult[];
  answer?: string;
}

/**
 * Perform a web search using Tavily API.
 * - query: Search query string.
 * - maxResults: Limit of search results (default 5).
 * - includeAnswer: If true, returns an AI summary answer.
 */
export async function tavilySearch(
  query: string,
  maxResults = 5,
  includeAnswer = false
): Promise<TavilyResponse | null> {
  const apiKey = getApiKey();

  try {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: "basic",
        max_results: maxResults,
        include_answer: includeAnswer,
      }),
      signal: AbortSignal.timeout(10000), // 10s timeout
    });

    if (!response.ok) {
      console.error(
        `Tavily API error: ${response.status} ${response.statusText} for query: ${query}`
      );
      return null;
    }

    const data = await response.json();
    return data as TavilyResponse;
  } catch (error) {
    console.error(`Tavily search error for query: "${query}":`, error);
    return null;
  }
}

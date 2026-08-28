// ─── NewsAPI Client ───────────────────────────────────────────────────
// Secondary / fallback company news client.
// Free tier: 100 requests/day.

const NEWS_API_BASE = "https://newsapi.org/v2";

function getApiKey(): string | null {
  return process.env.NEWS_API_KEY || null;
}

export interface NewsApiArticle {
  source: { id: string | null; name: string };
  author: string | null;
  title: string;
  description: string | null;
  url: string;
  urlToImage: string | null;
  publishedAt: string;
  content: string | null;
}

export interface NewsApiResponse {
  status: string;
  totalResults: number;
  articles: NewsApiArticle[];
}

/** Fetch top company news from NewsAPI */
export async function getNewsApiArticles(
  query: string,
  pageSize = 5
): Promise<NewsApiArticle[]> {
  const apiKey = getApiKey();
  if (!apiKey) return [];

  try {
    const url = `${NEWS_API_BASE}/everything?q=${encodeURIComponent(
      query
    )}&pageSize=${pageSize}&sortBy=publishedAt&language=en&apiKey=${apiKey}`;

    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return [];

    const data = (await res.json()) as NewsApiResponse;
    if (data.status !== "ok" || !Array.isArray(data.articles)) return [];

    return data.articles;
  } catch (err) {
    console.error("NewsAPI fetch error:", err);
    return [];
  }
}

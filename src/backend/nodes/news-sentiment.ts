// ─── Node ②b: News & Sentiment ────────────────────────────────────────
// Fetches recent company news from Finnhub and batch-classifies
// sentiment in a single LLM call (cheaper than per-headline calls).

import { z } from "zod";
import type { AgentGraphState } from "@/backend/state";
import { llm } from "@/backend/services/llm";
import {
  getCompanyNews,
  daysAgo,
  today,
} from "@/backend/services/finnhub";
import { getNewsApiArticles } from "@/backend/services/newsapi";
import { tavilySearch } from "@/backend/services/tavily";
import type { NewsItem } from "@/frontend/types";

/** Zod schema for batch sentiment classification */
const SentimentBatchSchema = z.object({
  classifications: z.array(
    z.object({
      index: z.number().describe("0-based index of the headline"),
      sentiment: z
        .enum(["positive", "neutral", "negative"])
        .describe("Sentiment classification"),
    })
  ),
});

export async function newsSentimentNode(
  state: AgentGraphState
): Promise<Partial<AgentGraphState>> {
  const { resolvedEntity } = state;

  if (!resolvedEntity?.ticker) {
    return {
      currentNode: "newsSentiment",
      errors: ["News analysis skipped: no ticker resolved"],
      completedNodes: ["newsSentiment"],
    };
  }

  const ticker = resolvedEntity.ticker;

  try {
    // 1. Fetch news from last 90 days via Finnhub
    let rawNews = await getCompanyNews(ticker, daysAgo(90), today());

    // 2. Fallback: If no news on Finnhub, try NewsAPI
    if (!rawNews || rawNews.length === 0) {
      const newsApiArticles = await getNewsApiArticles(resolvedEntity.name, 10);
      if (newsApiArticles.length > 0) {
        rawNews = newsApiArticles.map((a, i) => ({
          category: "general",
          datetime: Math.floor(new Date(a.publishedAt).getTime() / 1000) || Math.floor(Date.now() / 1000) - i * 3600,
          headline: a.title,
          id: i,
          image: a.urlToImage || "",
          related: ticker,
          source: a.source.name || "NewsAPI",
          summary: a.description || a.content || "",
          url: a.url,
        }));
      }
    }

    // 3. Fallback: If still no news, search the web via Tavily
    if (!rawNews || rawNews.length === 0) {
      const searchResult = await tavilySearch(
        `"${resolvedEntity.name}" latest news headlines 2026`,
        10
      );

      if (searchResult && searchResult.results.length > 0) {
        rawNews = searchResult.results.map((r, i) => {
          let source = "Web Search";
          try {
            source = new URL(r.url).hostname.replace("www.", "");
          } catch {}

          let datetime = Math.floor(Date.now() / 1000) - i * 3600;
          if (r.published_date) {
            try {
              datetime = Math.floor(new Date(r.published_date).getTime() / 1000);
            } catch {}
          }

          return {
            category: "general",
            datetime,
            headline: r.title,
            id: i,
            image: "",
            related: ticker,
            source,
            summary: r.content,
            url: r.url,
          };
        });
      }
    }

    if (!rawNews || rawNews.length === 0) {
      return {
        currentNode: "newsSentiment",
        news: [],
        errors: [
          `No recent news found for ${resolvedEntity.name} (${ticker}). Sentiment analysis skipped.`,
        ],
        completedNodes: ["newsSentiment"],
      };
    }

    // Take top 6 most recent headlines
    const topNews = rawNews
      .sort((a, b) => b.datetime - a.datetime)
      .slice(0, 6);

    // Batch sentiment classification in ONE LLM call
    const headlineList = topNews
      .map((n, i) => `${i}. "${n.headline.slice(0, 140)}"`)
      .join("\n");

    const structuredLlm = llm.withStructuredOutput(SentimentBatchSchema);
    const sentimentResult = await structuredLlm.invoke(
      `Classify the sentiment of each headline for ${resolvedEntity.name} (${ticker}) as "positive", "neutral", or "negative":
${headlineList}`
    );

    // Build sentiment map
    const sentimentMap = new Map<number, "positive" | "neutral" | "negative">();
    for (const c of sentimentResult.classifications) {
      sentimentMap.set(c.index, c.sentiment);
    }

    // Merge into structured NewsItems
    const newsItems: NewsItem[] = topNews.map((n, i) => ({
      headline: n.headline,
      summary: n.summary || "",
      sentiment: sentimentMap.get(i) || "neutral",
      date: new Date(n.datetime * 1000).toISOString().split("T")[0],
      url: n.url,
      source: n.source,
    }));

    return {
      currentNode: "newsSentiment",
      news: newsItems,
      completedNodes: ["newsSentiment"],
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return {
      currentNode: "newsSentiment",
      errors: [
        `News sentiment analysis failed for ${ticker}: ${message}`,
      ],
      completedNodes: ["newsSentiment"],
    };
  }
}

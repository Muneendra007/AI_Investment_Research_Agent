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
    // Fetch news from last 90 days
    let rawNews = await getCompanyNews(ticker, daysAgo(90), today());

    // Fallback: If no news is found on Finnhub, search the web via Tavily
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

    // Take top 10 most recent headlines
    const topNews = rawNews
      .sort((a, b) => b.datetime - a.datetime)
      .slice(0, 10);

    // Batch sentiment classification in ONE LLM call
    const headlineList = topNews
      .map((n, i) => `${i}. "${n.headline}"`)
      .join("\n");

    const structuredLlm = llm.withStructuredOutput(SentimentBatchSchema);
    const sentimentResult = await structuredLlm.invoke(
      `You are a financial news sentiment classifier. Classify each headline as "positive", "neutral", or "negative" from an investor's perspective.

Consider:
- Positive: good earnings, growth, partnerships, product launches, upgrades
- Negative: lawsuits, investigations, downgrades, revenue misses, layoffs, scandals
- Neutral: routine announcements, minor updates, factual reports without clear impact

Headlines for ${resolvedEntity.name} (${ticker}):
${headlineList}

Classify each by its 0-based index.`
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

"use client";

import type { NewsItem } from "@/frontend/types";

interface NewsSentimentProps {
  news: NewsItem[];
}

export default function NewsSentiment({ news }: NewsSentimentProps) {
  if (!news || news.length === 0) {
    return (
      <div className="glass-card p-6 animate-slide-up stagger-4">
        <h3
          className="text-lg font-semibold mb-3"
          style={{ color: "var(--text-primary)" }}
        >
          📰 News & Sentiment
        </h3>
        <p
          className="text-sm"
          style={{ color: "var(--text-muted)" }}
        >
          No recent news available for this company.
        </p>
      </div>
    );
  }

  const sentimentCounts = { positive: 0, neutral: 0, negative: 0 };
  for (const n of news) sentimentCounts[n.sentiment]++;

  const total = news.length;
  const sentimentScore = (
    ((sentimentCounts.positive - sentimentCounts.negative) / total) *
    100
  ).toFixed(0);

  return (
    <div className="glass-card p-6 animate-slide-up stagger-4">
      {/* Header with sentiment summary */}
      <div className="flex items-center justify-between mb-4">
        <h3
          className="text-lg font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          📰 News & Sentiment
        </h3>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: "var(--sentiment-positive)" }} />
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              {sentimentCounts.positive}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: "var(--sentiment-neutral)" }} />
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              {sentimentCounts.neutral}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: "var(--sentiment-negative)" }} />
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              {sentimentCounts.negative}
            </span>
          </div>
          <span
            className="text-xs font-mono px-2 py-0.5 rounded-md"
            style={{
              background:
                Number(sentimentScore) > 0
                  ? "rgba(52, 211, 153, 0.15)"
                  : Number(sentimentScore) < 0
                    ? "rgba(248, 113, 113, 0.15)"
                    : "rgba(148, 163, 184, 0.15)",
              color:
                Number(sentimentScore) > 0
                  ? "var(--sentiment-positive)"
                  : Number(sentimentScore) < 0
                    ? "var(--sentiment-negative)"
                    : "var(--sentiment-neutral)",
            }}
          >
            {Number(sentimentScore) > 0 ? "+" : ""}
            {sentimentScore}%
          </span>
        </div>
      </div>

      {/* News list */}
      <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
        {news.map((item, i) => (
          <a
            key={i}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block p-3 rounded-xl transition-all duration-200 hover:scale-[1.01]"
            style={{
              background: "var(--surface-elevated)",
              textDecoration: "none",
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p
                  className="text-sm font-medium leading-snug line-clamp-2"
                  style={{ color: "var(--text-primary)" }}
                >
                  {item.headline}
                </p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span
                    className="text-xs"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {item.source}
                  </span>
                  <span
                    className="text-xs"
                    style={{ color: "var(--text-muted)" }}
                  >
                    ·
                  </span>
                  <span
                    className="text-xs"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {item.date}
                  </span>
                </div>
              </div>
              <span
                className={`badge-${item.sentiment} px-2 py-0.5 rounded-md text-xs font-medium flex-shrink-0`}
              >
                {item.sentiment}
              </span>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}

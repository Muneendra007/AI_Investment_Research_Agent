"use client";

import type { NewsItem } from "@/frontend/types";

interface NewsSentimentProps {
  news: NewsItem[];
}

export default function NewsSentiment({ news }: NewsSentimentProps) {
  if (!news || news.length === 0) {
    return (
      <div className="glass-card p-6 animate-slide-up stagger-4">
        <h3 className="text-base font-bold mb-2 text-slate-100 flex items-center gap-2">
          <span>📰</span> News & Sentiment Stream
        </h3>
        <p className="text-xs text-slate-400">
          No live media articles found for this symbol.
        </p>
      </div>
    );
  }

  const sentimentCounts = { positive: 0, neutral: 0, negative: 0 };
  for (const n of news) sentimentCounts[n.sentiment]++;

  const total = news.length;
  const netScore = total > 0 ? Math.round(((sentimentCounts.positive - sentimentCounts.negative) / total) * 100) : 0;

  return (
    <div className="glass-card p-6 animate-slide-up stagger-4">
      {/* Header with sentiment breakdown */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5 pb-3 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-sm">
            📰
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100">
              News & Media Sentiment
            </h3>
            <p className="text-[11px] text-slate-400">
              Live algorithmic NLP classification
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-[11px] font-mono text-slate-400 px-2 py-0.5 rounded bg-slate-900/60 border border-white/5">
            <span className="text-emerald-400 font-bold">{sentimentCounts.positive}</span> pos ·{" "}
            <span className="text-slate-400">{sentimentCounts.neutral}</span> neu ·{" "}
            <span className="text-rose-400 font-bold">{sentimentCounts.negative}</span> neg
          </div>

          <span
            className={`text-xs font-mono font-bold px-2.5 py-1 rounded-lg border ${
              netScore > 0
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
                : netScore < 0
                ? "bg-rose-500/10 text-rose-400 border-rose-500/25"
                : "bg-slate-800 text-slate-300 border-white/10"
            }`}
          >
            {netScore > 0 ? "+" : ""}{netScore}% Sentiment
          </span>
        </div>
      </div>

      {/* News Headline Stream */}
      <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
        {news.map((item, i) => (
          <a
            key={i}
            href={item.url || "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="block p-3 rounded-xl bg-slate-900/40 border border-white/5 hover:border-cyan-500/30 hover:bg-slate-900/70 transition-all duration-200 group"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-slate-200 group-hover:text-cyan-300 leading-snug line-clamp-2 transition-colors">
                  {item.headline}
                </p>
                <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-400">
                  <span className="font-semibold text-slate-400">{item.source}</span>
                  <span>·</span>
                  <span>{item.date}</span>
                  <span className="ml-auto opacity-0 group-hover:opacity-100 text-cyan-400 transition-opacity">
                    ↗
                  </span>
                </div>
              </div>
              <span
                className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded border flex-shrink-0 ${
                  item.sentiment === "positive"
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    : item.sentiment === "negative"
                    ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                    : "bg-slate-800 text-slate-400 border-white/5"
                }`}
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

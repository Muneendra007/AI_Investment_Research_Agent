"use client";

import type { Financials } from "@/frontend/types";

interface FinancialsCardProps {
  financials: Financials;
  ticker: string;
}

function formatValue(
  value: number | null,
  type: "currency" | "percent" | "ratio" | "number"
): string {
  if (value === null || value === undefined) return "N/A";
  switch (type) {
    case "currency":
      if (Math.abs(value) >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
      if (Math.abs(value) >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
      if (Math.abs(value) >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
      return `$${value.toFixed(2)}`;
    case "percent":
      return `${value.toFixed(1)}%`;
    case "ratio":
      return value.toFixed(2);
    case "number":
      return value.toFixed(1);
    default:
      return String(value);
  }
}

export default function FinancialsCard({
  financials,
  ticker,
}: FinancialsCardProps) {
  const f = financials;
  const priceUp = f.change >= 0;

  const metrics = [
    {
      label: "Market Cap",
      value: formatValue(f.marketCap, "currency"),
      icon: "🏢",
    },
    {
      label: "P/E Ratio",
      value: formatValue(f.peRatio, "number"),
      icon: "📊",
      highlight: f.peRatio !== null && f.peRatio < 20,
    },
    {
      label: "Revenue Growth",
      value: formatValue(f.revenueGrowth, "percent"),
      icon: "📈",
      highlight: f.revenueGrowth !== null && f.revenueGrowth > 10,
      negative: f.revenueGrowth !== null && f.revenueGrowth < 0,
    },
    {
      label: "Gross Margin",
      value: formatValue(f.grossMargin, "percent"),
      icon: "💵",
    },
    {
      label: "Operating Margin",
      value: formatValue(f.operatingMargin, "percent"),
      icon: "⚙️",
      negative: f.operatingMargin !== null && f.operatingMargin < 0,
    },
    {
      label: "Net Margin",
      value: formatValue(f.netMargin, "percent"),
      icon: "💰",
      negative: f.netMargin !== null && f.netMargin < 0,
    },
    {
      label: "Debt/Equity",
      value: formatValue(f.debtToEquity, "ratio"),
      icon: "⚖️",
      negative: f.debtToEquity !== null && f.debtToEquity > 2,
    },
    {
      label: "ROE",
      value: formatValue(f.returnOnEquity, "percent"),
      icon: "🎯",
      highlight: f.returnOnEquity !== null && f.returnOnEquity > 15,
    },
    {
      label: "Beta",
      value: formatValue(f.beta, "ratio"),
      icon: "📉",
    },
  ];

  return (
    <div className="glass-card p-6 animate-slide-up stagger-3">
      {/* Header with live price */}
      <div className="flex items-center justify-between mb-5">
        <h3
          className="text-lg font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          Financial Metrics
        </h3>
        <div className="text-right">
          <div className="flex items-center gap-2">
            <span
              className="text-xl font-bold font-mono"
              style={{ color: "var(--text-primary)" }}
            >
              ${f.currentPrice.toFixed(2)}
            </span>
            <span
              className={`text-sm font-mono px-2 py-0.5 rounded-md ${
                priceUp ? "badge-positive" : "badge-negative"
              }`}
            >
              {priceUp ? "▲" : "▼"} {Math.abs(f.changePercent).toFixed(2)}%
            </span>
          </div>
          <span
            className="text-xs"
            style={{ color: "var(--text-muted)" }}
          >
            {ticker} · 52W: ${f.low52Week.toFixed(2)} – $
            {f.high52Week.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-3 gap-3">
        {metrics.map((m) => (
          <div
            key={m.label}
            className="p-3 rounded-xl"
            style={{ background: "var(--surface-elevated)" }}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-xs">{m.icon}</span>
              <span
                className="text-xs"
                style={{ color: "var(--text-muted)" }}
              >
                {m.label}
              </span>
            </div>
            <span
              className="text-base font-bold font-mono"
              style={{
                color: m.negative
                  ? "var(--accent-red)"
                  : m.highlight
                    ? "var(--accent-green)"
                    : "var(--text-primary)",
              }}
            >
              {m.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

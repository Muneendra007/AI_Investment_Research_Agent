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
  if (value === null || value === undefined || isNaN(value)) return "N/A";
  switch (type) {
    case "currency":
      if (Math.abs(value) >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
      if (Math.abs(value) >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
      if (Math.abs(value) >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
      return `$${value.toFixed(2)}`;
    case "percent":
      return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
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

  // 52-Week Range position percentage
  let rangePercent = 50;
  if (f.high52Week > f.low52Week && f.currentPrice) {
    rangePercent = Math.min(
      Math.max(
        ((f.currentPrice - f.low52Week) / (f.high52Week - f.low52Week)) * 100,
        0
      ),
      100
    );
  }

  const metrics = [
    {
      label: "Market Cap",
      value: formatValue(f.marketCap, "currency"),
      icon: "🏢",
    },
    {
      label: "P/E Ratio (TTM)",
      value: formatValue(f.peRatio, "number"),
      icon: "📊",
      highlight: f.peRatio !== null && f.peRatio > 0 && f.peRatio < 25,
      negative: f.peRatio !== null && f.peRatio > 60,
    },
    {
      label: "Revenue Growth YoY",
      value: formatValue(f.revenueGrowth, "percent"),
      icon: "⚡",
      highlight: f.revenueGrowth !== null && f.revenueGrowth > 15,
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
      label: "Debt-to-Equity",
      value: formatValue(f.debtToEquity, "ratio"),
      icon: "⚖️",
      negative: f.debtToEquity !== null && f.debtToEquity > 2.5,
    },
    {
      label: "Return on Equity",
      value: formatValue(f.returnOnEquity, "percent"),
      icon: "🎯",
      highlight: f.returnOnEquity !== null && f.returnOnEquity > 15,
    },
    {
      label: "Beta (5Y)",
      value: formatValue(f.beta, "ratio"),
      icon: "📉",
    },
  ];

  return (
    <div className="glass-card p-6 animate-slide-up stagger-3">
      {/* Header with live ticker & price */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-4 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-sm">
            📈
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100">
              Financial Matrix
            </h3>
            <p className="text-[11px] text-slate-400">
              Fundamental & valuation data
            </p>
          </div>
        </div>

        <div className="text-right">
          <div className="flex items-center gap-2 justify-end">
            <span className="text-xl font-extrabold font-mono text-slate-100">
              ${f.currentPrice.toFixed(2)}
            </span>
            <span
              className={`text-xs font-mono font-bold px-2 py-0.5 rounded-lg border ${
                priceUp
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
                  : "bg-rose-500/10 text-rose-400 border-rose-500/25"
              }`}
            >
              {priceUp ? "▲ +" : "▼ "}
              {Math.abs(f.changePercent).toFixed(2)}%
            </span>
          </div>
          <span className="text-[10px] font-mono text-slate-500">
            {ticker} · Live Market Quote
          </span>
        </div>
      </div>

      {/* 52-Week Range Slider Bar */}
      {f.high52Week > 0 && (
        <div className="mb-6 p-3 rounded-xl bg-slate-900/50 border border-white/5">
          <div className="flex justify-between text-[11px] font-mono text-slate-400 mb-1.5">
            <span>52W Low: ${f.low52Week.toFixed(2)}</span>
            <span className="text-slate-300 font-bold">
              Current: ${f.currentPrice.toFixed(2)}
            </span>
            <span>52W High: ${f.high52Week.toFixed(2)}</span>
          </div>
          <div className="relative w-full h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-emerald-500 via-cyan-400 to-purple-500 rounded-full"
              style={{ width: `${rangePercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Metrics 3x3 Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {metrics.map((m) => (
          <div
            key={m.label}
            className="p-3 rounded-xl bg-slate-900/50 border border-white/5 hover:border-white/10 transition-all"
          >
            <div className="flex items-center gap-1.5 mb-1 text-slate-400">
              <span className="text-xs">{m.icon}</span>
              <span className="text-[10px] uppercase tracking-wider font-semibold truncate">
                {m.label}
              </span>
            </div>
            <span
              className={`text-sm font-extrabold font-mono ${
                m.negative
                  ? "text-rose-400"
                  : m.highlight
                  ? "text-emerald-400"
                  : "text-slate-100"
              }`}
            >
              {m.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

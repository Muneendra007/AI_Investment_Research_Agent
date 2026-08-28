"use client";

import type { RiskFlag } from "@/frontend/types";

interface RiskFlagsProps {
  risks: RiskFlag[];
}

export default function RiskFlags({ risks }: RiskFlagsProps) {
  if (!risks || risks.length === 0) {
    return (
      <div className="glass-card p-6 animate-slide-up stagger-5">
        <h3 className="text-base font-bold mb-2 text-slate-100 flex items-center gap-2">
          <span>🛡️</span> Risk Matrix
        </h3>
        <p className="text-xs text-slate-400">
          No material risk anomalies identified.
        </p>
      </div>
    );
  }

  // Sort: high -> medium -> low
  const sortedRisks = [...risks].sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return (order[a.severity] ?? 2) - (order[b.severity] ?? 2);
  });

  const highCount = risks.filter((r) => r.severity === "high").length;
  const medCount = risks.filter((r) => r.severity === "medium").length;

  return (
    <div className="glass-card p-6 animate-slide-up stagger-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-5 pb-3 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-sm">
            ⚠️
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100">
              Risk & Threat Matrix
            </h3>
            <p className="text-[11px] text-slate-400">
              Regulatory, financial & operational vectors
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {highCount > 0 && (
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-rose-500/15 text-rose-400 border border-rose-500/30">
              {highCount} High
            </span>
          )}
          {medCount > 0 && (
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/30">
              {medCount} Med
            </span>
          )}
        </div>
      </div>

      {/* Risk Items */}
      <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
        {sortedRisks.map((risk, i) => {
          const isHigh = risk.severity === "high";
          const isMed = risk.severity === "medium";

          return (
            <div
              key={i}
              className={`p-3 rounded-xl border transition-all ${
                isHigh
                  ? "bg-rose-950/20 border-rose-500/25 text-slate-200"
                  : isMed
                  ? "bg-amber-950/15 border-amber-500/20 text-slate-200"
                  : "bg-slate-900/40 border-white/5 text-slate-300"
              }`}
            >
              <div className="flex items-start gap-2.5">
                <span
                  className={`mt-1 h-2 w-2 rounded-full flex-shrink-0 ${
                    isHigh
                      ? "bg-rose-400 shadow-[0_0_8px_#f87171]"
                      : isMed
                      ? "bg-amber-400 shadow-[0_0_8px_#fbbf24]"
                      : "bg-emerald-400"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium leading-snug">
                    {risk.flag}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-400">
                    <span
                      className={`text-[9px] uppercase font-mono font-bold px-1.5 py-0.2 rounded ${
                        isHigh
                          ? "bg-rose-500/20 text-rose-300"
                          : isMed
                          ? "bg-amber-500/20 text-amber-300"
                          : "bg-emerald-500/20 text-emerald-300"
                      }`}
                    >
                      {risk.severity}
                    </span>
                    <span>·</span>
                    <span className="truncate">Source: {risk.source}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

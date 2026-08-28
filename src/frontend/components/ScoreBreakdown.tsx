"use client";

import type { ScoreBreakdown } from "@/frontend/types";

interface ScoreBreakdownProps {
  scores: ScoreBreakdown;
}

const DIMENSIONS = [
  {
    key: "financialHealth" as const,
    label: "Financial Health",
    description: "Revenue velocity, margins, balance sheet debt",
    icon: "💰",
  },
  {
    key: "valuation" as const,
    label: "Valuation",
    description: "P/E vs industry comps, fair value multiple",
    icon: "📊",
  },
  {
    key: "momentum" as const,
    label: "Market Momentum",
    description: "News sentiment polarity, investor perception",
    icon: "🚀",
  },
  {
    key: "riskProfile" as const,
    label: "Risk Profile",
    description: "10 = Minimal risk, 1 = Elevated risk",
    icon: "🛡️",
  },
  {
    key: "competitivePosition" as const,
    label: "Competitive Moat",
    description: "Pricing power, switching costs, market share",
    icon: "⚔️",
  },
];

function getScoreColor(score: number): { text: string; bg: string; fill: string } {
  if (score >= 7.5) return { text: "text-emerald-400", bg: "bg-emerald-500/15 border-emerald-500/30", fill: "from-emerald-500 to-cyan-400" };
  if (score >= 5.5) return { text: "text-cyan-400", bg: "bg-cyan-500/15 border-cyan-500/30", fill: "from-cyan-500 to-blue-400" };
  if (score >= 4.0) return { text: "text-amber-400", bg: "bg-amber-500/15 border-amber-500/30", fill: "from-amber-500 to-orange-400" };
  return { text: "text-rose-400", bg: "bg-rose-500/15 border-rose-500/30", fill: "from-rose-500 to-red-600" };
}

export default function ScoreBreakdownComponent({
  scores,
}: ScoreBreakdownProps) {
  const avgScore =
    Object.values(scores).reduce((a, b) => a + b, 0) /
    Object.values(scores).length;

  const avgTheme = getScoreColor(avgScore);

  return (
    <div className="glass-card p-6 animate-slide-up stagger-2">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-3 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-sm">
            🎯
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-100">
              5-Dimension Scorecard
            </h3>
            <p className="text-[11px] text-slate-400">
              Algorithmic multi-factor evaluation
            </p>
          </div>
        </div>

        <div className={`flex items-center gap-1.5 px-3 py-1 rounded-xl border font-mono ${avgTheme.bg}`}>
          <span className="text-xs text-slate-300">Composite:</span>
          <span className={`text-sm font-bold ${avgTheme.text}`}>
            {avgScore.toFixed(1)}
          </span>
          <span className="text-[10px] text-slate-400">/10</span>
        </div>
      </div>

      {/* Metric List */}
      <div className="space-y-4">
        {DIMENSIONS.map((dim) => {
          const score = scores[dim.key] ?? 5;
          const theme = getScoreColor(score);

          return (
            <div
              key={dim.key}
              className="p-3 rounded-xl bg-slate-900/40 border border-white/5 hover:border-white/10 transition-all"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{dim.icon}</span>
                  <span className="text-xs font-semibold text-slate-200">
                    {dim.label}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className={`text-xs font-mono font-bold ${theme.text}`}>
                    {score.toFixed(1)}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">/10</span>
                </div>
              </div>

              {/* Progress Track */}
              <div className="score-bar-track mb-1.5">
                <div
                  className={`score-bar-fill bg-gradient-to-r ${theme.fill}`}
                  style={{ width: `${Math.max(score * 10, 5)}%` }}
                />
              </div>

              <p className="text-[10px] text-slate-400 leading-tight">
                {dim.description}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

"use client";

import type { ScoreBreakdown } from "@/frontend/types";

interface ScoreBreakdownProps {
  scores: ScoreBreakdown;
}

const DIMENSIONS = [
  {
    key: "financialHealth" as const,
    label: "Financial Health",
    description: "Revenue growth, margins, debt",
    icon: "💰",
  },
  {
    key: "valuation" as const,
    label: "Valuation",
    description: "P/E vs sector, price fairness",
    icon: "📈",
  },
  {
    key: "momentum" as const,
    label: "Momentum",
    description: "News sentiment, market perception",
    icon: "🚀",
  },
  {
    key: "riskProfile" as const,
    label: "Risk Profile",
    description: "10 = low risk, 1 = high risk",
    icon: "🛡️",
  },
  {
    key: "competitivePosition" as const,
    label: "Competitive Position",
    description: "Moat strength, market position",
    icon: "⚔️",
  },
];

function getScoreColor(score: number): string {
  if (score >= 7) return "var(--accent-green)";
  if (score >= 5) return "var(--accent-yellow)";
  return "var(--accent-red)";
}

export default function ScoreBreakdownComponent({
  scores,
}: ScoreBreakdownProps) {
  const avgScore =
    Object.values(scores).reduce((a, b) => a + b, 0) /
    Object.values(scores).length;

  return (
    <div className="glass-card p-6 animate-slide-up stagger-2">
      <div className="flex items-center justify-between mb-5">
        <h3
          className="text-lg font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          Score Breakdown
        </h3>
        <span
          className="text-sm font-mono px-3 py-1 rounded-lg"
          style={{
            background: "var(--surface-elevated)",
            color: getScoreColor(avgScore),
          }}
        >
          Avg: {avgScore.toFixed(1)}/10
        </span>
      </div>

      <div className="space-y-4">
        {DIMENSIONS.map((dim) => {
          const score = scores[dim.key];
          return (
            <div key={dim.key}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{dim.icon}</span>
                  <span
                    className="text-sm font-medium"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {dim.label}
                  </span>
                </div>
                <span
                  className="text-sm font-mono font-bold"
                  style={{ color: getScoreColor(score) }}
                >
                  {score}/10
                </span>
              </div>
              <div className="score-bar-track">
                <div
                  className="score-bar-fill"
                  style={{
                    width: `${score * 10}%`,
                    background: `linear-gradient(90deg, ${getScoreColor(score)}, ${getScoreColor(score)}88)`,
                  }}
                />
              </div>
              <p
                className="text-xs mt-1"
                style={{ color: "var(--text-muted)" }}
              >
                {dim.description}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

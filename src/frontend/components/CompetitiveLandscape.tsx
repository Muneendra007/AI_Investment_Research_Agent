"use client";

import type { CompetitiveAnalysis } from "@/frontend/types";

interface CompetitiveLandscapeProps {
  competitive: CompetitiveAnalysis;
}

export default function CompetitiveLandscape({
  competitive,
}: CompetitiveLandscapeProps) {
  return (
    <div className="glass-card p-6 animate-slide-up stagger-6">
      <h3
        className="text-lg font-semibold mb-4"
        style={{ color: "var(--text-primary)" }}
      >
        ⚔️ Competitive Landscape
      </h3>

      {/* Peers */}
      <div className="mb-4">
        <span
          className="text-xs font-medium uppercase tracking-wider"
          style={{ color: "var(--text-muted)" }}
        >
          Key Competitors
        </span>
        <div className="flex flex-wrap gap-2 mt-2">
          {competitive.peers.map((peer) => (
            <span
              key={peer}
              className="px-3 py-1.5 rounded-lg text-sm font-medium"
              style={{
                background: "var(--surface-elevated)",
                color: "var(--text-secondary)",
                border: "1px solid var(--border)",
              }}
            >
              {peer}
            </span>
          ))}
        </div>
      </div>

      {/* Market Position */}
      <div className="mb-4">
        <span
          className="text-xs font-medium uppercase tracking-wider"
          style={{ color: "var(--text-muted)" }}
        >
          Market Position
        </span>
        <p
          className="text-sm mt-1.5 leading-relaxed"
          style={{ color: "var(--text-secondary)" }}
        >
          {competitive.marketPositionSummary}
        </p>
      </div>

      {/* Moat Assessment */}
      <div>
        <span
          className="text-xs font-medium uppercase tracking-wider"
          style={{ color: "var(--text-muted)" }}
        >
          Moat Assessment
        </span>
        <p
          className="text-sm mt-1.5 leading-relaxed"
          style={{ color: "var(--text-secondary)" }}
        >
          {competitive.moatAssessment}
        </p>
      </div>

      {/* AI-generated disclaimer */}
      <div
        className="mt-4 pt-3 text-xs flex items-center gap-1.5"
        style={{
          borderTop: "1px solid var(--border)",
          color: "var(--text-muted)",
        }}
      >
        <svg
          className="w-3 h-3"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        AI-generated analysis — verify independently before making investment decisions
      </div>
    </div>
  );
}

"use client";

import type { CompanyOverview } from "@/frontend/types";

interface OverviewCardProps {
  overview: CompanyOverview;
}

export default function OverviewCard({ overview }: OverviewCardProps) {
  return (
    <div className="glass-card p-6 animate-slide-up stagger-3">
      <div className="flex items-center gap-2 mb-4 border-b border-[rgba(255,255,255,0.05)] pb-3">
        <span className="text-xl">🏢</span>
        <h3
          className="text-lg font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          Company Overview & Insights
        </h3>
      </div>

      <div className="space-y-5">
        {/* Summary Description */}
        <div>
          <p
            className="text-sm leading-relaxed"
            style={{ color: "var(--text-primary)" }}
          >
            {overview.summary}
          </p>
        </div>

        {/* Business Model & Funding Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Business Model */}
          <div
            className="p-4 rounded-xl"
            style={{ background: "rgba(255, 255, 255, 0.02)" }}
          >
            <h4
              className="text-xs font-bold uppercase tracking-wider mb-2"
              style={{ color: "var(--accent-purple)" }}
            >
              ⚙️ Business Model
            </h4>
            <p
              className="text-xs leading-relaxed"
              style={{ color: "var(--text-secondary)" }}
            >
              {overview.businessModel}
            </p>
          </div>

          {/* Funding / Valuation */}
          <div
            className="p-4 rounded-xl"
            style={{ background: "rgba(255, 255, 255, 0.02)" }}
          >
            <h4
              className="text-xs font-bold uppercase tracking-wider mb-2"
              style={{ color: "var(--accent-cyan)" }}
            >
              💰 Funding & Valuation
            </h4>
            <p
              className="text-xs leading-relaxed"
              style={{ color: "var(--text-secondary)" }}
            >
              {overview.fundingValuation}
            </p>
          </div>
        </div>

        {/* Key Products Tags */}
        <div>
          <h4
            className="text-xs font-bold uppercase tracking-wider mb-2.5"
            style={{ color: "var(--text-muted)" }}
          >
            🏷️ Flagship Products & Offerings
          </h4>
          <div className="flex flex-wrap gap-2">
            {overview.keyProducts.map((product, i) => (
              <span
                key={i}
                className="text-xs px-3 py-1 rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)]"
                style={{ color: "var(--text-primary)" }}
              >
                {product}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

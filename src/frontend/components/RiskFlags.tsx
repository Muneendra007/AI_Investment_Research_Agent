"use client";

import type { RiskFlag } from "@/frontend/types";

interface RiskFlagsProps {
  risks: RiskFlag[];
}

export default function RiskFlags({ risks }: RiskFlagsProps) {
  if (!risks || risks.length === 0) {
    return (
      <div className="glass-card p-6 animate-slide-up stagger-5">
        <h3
          className="text-lg font-semibold mb-3"
          style={{ color: "var(--text-primary)" }}
        >
          ⚠️ Risk Flags
        </h3>
        <p
          className="text-sm"
          style={{ color: "var(--text-muted)" }}
        >
          No significant risk flags identified.
        </p>
      </div>
    );
  }

  // Sort by severity: high → medium → low
  const sortedRisks = [...risks].sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.severity] - order[b.severity];
  });

  const highCount = risks.filter((r) => r.severity === "high").length;
  const medCount = risks.filter((r) => r.severity === "medium").length;
  const lowCount = risks.filter((r) => r.severity === "low").length;

  return (
    <div className="glass-card p-6 animate-slide-up stagger-5">
      <div className="flex items-center justify-between mb-4">
        <h3
          className="text-lg font-semibold"
          style={{ color: "var(--text-primary)" }}
        >
          ⚠️ Risk Flags
        </h3>
        <div className="flex items-center gap-2">
          {highCount > 0 && (
            <span className="badge-severity-high px-2 py-0.5 rounded-md text-xs font-medium">
              {highCount} high
            </span>
          )}
          {medCount > 0 && (
            <span className="badge-severity-medium px-2 py-0.5 rounded-md text-xs font-medium">
              {medCount} medium
            </span>
          )}
          {lowCount > 0 && (
            <span className="badge-severity-low px-2 py-0.5 rounded-md text-xs font-medium">
              {lowCount} low
            </span>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {sortedRisks.map((risk, i) => (
          <div
            key={i}
            className="p-3 rounded-xl flex items-start gap-3"
            style={{ background: "var(--surface-elevated)" }}
          >
            <div
              className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
              style={{
                background: `var(--severity-${risk.severity})`,
                boxShadow: `0 0 6px var(--severity-${risk.severity})`,
              }}
            />
            <div className="flex-1">
              <p
                className="text-sm font-medium"
                style={{ color: "var(--text-primary)" }}
              >
                {risk.flag}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={`badge-severity-${risk.severity} px-1.5 py-0.5 rounded text-xs`}
                >
                  {risk.severity}
                </span>
                <span
                  className="text-xs"
                  style={{ color: "var(--text-muted)" }}
                >
                  {risk.source}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import type { Decision } from "@/frontend/types";

interface DecisionCardProps {
  decision: Decision;
  companyName: string;
}

export default function DecisionCard({
  decision,
  companyName,
}: DecisionCardProps) {
  const [animatedConfidence, setAnimatedConfidence] = useState(0);
  const isInvest = decision.verdict === "Invest";
  const circumference = 2 * Math.PI * 52; // radius = 52
  const dashOffset =
    circumference - (animatedConfidence / 100) * circumference;

  // Animate confidence counter
  useEffect(() => {
    const target = decision.confidence;
    const duration = 1500;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      setAnimatedConfidence(Math.round(target * eased));

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [decision.confidence]);

  return (
    <div className="glass-card p-8 animate-slide-up stagger-1">
      <div className="flex flex-col md:flex-row items-center gap-8">
        {/* Confidence Ring */}
        <div className="relative flex-shrink-0">
          <svg
            className="confidence-ring"
            width="140"
            height="140"
            viewBox="0 0 120 120"
          >
            <circle className="track" cx="60" cy="60" r="52" />
            <circle
              className="progress"
              cx="60"
              cy="60"
              r="52"
              stroke={
                isInvest ? "url(#invest-gradient)" : "url(#pass-gradient)"
              }
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
            />
            <defs>
              <linearGradient
                id="invest-gradient"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <stop offset="0%" stopColor="var(--invest-from)" />
                <stop offset="100%" stopColor="var(--invest-to)" />
              </linearGradient>
              <linearGradient
                id="pass-gradient"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <stop offset="0%" stopColor="var(--pass-from)" />
                <stop offset="100%" stopColor="var(--pass-to)" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span
              className="text-3xl font-bold tabular-nums"
              style={{
                color: isInvest
                  ? "var(--accent-cyan)"
                  : "var(--accent-yellow)",
              }}
            >
              {animatedConfidence}%
            </span>
            <span
              className="text-xs"
              style={{ color: "var(--text-muted)" }}
            >
              confidence
            </span>
          </div>
        </div>

        {/* Verdict & Reasoning */}
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3 mb-4 justify-center md:justify-start">
            <span
              className={`px-4 py-1.5 rounded-full text-sm font-bold tracking-wide uppercase shadow-sm ${
                isInvest ? "bg-gradient-invest" : "bg-gradient-pass"
              }`}
              style={{ color: "white" }}
            >
              {isInvest ? "🟢 Invest / Buy" : "⚠️ Pass / Avoid"}
            </span>
            <span
              className="text-xs px-2.5 py-1 rounded-md font-medium"
              style={{
                background: "var(--surface-elevated)",
                color: decision.confidence >= 80 
                  ? "var(--accent-green)" 
                  : decision.confidence >= 60 
                  ? "var(--accent-yellow)" 
                  : "var(--accent-red)",
              }}
            >
              {decision.confidence >= 80 
                ? "Strong Consensus" 
                : decision.confidence >= 60 
                ? "Moderate Conviction" 
                : "Low Conviction / Speculative"}
            </span>
            <h2
              className="text-2xl font-bold ml-auto md:ml-0"
              style={{ color: "var(--text-primary)" }}
            >
              {companyName}
            </h2>
          </div>

          {/* Executive Summary / Bottom Line */}
          <div 
            className="p-4 rounded-xl mb-6 text-sm leading-relaxed"
            style={{
              background: "rgba(255, 255, 255, 0.02)",
              borderLeft: `4px solid ${isInvest ? "var(--accent-cyan)" : "var(--accent-yellow)"}`,
            }}
          >
            <h4 className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>
              The Bottom Line
            </h4>
            <p style={{ color: "var(--text-primary)" }}>
              {decision.executiveSummary}
            </p>
          </div>

          {/* Side-by-Side Pros and Cons */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
            {/* Pros Column */}
            <div className="p-4 rounded-xl border border-[rgba(52,211,153,0.1)] bg-[rgba(52,211,153,0.02)]">
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--accent-green)" }}>
                <span>✅</span> Reasons to Invest
              </h4>
              <ul className="space-y-2">
                {decision.pros.map((pro, i) => (
                  <li
                    key={i}
                    className="text-xs flex items-start gap-2 leading-relaxed"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    <span className="text-[10px] mt-1 text-emerald-400">•</span>
                    <span>{pro}</span>
                  </li>
                ))}
                {decision.pros.length === 0 && (
                  <li className="text-xs italic" style={{ color: "var(--text-muted)" }}>
                    No significant strengths identified.
                  </li>
                )}
              </ul>
            </div>

            {/* Cons Column */}
            <div className="p-4 rounded-xl border border-[rgba(248,113,113,0.1)] bg-[rgba(248,113,113,0.02)]">
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: "var(--accent-red)" }}>
                <span>⚠️</span> Risks & Warning Flags
              </h4>
              <ul className="space-y-2">
                {decision.cons.map((con, i) => (
                  <li
                    key={i}
                    className="text-xs flex items-start gap-2 leading-relaxed"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    <span className="text-[10px] mt-1 text-rose-400">•</span>
                    <span>{con}</span>
                  </li>
                ))}
                {decision.cons.length === 0 && (
                  <li className="text-xs italic" style={{ color: "var(--text-muted)" }}>
                    No major risks identified.
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

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
    const duration = 1200;
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
    <div
      className={`glass-panel p-6 sm:p-8 animate-slide-up stagger-1 border relative overflow-hidden ${
        isInvest
          ? "border-emerald-500/30 shadow-[0_0_35px_rgba(16,185,129,0.12)]"
          : "border-amber-500/30 shadow-[0_0_35px_rgba(245,158,11,0.12)]"
      }`}
    >
      {/* Background ambient ambient glow accent */}
      <div
        className={`absolute -top-24 -right-24 w-72 h-72 rounded-full blur-3xl pointer-events-none opacity-20 ${
          isInvest ? "bg-emerald-500" : "bg-rose-500"
        }`}
      />

      <div className="flex flex-col lg:flex-row items-center gap-8 relative z-10">
        {/* Confidence Gauge Ring */}
        <div className="relative flex-shrink-0 flex flex-col items-center">
          <div className="relative">
            <svg
              className="confidence-ring"
              width="150"
              height="150"
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
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#06b6d4" />
                </linearGradient>
                <linearGradient
                  id="pass-gradient"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor="#f59e0b" />
                  <stop offset="100%" stopColor="#f43f5e" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span
                className="text-3xl font-extrabold font-mono tabular-nums tracking-tight"
                style={{
                  color: isInvest ? "#34d399" : "#fbbf24",
                }}
              >
                {animatedConfidence}%
              </span>
              <span className="text-[11px] uppercase tracking-widest font-semibold text-slate-400">
                Conviction
              </span>
            </div>
          </div>
        </div>

        {/* Verdict Details & Executive Summary */}
        <div className="flex-1 w-full text-left">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div
              className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-xl text-sm font-extrabold tracking-wide uppercase shadow-lg ${
                isInvest
                  ? "bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-emerald-500/25"
                  : "bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-rose-500/25"
              }`}
            >
              <span className="text-base">{isInvest ? "🟢" : "⚠️"}</span>
              <span>{isInvest ? "Invest Recommendation" : "Pass / Cautious"}</span>
            </div>

            <span
              className="text-xs px-3 py-1 rounded-lg font-mono font-medium border"
              style={{
                background: "rgba(255, 255, 255, 0.03)",
                borderColor: "rgba(255, 255, 255, 0.1)",
                color:
                  decision.confidence >= 75
                    ? "#34d399"
                    : decision.confidence >= 55
                    ? "#fbbf24"
                    : "#f87171",
              }}
            >
              {decision.confidence >= 75
                ? "● High Conviction"
                : decision.confidence >= 55
                ? "● Moderate Conviction"
                : "● Speculative / Data Gaps"}
            </span>

            <h2 className="text-xl sm:text-2xl font-bold ml-auto text-slate-100 font-sans tracking-tight">
              {companyName}
            </h2>
          </div>

          {/* Bottom Line / Executive Summary Callout */}
          <div
            className={`p-4 rounded-xl mb-6 text-sm leading-relaxed border relative backdrop-blur-md ${
              isInvest
                ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-100"
                : "bg-amber-950/20 border-amber-500/30 text-amber-100"
            }`}
          >
            <div className="flex items-center gap-2 mb-1 text-xs font-bold uppercase tracking-wider text-slate-400">
              <span>💡</span> The Bottom Line
            </div>
            <p className="text-slate-200 text-sm font-normal leading-relaxed">
              {decision.executiveSummary}
            </p>
          </div>

          {/* Side-by-Side Pros and Cons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Bull Case (Pros) */}
            <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-950/10 backdrop-blur-sm">
              <h4 className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2 text-emerald-400">
                <span>📈</span> Bull Case (Key Drivers)
              </h4>
              <ul className="space-y-2">
                {decision.pros.map((pro, i) => (
                  <li
                    key={i}
                    className="text-xs text-slate-300 flex items-start gap-2 leading-relaxed"
                  >
                    <span className="text-emerald-400 font-bold mt-0.5">•</span>
                    <span>{pro}</span>
                  </li>
                ))}
                {decision.pros.length === 0 && (
                  <li className="text-xs italic text-slate-500">
                    No major catalysts identified.
                  </li>
                )}
              </ul>
            </div>

            {/* Bear Case (Cons) */}
            <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-950/10 backdrop-blur-sm">
              <h4 className="text-xs font-bold uppercase tracking-wider mb-3 flex items-center gap-2 text-rose-400">
                <span>📉</span> Bear Case (Risks & Headwinds)
              </h4>
              <ul className="space-y-2">
                {decision.cons.map((con, i) => (
                  <li
                    key={i}
                    className="text-xs text-slate-300 flex items-start gap-2 leading-relaxed"
                  >
                    <span className="text-rose-400 font-bold mt-0.5">•</span>
                    <span>{con}</span>
                  </li>
                ))}
                {decision.cons.length === 0 && (
                  <li className="text-xs italic text-slate-500">
                    No significant headwinds identified.
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

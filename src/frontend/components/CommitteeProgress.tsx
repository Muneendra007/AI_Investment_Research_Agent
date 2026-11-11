"use client";

import type { CommitteeStepState } from "@/frontend/types";

interface CommitteeProgressProps {
  steps: CommitteeStepState[];
  isRunning: boolean;
}

const STEP_ICONS: Record<string, string> = {
  research: "📚",
  bull_bear: "⚔️",
  exchange: "🔄",
  rebuttal: "💬",
  judge: "⚖️",
  risk: "🛡️",
  enforcement: "🔒",
  report: "📋",
};

export default function CommitteeProgress({
  steps,
  isRunning,
}: CommitteeProgressProps) {
  const completed = steps.filter((s) => s.status === "completed").length;
  const pct = Math.round((completed / Math.max(steps.length, 1)) * 100);

  return (
    <div className="glass-card p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {isRunning ? (
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500" />
            </span>
          ) : (
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
          )}
          <span className="text-xs font-bold uppercase tracking-wider text-cyan-300">
            Microsoft Agent Framework · Investment Committee Orchestration
          </span>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="text-slate-400">
            {completed}/{steps.length} Stages Complete
          </span>
          <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-bold">
            {pct}%
          </span>
        </div>
      </div>

      <div className="w-full h-1.5 bg-slate-800/80 rounded-full overflow-hidden border border-white/5">
        <div
          className="h-full bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400 transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {steps.map((step, idx) => {
          const running = step.status === "running";
          const done = step.status === "completed";
          const errored = step.status === "error";

          return (
            <div
              key={step.id}
              className={`p-3 rounded-xl border transition-all ${
                running
                  ? "bg-cyan-950/30 border-cyan-400/50"
                  : done
                  ? "bg-emerald-950/20 border-emerald-500/30"
                  : errored
                  ? "bg-rose-950/30 border-rose-500/40"
                  : "bg-slate-900/40 border-white/5 opacity-60"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-mono text-slate-400">
                  STEP 0{idx + 1}
                </span>
                <span className="text-xs">
                  {done ? (
                    <span className="text-emerald-400 font-bold">✓</span>
                  ) : running ? (
                    <span className="inline-block animate-spin text-cyan-400">⟳</span>
                  ) : errored ? (
                    <span className="text-rose-400 font-bold">✕</span>
                  ) : (
                    STEP_ICONS[step.id] || "•"
                  )}
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-100">{step.label}</p>
              <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-2">
                {step.summary || step.description}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}


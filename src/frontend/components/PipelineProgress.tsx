"use client";

import type { NodeStatus } from "@/frontend/types";

interface PipelineNode {
  id: string;
  label: string;
  description?: string;
  status: NodeStatus;
}

interface PipelineProgressProps {
  nodes: PipelineNode[];
}

const NODE_ICONS: Record<string, string> = {
  entityResolver: "🔍",
  companyOverview: "🌐",
  financialData: "📊",
  newsSentiment: "📰",
  competitiveAnalysis: "⚔️",
  riskFlags: "🛡️",
  synthesis: "🧠",
};

export default function PipelineProgress({ nodes }: PipelineProgressProps) {
  const completedCount = nodes.filter((n) => n.status === "completed").length;
  const progressPercent = Math.round((completedCount / nodes.length) * 100);

  return (
    <div className="w-full py-4 space-y-4">
      {/* Header bar with progress counter */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
          </span>
          <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
            Autonomous Pipeline Active
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-400">
            {completedCount} of {nodes.length} Nodes Complete
          </span>
          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
            {progressPercent}%
          </span>
        </div>
      </div>

      {/* Progress Track */}
      <div className="w-full h-1.5 bg-slate-800/80 rounded-full overflow-hidden border border-white/5">
        <div
          className="h-full bg-gradient-to-r from-emerald-400 via-cyan-400 to-purple-500 transition-all duration-500 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Desktop Nodes Grid */}
      <div className="hidden lg:grid grid-cols-7 gap-2 pt-2">
        {nodes.map((node, i) => {
          const isCompleted = node.status === "completed";
          const isRunning = node.status === "running";
          const isError = node.status === "error";

          return (
            <div
              key={node.id}
              className={`relative flex flex-col items-center text-center p-3 rounded-xl transition-all duration-300 border ${
                isRunning
                  ? "bg-cyan-950/40 border-cyan-400/50 shadow-[0_0_15px_rgba(34,211,238,0.2)] scale-[1.03]"
                  : isCompleted
                  ? "bg-emerald-950/20 border-emerald-500/30 text-slate-200"
                  : isError
                  ? "bg-rose-950/30 border-rose-500/40 text-rose-300"
                  : "bg-slate-900/40 border-white/5 opacity-50"
              }`}
            >
              {/* Step indicator */}
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-1.5 py-0.2 text-[9px] font-mono rounded-full bg-slate-950 border border-white/10 text-slate-400">
                0{i + 1}
              </div>

              {/* Icon Container */}
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base mb-1.5 mt-1">
                {isCompleted ? (
                  <span className="text-emerald-400 text-sm">✓</span>
                ) : isRunning ? (
                  <svg
                    className="animate-spin h-4 w-4 text-cyan-400"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="3"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                ) : isError ? (
                  <span className="text-rose-400 text-xs">✕</span>
                ) : (
                  <span>{NODE_ICONS[node.id] || "⚙️"}</span>
                )}
              </div>

              <span
                className={`text-[11px] font-semibold leading-tight line-clamp-1 ${
                  isRunning
                    ? "text-cyan-300"
                    : isCompleted
                    ? "text-emerald-300"
                    : isError
                    ? "text-rose-400"
                    : "text-slate-400"
                }`}
              >
                {node.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Mobile/Tablet Vertical Checklist */}
      <div className="lg:hidden grid grid-cols-1 sm:grid-cols-2 gap-2">
        {nodes.map((node) => {
          const isCompleted = node.status === "completed";
          const isRunning = node.status === "running";
          const isError = node.status === "error";

          return (
            <div
              key={node.id}
              className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all ${
                isRunning
                  ? "bg-cyan-950/40 border-cyan-400/40 text-cyan-200"
                  : isCompleted
                  ? "bg-emerald-950/20 border-emerald-500/20 text-slate-300"
                  : isError
                  ? "bg-rose-950/30 border-rose-500/30 text-rose-300"
                  : "bg-slate-900/30 border-white/5 text-slate-500"
              }`}
            >
              <div className="w-6 h-6 rounded-md flex items-center justify-center text-xs flex-shrink-0 bg-black/30">
                {isCompleted ? (
                  <span className="text-emerald-400 font-bold">✓</span>
                ) : isRunning ? (
                  <span className="animate-spin text-cyan-400 font-mono">⟳</span>
                ) : (
                  <span>{NODE_ICONS[node.id] || "•"}</span>
                )}
              </div>
              <span className="text-xs font-medium">{node.label}</span>
              {isRunning && (
                <span className="ml-auto text-[10px] uppercase font-mono tracking-wider px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300">
                  Processing
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

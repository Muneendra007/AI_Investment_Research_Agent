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
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-white/5">
        <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-sm">
          ⚔️
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-100">
            Competitive Moat & Peers
          </h3>
          <p className="text-[11px] text-slate-400">
            Market durability and industry rivalry
          </p>
        </div>
      </div>

      {/* Peer Badges */}
      <div className="mb-4">
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Direct Peer Group & Competitors
        </span>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {competitive.peers.map((peer) => (
            <span
              key={peer}
              className="px-3 py-1 rounded-lg text-xs font-mono font-semibold bg-slate-900/60 text-slate-200 border border-white/10 hover:border-cyan-500/30 transition-all"
            >
              {peer}
            </span>
          ))}
        </div>
      </div>

      {/* Market Position & Moat Grid */}
      <div className="space-y-3">
        <div className="p-3.5 rounded-xl bg-slate-900/40 border border-white/5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1 mb-1">
            <span>📊</span> Market Position
          </span>
          <p className="text-xs text-slate-300 leading-relaxed">
            {competitive.marketPositionSummary}
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/40 border border-white/5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1 mb-1">
            <span>🏰</span> Moat Durability Assessment
          </span>
          <p className="text-xs text-slate-300 leading-relaxed">
            {competitive.moatAssessment}
          </p>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="mt-4 pt-3 border-t border-white/5 flex items-center gap-1.5 text-[10px] text-slate-500 font-mono">
        <span>ℹ️</span> Multi-agent synthesized strategic overview.
      </div>
    </div>
  );
}

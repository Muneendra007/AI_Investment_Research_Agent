"use client";

import type { CompanyOverview } from "@/frontend/types";

interface OverviewCardProps {
  overview: CompanyOverview;
}

export default function OverviewCard({ overview }: OverviewCardProps) {
  return (
    <div className="glass-card p-6 animate-slide-up stagger-3">
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-white/5">
        <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-sm">
          🌐
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-100">
            Company DNA & Web Intelligence
          </h3>
          <p className="text-[11px] text-slate-400">
            Business model, revenue streams & products
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Core Summary */}
        <p className="text-xs sm:text-sm leading-relaxed text-slate-200 p-3.5 rounded-xl bg-slate-900/40 border border-white/5">
          {overview.summary}
        </p>

        {/* Business Model & Valuation Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Business Model */}
          <div className="p-3.5 rounded-xl bg-slate-900/50 border border-purple-500/20">
            <h4 className="text-[10px] font-bold uppercase tracking-wider mb-1.5 text-purple-400 flex items-center gap-1.5">
              <span>⚙️</span> Monetization Model
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              {overview.businessModel}
            </p>
          </div>

          {/* Funding / Valuation */}
          <div className="p-3.5 rounded-xl bg-slate-900/50 border border-cyan-500/20">
            <h4 className="text-[10px] font-bold uppercase tracking-wider mb-1.5 text-cyan-400 flex items-center gap-1.5">
              <span>💎</span> Valuation & Funding
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              {overview.fundingValuation}
            </p>
          </div>
        </div>

        {/* Flagship Products */}
        <div>
          <h4 className="text-[10px] font-bold uppercase tracking-wider mb-2 text-slate-400">
            Core Flagship Products & Services
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {overview.keyProducts.map((product, i) => (
              <span
                key={i}
                className="text-xs px-3 py-1 rounded-lg border border-white/10 bg-slate-800/60 text-slate-200 font-medium"
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

"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { AgentState, NodeStatus, ChatMessage } from "@/frontend/types";
import PipelineProgress from "@/frontend/components/PipelineProgress";
import DecisionCard from "@/frontend/components/DecisionCard";
import ScoreBreakdownComponent from "@/frontend/components/ScoreBreakdown";
import FinancialsCard from "@/frontend/components/FinancialsCard";
import NewsSentiment from "@/frontend/components/NewsSentiment";
import RiskFlags from "@/frontend/components/RiskFlags";
import CompetitiveLandscape from "@/frontend/components/CompetitiveLandscape";
import OverviewCard from "@/frontend/components/OverviewCard";

// ─── Pipeline node definitions ──
const PIPELINE_NODES = [
  { id: "entityResolver", label: "Resolve Company", description: "Identifying ticker, sector, exchange" },
  { id: "companyOverview", label: "Web Overview", description: "Moat, products & business model" },
  { id: "financialData", label: "Financials", description: "Fetching price, margins, growth" },
  { id: "newsSentiment", label: "News Sentiment", description: "Analyzing recent headlines" },
  { id: "competitiveAnalysis", label: "Competitive", description: "Market position & peers" },
  { id: "riskFlags", label: "Risk Matrix", description: "Scanning for red flags" },
  { id: "synthesis", label: "Verdict", description: "Weighing all signals" },
];

const SUGGESTION_CATEGORIES = [
  {
    category: "🚀 Tech & AI Leaders",
    items: [
      { label: "Analyze Nvidia (NVDA)", query: "Analyze Nvidia stock" },
      { label: "Is Apple a buy?", query: "Is Apple a buy right now?" },
      { label: "Evaluate Microsoft", query: "Should I invest in Microsoft?" },
    ],
  },
  {
    category: "⚡ Growth & Consumer",
    items: [
      { label: "Deep-dive Tesla (TSLA)", query: "Research Tesla stock" },
      { label: "Starbucks Valuation", query: "Analyze Starbucks (SBUX)" },
      { label: "Research Tata Motors", query: "Evaluate Tata Motors" },
    ],
  },
];

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [expandedAnalysisId, setExpandedAnalysisId] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Streaming state for active multi-node analysis
  const [activeAnalysisState, setActiveAnalysisState] = useState<{
    companyName: string;
    activeNode: string;
    completedNodes: string[];
    nodeStatuses: Record<string, NodeStatus>;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const setDefaultWelcome = () => {
    setMessages([
      {
        id: "welcome",
        sender: "assistant",
        text: "👋 **Welcome to AuraInvest AI** — your institutional multi-agent equity research terminal.\n\nAsk me about any company (public or private), e.g. *\"Is Nvidia a buy?\"* or *\"Analyze Tesla's valuation\"*. I will run 7 autonomous research nodes to deliver a comprehensive Buy/Pass verdict with score breakdowns, risk flags, and live financial metrics.",
        timestamp: new Date().toISOString(),
      },
    ]);
  };

  // Load from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem("aurainvest_chat_history");
    if (saved) {
      try {
        setMessages(JSON.parse(saved));
      } catch {
        setDefaultWelcome();
      }
    } else {
      setDefaultWelcome();
    }
    setIsLoaded(true);
  }, []);

  // Save to local storage when messages change
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("aurainvest_chat_history", JSON.stringify(messages));
    }
  }, [messages, isLoaded]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, activeAnalysisState]);

  const handleSendMessage = useCallback(
    async (textToSend: string) => {
      if (textToSend.trim().length === 0 || loading) return;

      const userMsgId = `user-${Date.now()}`;
      const assistantMsgId = `assistant-${Date.now()}`;

      const userMsg: ChatMessage = {
        id: userMsgId,
        sender: "user",
        text: textToSend,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setLoading(true);
      setActiveAnalysisState(null);

      // Add a placeholder message for the assistant
      setMessages((prev) => [
        ...prev,
        {
          id: assistantMsgId,
          sender: "assistant",
          text: "",
          timestamp: new Date().toISOString(),
          isAnalyzing: false,
        },
      ]);

      try {
        const response = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: textToSend,
            history: messages,
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        if (!response.body) {
          throw new Error("No response stream available");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let streamText = "";
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let graphResult: any = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const event = JSON.parse(line.slice(6));

              // 1. Intent Classified
              if (event.type === "intent_classified") {
                const initialStatuses: Record<string, NodeStatus> = {};
                PIPELINE_NODES.forEach((n) => (initialStatuses[n.id] = "pending"));

                setActiveAnalysisState({
                  companyName: event.companyName,
                  activeNode: "entityResolver",
                  completedNodes: [],
                  nodeStatuses: initialStatuses,
                });

                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMsgId
                      ? {
                          ...m,
                          text: `🔍 Initializing multi-agent research pipeline for **${event.companyName}**...`,
                          isAnalyzing: true,
                        }
                      : m
                  )
                );
              }

              // 2. Node Started
              if (event.type === "node_start") {
                setActiveAnalysisState((prev) => {
                  if (!prev) return null;
                  return {
                    ...prev,
                    activeNode: event.node,
                    nodeStatuses: {
                      ...prev.nodeStatuses,
                      [event.node]: "running",
                    },
                  };
                });
              }

              // 3. Node Completed
              if (event.type === "node_complete") {
                setActiveAnalysisState((prev) => {
                  if (!prev) return null;
                  return {
                    ...prev,
                    completedNodes: [...prev.completedNodes, event.node],
                    nodeStatuses: {
                      ...prev.nodeStatuses,
                      [event.node]: "completed",
                    },
                  };
                });
              }

              // 4. Node Error
              if (event.type === "node_error") {
                setActiveAnalysisState((prev) => {
                  if (!prev) return null;
                  return {
                    ...prev,
                    nodeStatuses: {
                      ...prev.nodeStatuses,
                      [event.node]: "error",
                    },
                  };
                });
              }

              // 5. Final Result
              if (event.type === "final_result") {
                graphResult = event.data;
              }

              // 6. Direct Chat Response
              if (event.type === "chat_response") {
                streamText = event.text;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMsgId
                      ? { ...m, text: streamText, isAnalyzing: false }
                      : m
                  )
                );
              }

              // 7. General Error
              if (event.type === "error") {
                throw new Error(event.error);
              }
            } catch (err) {
              console.error("Error parsing stream chunk:", err);
            }
          }
        }

        // Finalize state
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id === assistantMsgId) {
              if (graphResult) {
                const verdict = graphResult.decision?.verdict || "Pass";
                const summary = graphResult.decision?.executiveSummary || "Analysis complete.";
                const company = graphResult.resolvedEntity?.name || graphResult.companyName;
                const ticker = graphResult.resolvedEntity?.ticker ? ` (${graphResult.resolvedEntity.ticker})` : "";

                return {
                  ...m,
                  text: `## 📊 Research Report: **${company}${ticker}**\n\n**Verdict:** ${verdict === "Invest" ? "🟢 **INVEST / BUY**" : "⚠️ **PASS / CAUTIOUS**"} · **Confidence:** **${graphResult.decision?.confidence ?? 0}%**\n\n> 💡 **Summary**: ${summary}`,
                  isAnalyzing: false,
                  analysisResult: graphResult as AgentState,
                };
              }
              return {
                ...m,
                isAnalyzing: false,
              };
            }
            return m;
          })
        );

        if (graphResult) {
          setExpandedAnalysisId(assistantMsgId);
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Request failed";
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId
              ? {
                  ...m,
                  text: `⚠️ **Analysis Error**: ${errorMsg}. Please check your connection or query.`,
                  isAnalyzing: false,
                }
              : m
          )
        );
      } finally {
        setLoading(false);
        setActiveAnalysisState(null);
      }
    },
    [loading, messages]
  );

  const handleNewChat = () => setShowClearConfirm(true);

  const confirmClearChat = () => {
    const welcome: ChatMessage = {
      id: "welcome",
      sender: "assistant",
      text: "👋 **Welcome to AuraInvest AI** — your institutional multi-agent equity research terminal.\n\nAsk me about any company (public or private), e.g. *\"Is Nvidia a buy?\"* or *\"Analyze Tesla's valuation\"*. I will run 7 autonomous research nodes to deliver a comprehensive Buy/Pass verdict with score breakdowns, risk flags, and live financial metrics.",
      timestamp: new Date().toISOString(),
    };
    setMessages([welcome]);
    localStorage.setItem("aurainvest_chat_history", JSON.stringify([welcome]));
    setExpandedAnalysisId(null);
    setShowClearConfirm(false);
  };

  return (
    <main className="flex-1 flex flex-col max-w-6xl mx-auto w-full h-screen px-4 sm:px-6 py-4">
      {/* ─── Top Navigation Bar ─── */}
      <header className="flex items-center justify-between py-3.5 px-4 sm:px-6 rounded-2xl glass-panel mb-4">
        <div className="flex items-center gap-3.5">
          {/* Logo Badge */}
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 via-cyan-500 to-purple-600 p-[1px] shadow-lg shadow-cyan-500/20">
            <div className="w-full h-full bg-slate-950 rounded-[11px] flex items-center justify-center text-lg">
              ⚡
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-extrabold tracking-tight text-white font-sans">
                AuraInvest <span className="text-cyan-400">AI</span>
              </h1>
              <span className="hidden sm:inline-flex px-2 py-0.5 text-[10px] font-mono font-bold rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                v2.0
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Multi-Node LangGraph Pipeline · Powered by Groq LPU
            </p>
          </div>
        </div>

        {/* Status Indicators & Clear Action */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/60 border border-white/5 text-xs">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
            <span className="text-slate-300 font-mono text-[11px]">
              Groq Engine Online
            </span>
          </div>

          {messages.length > 1 && (
            <button
              onClick={handleNewChat}
              className="text-xs font-semibold px-3.5 py-1.5 rounded-xl transition-all border border-rose-500/30 text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 hover:border-rose-500/50 cursor-pointer flex items-center gap-1.5"
            >
              <span>🧹</span>
              <span>New Session</span>
            </button>
          )}
        </div>
      </header>

      {/* ─── Chat Feed Section ─── */}
      <section className="flex-1 overflow-y-auto px-1 py-4 space-y-6 scrollbar-thin">
        {messages.map((message) => {
          const isUser = message.sender === "user";
          const hasResult = !!message.analysisResult;
          const isExpanded = expandedAnalysisId === message.id;

          return (
            <div
              key={message.id}
              className={`flex flex-col ${isUser ? "items-end animate-slide-up" : "items-start animate-fade-in"}`}
            >
              {/* Message Header Avatar & Label */}
              <div className="flex items-center gap-2 mb-1.5 px-1">
                <span className="text-xs font-semibold text-slate-400 font-mono">
                  {isUser ? "👤 You" : "🤖 AuraInvest Agent"}
                </span>
              </div>

              {/* Message Bubble Card */}
              <div
                className={`max-w-[92%] sm:max-w-[85%] rounded-2xl p-5 text-sm leading-relaxed border transition-all ${
                  isUser
                    ? "bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white border-white/10 shadow-lg shadow-cyan-900/20 rounded-tr-none"
                    : "glass-panel text-slate-200 rounded-tl-none border-white/10"
                }`}
              >
                {/* Message Content */}
                <div className="whitespace-pre-wrap leading-relaxed space-y-2">
                  {message.text}
                </div>

                {/* Inline Multi-Node Research Progress Tracker */}
                {message.isAnalyzing && activeAnalysisState && (
                  <div className="mt-4 p-4 rounded-xl bg-slate-950/60 border border-cyan-500/20 shadow-inner">
                    <PipelineProgress
                      nodes={PIPELINE_NODES.map((node) => ({
                        ...node,
                        status: activeAnalysisState.nodeStatuses[node.id] || "pending",
                      }))}
                    />
                  </div>
                )}

                {/* Toggle Dashboard Button */}
                {hasResult && message.analysisResult && (
                  <div className="mt-4 pt-3.5 border-t border-white/10 flex flex-wrap justify-between items-center gap-3">
                    <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                      <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                      <span>Target: {message.analysisResult.resolvedEntity?.ticker || message.analysisResult.companyName}</span>
                    </div>
                    <button
                      onClick={() => setExpandedAnalysisId(isExpanded ? null : message.id)}
                      className="text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-2 shadow-md"
                      style={{
                        background: isExpanded
                          ? "rgba(255, 255, 255, 0.08)"
                          : "linear-gradient(135deg, #10b981 0%, #06b6d4 100%)",
                        color: "white",
                        border: isExpanded ? "1px solid rgba(255,255,255,0.15)" : "none",
                      }}
                    >
                      <span>{isExpanded ? "▲ Collapse Cockpit" : "📊 Open Full Research Cockpit"}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* ─── Expanded Full Interactive Research Cockpit ─── */}
              {isExpanded && message.analysisResult && (
                <div className="w-full mt-5 space-y-6 animate-slide-up">
                  {/* Entity Header Banner */}
                  {message.analysisResult.resolvedEntity && (
                    <div className="glass-panel p-5 flex flex-wrap items-center justify-between gap-4 border border-cyan-500/20">
                      <div className="flex items-center gap-3.5">
                        {message.analysisResult.resolvedEntity.logo ? (
                          <img
                            src={message.analysisResult.resolvedEntity.logo}
                            alt={message.analysisResult.resolvedEntity.name}
                            className="w-12 h-12 rounded-xl object-contain bg-white p-1 shadow-md"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-slate-800 border border-white/10 flex items-center justify-center text-xl">
                            🏢
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                              {message.analysisResult.resolvedEntity.name}
                            </h2>
                            <span className="px-2.5 py-0.5 rounded-md text-xs font-mono font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                              {message.analysisResult.resolvedEntity.ticker}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {message.analysisResult.resolvedEntity.exchange} ·{" "}
                            {message.analysisResult.resolvedEntity.sector} ·{" "}
                            {message.analysisResult.resolvedEntity.country || "Global"}
                          </p>
                        </div>
                      </div>

                      {/* Stock Price Pill */}
                      {message.analysisResult.financials && (
                        <div className="text-right">
                          <div className="text-lg font-bold font-mono text-white">
                            ${message.analysisResult.financials.currentPrice.toFixed(2)}
                          </div>
                          <span
                            className={`text-xs font-mono font-bold ${
                              message.analysisResult.financials.change >= 0
                                ? "text-emerald-400"
                                : "text-rose-400"
                            }`}
                          >
                            {message.analysisResult.financials.change >= 0 ? "▲ +" : "▼ "}
                            {message.analysisResult.financials.changePercent.toFixed(2)}%
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 1. Primary Verdict Card */}
                  {message.analysisResult.decision && (
                    <DecisionCard
                      decision={message.analysisResult.decision}
                      companyName={
                        message.analysisResult.resolvedEntity?.name || message.analysisResult.companyName
                      }
                    />
                  )}

                  {/* 2. Dual-Column Intelligence Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left Column */}
                    <div className="space-y-6">
                      {message.analysisResult.decision && (
                        <ScoreBreakdownComponent
                          scores={message.analysisResult.decision.scoreBreakdown}
                        />
                      )}

                      {message.analysisResult.overview && (
                        <OverviewCard overview={message.analysisResult.overview} />
                      )}

                      {message.analysisResult.financials && (
                        <FinancialsCard
                          financials={message.analysisResult.financials}
                          ticker={message.analysisResult.resolvedEntity?.ticker || ""}
                        />
                      )}
                    </div>

                    {/* Right Column */}
                    <div className="space-y-6">
                      {message.analysisResult.news && (
                        <NewsSentiment news={message.analysisResult.news} />
                      )}

                      {message.analysisResult.risks && (
                        <RiskFlags risks={message.analysisResult.risks} />
                      )}

                      {message.analysisResult.competitive && (
                        <CompetitiveLandscape
                          competitive={message.analysisResult.competitive}
                        />
                      )}
                    </div>
                  </div>

                  {/* Non-fatal Warnings / Data Gaps */}
                  {message.analysisResult.errors && message.analysisResult.errors.length > 0 && (
                    <div className="glass-panel p-4 border-l-4 border-amber-400 bg-amber-950/10">
                      <h4 className="text-xs font-bold uppercase tracking-wider mb-1.5 text-amber-300 flex items-center gap-1.5">
                        <span>ℹ️</span> Data Quality & Coverage Notes
                      </h4>
                      <ul className="space-y-1 text-xs text-slate-400">
                        {message.analysisResult.errors.map((err, i) => (
                          <li key={i}>• {err}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </section>

      {/* ─── Hero Quick-Prompt Suggestions (Shown on initial load) ─── */}
      {messages.length === 1 && !loading && (
        <section className="mb-4 animate-slide-up">
          <div className="p-4 rounded-2xl glass-panel space-y-3">
            <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider text-center">
              💡 Suggested Market Queries
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {SUGGESTION_CATEGORIES.map((cat, idx) => (
                <div key={idx} className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-400 pl-1">
                    {cat.category}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {cat.items.map((chip, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setInput(chip.query);
                          handleSendMessage(chip.query);
                        }}
                        className="text-xs px-3 py-1.5 rounded-xl border border-white/10 bg-slate-900/50 hover:bg-cyan-500/10 hover:border-cyan-500/30 text-slate-200 transition-all cursor-pointer"
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── Floating Search / Input Bar ─── */}
      <footer className="pt-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage(input);
          }}
          className="relative flex items-center glass-panel p-1.5 shadow-2xl border-white/10"
        >
          <div className="pl-3.5 pr-2 text-slate-400">
            <span>🔍</span>
          </div>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            placeholder={
              loading
                ? "Autonomous agents analyzing pipeline..."
                : "Ask anything: 'Analyze NVDA', 'Is Tesla a buy?', 'Tata Motors valuation'..."
            }
            className="flex-1 bg-transparent border-none text-slate-100 placeholder-slate-500 text-sm focus:outline-none py-3 pr-24"
          />
          <button
            type="submit"
            disabled={loading || input.trim().length === 0}
            className="btn-primary px-5 py-2.5 text-xs font-bold flex items-center gap-1.5 shadow-lg disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <span>{loading ? "Analyzing..." : "Research"}</span>
            <span>↵</span>
          </button>
        </form>
        <p className="text-[10px] text-center text-slate-500 mt-2 font-mono">
          AuraInvest AI provides algorithmic financial research. Not direct financial advice.
        </p>
      </footer>

      {/* ─── Clear-Chat Confirmation Modal ─── */}
      {showClearConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
          onClick={() => setShowClearConfirm(false)}
        >
          <div
            className="glass-panel p-6 w-full max-w-sm border-white/10 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg bg-rose-500/15 border border-rose-500/30 text-rose-400">
                🗑️
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-100">
                  Reset Research Session?
                </h3>
                <p className="text-xs text-slate-400">
                  Clear all chat and report history
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-300 mb-5 leading-relaxed">
              This will clear the current conversation and saved reports. This action cannot be undone.
            </p>
            <div className="flex gap-2.5 justify-end">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 rounded-xl text-xs text-slate-300 bg-slate-800/80 hover:bg-slate-800 border border-white/10 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmClearChat}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 shadow-lg shadow-rose-500/25 transition-all cursor-pointer"
              >
                Clear History
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

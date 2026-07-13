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
  { id: "newsSentiment", label: "News & Sentiment", description: "Analyzing recent headlines" },
  { id: "competitiveAnalysis", label: "Competitive", description: "Market position & peers" },
  { id: "riskFlags", label: "Risk Flags", description: "Scanning for red flags" },
  { id: "synthesis", label: "Decision", description: "Weighing all signals" },
];

const SUGGESTIONS = [
  { label: "Is Microsoft (MSFT) a buy?", query: "Is Microsoft a buy?" },
  { label: "Research MyFitnessPal", query: "Research MyFitnessPal" },
  { label: "Analyze SBUX stock", query: "Analyze SBUX stock" },
];

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [expandedAnalysisId, setExpandedAnalysisId] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Load from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem("research_chat_history");
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
      localStorage.setItem("research_chat_history", JSON.stringify(messages));
    }
  }, [messages, isLoaded]);

  const setDefaultWelcome = () => {
    setMessages([
      {
        id: "welcome",
        sender: "assistant",
        text: "Hello! I am your AI Investment Research Agent. Ask me about any company (public or private), e.g. 'Is Microsoft a buy?' or ask general questions. I will research the stock across multiple dimensions and provide a Buy/Pass verdict.",
        timestamp: new Date().toISOString(),
      },
    ]);
  };

  // Streaming state for the active analysis
  const [activeAnalysisState, setActiveAnalysisState] = useState<{
    companyName: string;
    activeNode: string;
    completedNodes: string[];
    nodeStatuses: Record<string, NodeStatus>;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

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

      // Reset active stream checklists
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
          throw new Error("No response body (streaming not supported)");
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
          const events = buffer.split("\n\n");
          buffer = events.pop() || "";

          for (const event of events) {
            const dataLine = event
              .split("\n")
              .find((line) => line.startsWith("data: "));
            if (!dataLine) continue;

            try {
              const eventData = JSON.parse(dataLine.slice(6));

              switch (eventData.type) {
                case "chat_response":
                  streamText += eventData.text;
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantMsgId
                        ? { ...m, text: streamText }
                        : m
                    )
                  );
                  break;

                case "intent_classified":
                  // User asked for analysis, trigger loader
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantMsgId
                        ? {
                            ...m,
                            text: `Initiating multi-node analysis for **${eventData.companyName}**...`,
                            isAnalyzing: true,
                          }
                        : m
                    )
                  );
                  setActiveAnalysisState({
                    companyName: eventData.companyName,
                    activeNode: "entityResolver",
                    completedNodes: [],
                    nodeStatuses: Object.fromEntries(
                      PIPELINE_NODES.map((n) => [n.id, "pending" as NodeStatus])
                    ),
                  });
                  break;

                case "node_start":
                  setActiveAnalysisState((prev) => {
                    if (!prev) return null;
                    return {
                      ...prev,
                      activeNode: eventData.node,
                      nodeStatuses: {
                        ...prev.nodeStatuses,
                        [eventData.node]: "running" as NodeStatus,
                      },
                    };
                  });
                  break;

                case "node_complete":
                  setActiveAnalysisState((prev) => {
                    if (!prev) return null;
                    return {
                      ...prev,
                      completedNodes: [...prev.completedNodes, eventData.node],
                      nodeStatuses: {
                        ...prev.nodeStatuses,
                        [eventData.node]: "completed" as NodeStatus,
                      },
                    };
                  });
                  break;

                case "node_error":
                  setActiveAnalysisState((prev) => {
                    if (!prev) return null;
                    return {
                      ...prev,
                      nodeStatuses: {
                        ...prev.nodeStatuses,
                        [eventData.node]: "error" as NodeStatus,
                      },
                    };
                  });
                  break;

                case "final_result":
                  graphResult = eventData.data;
                  break;
              }
            } catch (err) {
              console.warn("SSE event parsing error:", err);
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
                return {
                  ...m,
                  text: `Analysis complete! Here is the investment report for **${
                    graphResult.resolvedEntity?.name || graphResult.companyName
                  }**. I recommend **${verdict}**.
                  
> **Summary**: ${summary}`,
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
                  text: `Sorry, I encountered an error during analysis: ${errorMsg}`,
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
      text: "Hello! I am your AI Investment Research Agent. Ask me about any company (public or private), e.g. 'Is Microsoft a buy?' or ask general questions. I will research the stock across multiple dimensions and provide a Buy/Pass verdict.",
      timestamp: new Date().toISOString(),
    };
    setMessages([welcome]);
    localStorage.setItem("research_chat_history", JSON.stringify([welcome]));
    setExpandedAnalysisId(null);
    setShowClearConfirm(false);
  };

  return (
    <main className="flex-1 flex flex-col max-w-5xl mx-auto w-full h-[calc(100vh-2rem)] my-4 px-4">
      {/* ─── Header ─── */}
      <header className="flex items-center justify-between py-4 border-b border-[rgba(255,255,255,0.08)]">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shadow-md"
            style={{
              background: "linear-gradient(135deg, var(--invest-from), var(--invest-to))",
            }}
          >
            🤖
          </div>
          <div>
            <h1 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
              AI Investment Research Chatbot
            </h1>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Multi-node LangGraph Pipeline · Powered by Groq Llama 3.3
            </p>
          </div>
        </div>

        {messages.length > 1 && (
          <button
            onClick={handleNewChat}
            className="text-xs px-3.5 py-2 rounded-lg transition-all border border-[rgba(239,68,68,0.3)] text-[var(--accent-red)] hover:bg-[rgba(239,68,68,0.08)] cursor-pointer hover:border-[rgba(239,68,68,0.6)]"
          >
            🧹 New Chat
          </button>
        )}
      </header>

      {/* ─── Chat Area ─── */}
      <section className="flex-1 overflow-y-auto py-6 space-y-6 pr-2 scrollbar-thin">
        {messages.map((message) => {
          const isUser = message.sender === "user";
          const hasResult = !!message.analysisResult;
          const isExpanded = expandedAnalysisId === message.id;

          return (
            <div
              key={message.id}
              className={`flex flex-col ${isUser ? "items-end animate-slide-up" : "items-start animate-fade-in"}`}
            >
              {/* Message Bubble */}
              <div
                className={`max-w-[85%] rounded-2xl px-5 py-3.5 text-sm leading-relaxed border shadow-sm ${
                  isUser
                    ? "bg-gradient-invest text-white border-[rgba(6,182,212,0.3)] rounded-tr-none"
                    : "glass-card text-[var(--text-primary)] rounded-tl-none"
                }`}
              >
                {/* Text Content */}
                <p className="whitespace-pre-wrap">{message.text}</p>

                {/* Inline loading graph checklist */}
                {message.isAnalyzing && activeAnalysisState && (
                  <div className="mt-4 p-4 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.05)]">
                    <PipelineProgress
                      nodes={PIPELINE_NODES.map((node) => ({
                        ...node,
                        status: activeAnalysisState.nodeStatuses[node.id] || "pending",
                      }))}
                    />
                  </div>
                )}

                {/* Collapsible Action Button for Investment Report */}
                {hasResult && message.analysisResult && (
                  <div className="mt-4 pt-3 border-t border-[rgba(255,255,255,0.08)] flex justify-between items-center">
                    <span className="text-xs text-[var(--text-muted)] font-mono">
                      Target: {message.analysisResult.resolvedEntity?.ticker || message.analysisResult.companyName}
                    </span>
                    <button
                      onClick={() => setExpandedAnalysisId(isExpanded ? null : message.id)}
                      className="text-xs font-bold px-3.5 py-1.5 rounded-lg transition-all"
                      style={{
                        background: isExpanded ? "rgba(255,255,255,0.08)" : "linear-gradient(135deg, var(--invest-from), var(--invest-to))",
                        color: "white",
                      }}
                    >
                      {isExpanded ? "Close Dashboard" : "🔍 View Full Report"}
                    </button>
                  </div>
                )}
              </div>

              {/* Render Full Dashboard if Result is Expanded */}
              {isExpanded && message.analysisResult && (
                <div className="w-full mt-4 space-y-6 animate-slide-up">
                  {/* Company Header Info */}
                  {message.analysisResult.resolvedEntity && (
                    <div className="flex items-center gap-3 glass-card p-4">
                      {message.analysisResult.resolvedEntity.logo && (
                        <img
                          src={message.analysisResult.resolvedEntity.logo}
                          alt={message.analysisResult.resolvedEntity.name}
                          className="w-10 h-10 rounded-lg object-contain bg-white p-0.5"
                        />
                      )}
                      <div>
                        <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
                          {message.analysisResult.resolvedEntity.name}
                        </h2>
                        <span className="text-xs font-mono" style={{ color: "var(--text-muted)" }}>
                          {message.analysisResult.resolvedEntity.ticker} ·{" "}
                          {message.analysisResult.resolvedEntity.exchange} ·{" "}
                          {message.analysisResult.resolvedEntity.sector}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Redesigned Decision Card (Verdict, bottom line, pros/cons) */}
                  {message.analysisResult.decision && (
                    <DecisionCard
                      decision={message.analysisResult.decision}
                      companyName={
                        message.analysisResult.resolvedEntity?.name || message.analysisResult.companyName
                      }
                    />
                  )}

                  {/* Left-Right Dual Column details */}
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

                  {/* Error Notices (Non-fatal) */}
                  {message.analysisResult.errors && message.analysisResult.errors.length > 0 && (
                    <div className="glass-card p-4 border-l-4 border-[var(--accent-yellow)]">
                      <h4 className="text-xs font-bold uppercase tracking-wider mb-2 text-[var(--accent-yellow)]">
                        ⚠️ Notices / Data Gaps
                      </h4>
                      <ul className="space-y-1 text-xs" style={{ color: "var(--text-muted)" }}>
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

      {/* ─── Suggestion Chips ─── */}
      {messages.length === 1 && !loading && (
        <section className="mb-3">
          <p className="text-xs mb-2 text-center" style={{ color: "var(--text-muted)" }}>
            Try asking one of these:
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {SUGGESTIONS.map((chip, i) => (
              <button
                key={i}
                onClick={() => {
                  setInput(chip.query);
                  handleSendMessage(chip.query);
                }}
                className="text-xs px-3.5 py-1.5 rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] transition-all hover:bg-[rgba(255,255,255,0.05)] cursor-pointer text-white"
              >
                {chip.label}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ─── Input Bar ─── */}
      <footer className="py-4 border-t border-[rgba(255,255,255,0.08)]">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage(input);
          }}
          className="flex gap-2 relative items-center"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            placeholder={
              loading ? "Processing..." : "Ask: 'Should I buy Apple?' or 'Hi, explain the risks of TSLA'..."
            }
            className="search-input flex-1 px-4 py-3.5 pr-14 text-sm"
          />
          <button
            type="submit"
            disabled={loading || input.trim().length === 0}
            className="absolute right-2 px-3 py-2 btn-primary text-sm flex items-center justify-center shadow-md disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </form>
      </footer>
      {/* ─── Custom Clear-Chat Confirmation Modal ─── */}
      {showClearConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(6px)" }}
          onClick={() => setShowClearConfirm(false)}
        >
          <div
            className="rounded-2xl p-6 w-full max-w-sm shadow-2xl border"
            style={{
              background: "var(--card-bg)",
              borderColor: "rgba(255,255,255,0.08)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                style={{ background: "rgba(239,68,68,0.12)" }}
              >
                🗑️
              </div>
              <h3 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
                Start New Chat?
              </h3>
            </div>
            <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
              This will clear the entire conversation history, including all analysis results. This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 rounded-lg text-sm transition-all cursor-pointer"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  color: "var(--text-secondary)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmClearChat}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer"
                style={{
                  background: "linear-gradient(135deg, #ef4444, #dc2626)",
                  color: "#fff",
                  border: "none",
                  boxShadow: "0 2px 12px rgba(239,68,68,0.3)",
                }}
              >
                Clear & Start Fresh
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

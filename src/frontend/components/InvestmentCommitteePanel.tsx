"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  CommitteeDocument,
  CommitteeStepState,
  CommitteeStreamEvent,
  InvestmentCommitteeReport,
} from "@/frontend/types";
import DocumentManager from "@/frontend/components/DocumentManager";
import CommitteeProgress from "@/frontend/components/CommitteeProgress";
import CommitteeReportView from "@/frontend/components/CommitteeReportView";

const INITIAL_COMMITTEE_STEPS: CommitteeStepState[] = [
  {
    id: "research",
    label: "Research Agent",
    description: "RAG retrieval & verified PDF citations",
    status: "pending",
  },
  {
    id: "bull_bear",
    label: "Bull & Bear (Parallel)",
    description: "Concurrent BUY vs AVOID cases",
    status: "pending",
  },
  {
    id: "exchange",
    label: "Argument Exchange",
    description: "Pair opposing arguments for rebuttal",
    status: "pending",
  },
  {
    id: "rebuttal",
    label: "Rebuttal Agent",
    description: "Bull & Bear cross-rebuttals",
    status: "pending",
  },
  {
    id: "judge",
    label: "Judge Agent",
    description: "Neutral BUY / HOLD / AVOID verdict",
    status: "pending",
  },
  {
    id: "risk",
    label: "Risk Agent",
    description: "Independent 0–100 risk criteria score",
    status: "pending",
  },
  {
    id: "enforcement",
    label: "Risk Veto Check",
    description: "Deterministic HOLD override if ≥ threshold",
    status: "pending",
  },
  {
    id: "report",
    label: "Final Report",
    description: "Compile traceable committee memo",
    status: "pending",
  },
];

const REPORTS_STORAGE_KEY = "aurainvest_committee_reports";

export default function InvestmentCommitteePanel() {
  const [documents, setDocuments] = useState<CommitteeDocument[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [docsError, setDocsError] = useState<string | null>(null);

  const [companyName, setCompanyName] = useState("");
  const [focusQuery, setFocusQuery] = useState("");
  const [riskVetoThreshold, setRiskVetoThreshold] = useState<number>(70);

  const [isRunning, setIsRunning] = useState(false);
  const [runError, setRunError] = useState<string | null>(null);
  const [steps, setSteps] = useState<CommitteeStepState[]>(INITIAL_COMMITTEE_STEPS);

  const [reports, setReports] = useState<InvestmentCommitteeReport[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(REPORTS_STORAGE_KEY);
        if (raw) return JSON.parse(raw);
      } catch {
        // ignore storage corruption
      }
    }
    return [];
  });
  const [activeReportId, setActiveReportId] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(REPORTS_STORAGE_KEY);
        if (raw) {
          const parsed: InvestmentCommitteeReport[] = JSON.parse(raw);
          return parsed[0]?.report_id ?? null;
        }
      } catch {
        // ignore
      }
    }
    return null;
  });

  const applyDocumentList = useCallback((list: CommitteeDocument[]) => {
    setDocsError(null);
    setDocuments(list);
    setSelectedDocIds((prev) => {
      const existingIds = new Set(list.map((d) => d.doc_id));
      const retained = prev.filter((id) => existingIds.has(id));
      if (retained.length === 0 && list.length > 0) {
        return list.map((d) => d.doc_id);
      }
      const added = list
        .map((d) => d.doc_id)
        .filter((id) => !prev.includes(id));
      return Array.from(new Set([...retained, ...added]));
    });
  }, []);

  const loadDocuments = useCallback(async () => {
    try {
      const res = await fetch("/api/committee/documents", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Unable to load documents");
      }
      const list: CommitteeDocument[] = Array.isArray(data.documents) ? data.documents : [];
      applyDocumentList(list);
    } catch (error) {
      setDocsError(
        error instanceof Error ? error.message : "Failed to load document vault"
      );
    }
  }, [applyDocumentList]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/committee/documents", { cache: "no-store" })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Unable to load documents");
        }
        return Array.isArray(data.documents) ? (data.documents as CommitteeDocument[]) : [];
      })
      .then((list) => {
        if (!cancelled) {
          applyDocumentList(list);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setDocsError(
            error instanceof Error ? error.message : "Failed to load document vault"
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [applyDocumentList]);

  useEffect(() => {
    try {
      localStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(reports.slice(0, 10)));
    } catch {
      // ignore storage quota errors
    }
  }, [reports]);

  const handleToggleDoc = (docId: string) => {
    setSelectedDocIds((prev) =>
      prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]
    );
  };

  const handleSelectAll = () => {
    if (selectedDocIds.length === documents.length) {
      setSelectedDocIds([]);
    } else {
      setSelectedDocIds(documents.map((d) => d.doc_id));
    }
  };

  const handleRunCommittee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim() || isRunning) return;

    setIsRunning(true);
    setRunError(null);
    setSteps(INITIAL_COMMITTEE_STEPS.map((s) => ({ ...s, status: "pending", summary: undefined })));

    try {
      const response = await fetch("/api/committee/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: companyName.trim(),
          query: focusQuery.trim(),
          docIds: selectedDocIds,
          riskVetoThreshold,
        }),
      });

      if (!response.ok) {
        const errPayload = await response.json().catch(() => ({}));
        throw new Error(errPayload.error || `HTTP ${response.status}`);
      }

      if (!response.body) {
        throw new Error("Missing SSE response body from committee workflow.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() || "";

        for (const rawEvent of events) {
          const line = rawEvent
            .split("\n")
            .find((l) => l.startsWith("data: "));
          if (!line) continue;

          const event = JSON.parse(line.slice(6)) as CommitteeStreamEvent;

          if (event.type === "stage_start" && event.stage) {
            setSteps((prev) =>
              prev.map((s) =>
                s.id === event.stage ? { ...s, status: "running" } : s
              )
            );
          } else if (event.type === "stage_complete" && event.stage) {
            setSteps((prev) =>
              prev.map((s) =>
                s.id === event.stage
                  ? { ...s, status: "completed", summary: event.summary || s.summary }
                  : s
              )
            );
          } else if (event.type === "stage_error" && event.stage) {
            setSteps((prev) =>
              prev.map((s) =>
                s.id === event.stage
                  ? { ...s, status: "error", summary: event.error }
                  : s
              )
            );
          } else if (event.type === "final_report" && event.report) {
            const completedReport = event.report;
            setReports((prev) => [completedReport, ...prev.filter((r) => r.report_id !== completedReport.report_id)]);
            setActiveReportId(completedReport.report_id);
          } else if (event.type === "error") {
            throw new Error(event.error || "Committee workflow failed");
          }
        }
      }
    } catch (error) {
      setRunError(
        error instanceof Error ? error.message : "Investment Committee run failed"
      );
    } finally {
      setIsRunning(false);
    }
  };

  const activeReport =
    reports.find((r) => r.report_id === activeReportId) || reports[0] || null;
  const hasStartedAnyStep = steps.some((s) => s.status !== "pending");

  return (
    <div className="flex-1 overflow-y-auto px-1 py-2 space-y-6 scrollbar-thin">
      {docsError && (
        <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/30 text-xs text-rose-200">
          ⚠️ {docsError}
        </div>
      )}

      {/* ─── PDF Document Upload & Vault ─── */}
      <DocumentManager
        documents={documents}
        selectedDocIds={selectedDocIds}
        onToggleDoc={handleToggleDoc}
        onSelectAll={handleSelectAll}
        onDocumentsChanged={loadDocuments}
        disabled={isRunning}
      />

      {/* ─── Committee Controls Form ─── */}
      <form onSubmit={handleRunCommittee} className="glass-card p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-sm">
              🏛️
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">
                Debate-Driven Investment Committee
              </h3>
              <p className="text-[11px] text-slate-400">
                Research → Parallel Bull/Bear → Exchange → Rebuttal → Judge → Independent Risk → Deterministic Veto
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-300 border border-cyan-500/20">
            Microsoft Agent Framework
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label
              htmlFor="committee-company-name"
              className="text-xs font-semibold text-slate-300 block"
            >
              Company / Asset Name *
            </label>
            <input
              id="committee-company-name"
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              disabled={isRunning}
              placeholder="e.g. NVIDIA Corporation, Acme BioTech..."
              className="search-input w-full px-3.5 py-2.5 text-sm"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="committee-focus-query"
              className="text-xs font-semibold text-slate-300 block"
            >
              Committee Focus / Research Mandate (Optional)
            </label>
            <input
              id="committee-focus-query"
              type="text"
              value={focusQuery}
              onChange={(e) => setFocusQuery(e.target.value)}
              disabled={isRunning}
              placeholder="e.g. Assess margin durability, debt covenants, and litigation risks"
              className="search-input w-full px-3.5 py-2.5 text-sm"
            />
          </div>
        </div>

        {/* Configurable Risk Veto Threshold + Run CTA */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
          <div className="flex-1 min-w-[240px] space-y-1">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="risk-veto-slider" className="font-semibold text-slate-300">
                Risk Veto Threshold (Forces HOLD if Risk Score ≥ Threshold)
              </label>
              <span className="font-mono font-bold px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                {riskVetoThreshold} / 100
              </span>
            </div>
            <input
              id="risk-veto-slider"
              type="range"
              min={0}
              max={100}
              step={1}
              value={riskVetoThreshold}
              onChange={(e) => setRiskVetoThreshold(Number(e.target.value))}
              disabled={isRunning}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>

          <button
            type="submit"
            disabled={isRunning || companyName.trim().length === 0}
            className="btn-primary px-5 py-2.5 text-xs font-bold flex items-center gap-2 disabled:opacity-40"
          >
            <span>{isRunning ? "⏳ Convening Committee..." : "⚖️ Convene Investment Committee"}</span>
          </button>
        </div>

        {documents.length > 0 && selectedDocIds.length === 0 && (
          <p className="text-[11px] text-amber-300">
            ⚠️ No documents selected. Committee will note insufficient evidence rather than inventing citations.
          </p>
        )}
      </form>

      {runError && (
        <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/40 text-xs text-rose-200">
          ⚠️ <strong>Committee Error:</strong> {runError}
        </div>
      )}

      {/* ─── Agent Execution Progress ─── */}
      {(isRunning || hasStartedAnyStep) && (
        <CommitteeProgress steps={steps} isRunning={isRunning} />
      )}

      {/* ─── Previous / Saved Committee Reports Switcher ─── */}
      {reports.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 px-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-400">Saved Reports:</span>
            {reports.map((rep) => {
              const active = activeReport?.report_id === rep.report_id;
              return (
                <button
                  key={rep.report_id}
                  type="button"
                  onClick={() => setActiveReportId(rep.report_id)}
                  className={`text-xs px-3 py-1 rounded-lg border transition-all cursor-pointer ${
                    active
                      ? "bg-blue-600 text-white border-blue-500"
                      : "bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800"
                  }`}
                >
                  {rep.company_name} ({rep.final_decision})
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => {
              setReports([]);
              setActiveReportId(null);
              localStorage.removeItem(REPORTS_STORAGE_KEY);
            }}
            className="text-[11px] text-slate-400 hover:text-rose-300 cursor-pointer"
          >
            Clear Saved Reports
          </button>
        </div>
      )}

      {/* ─── Full Debate & Verdict Report ─── */}
      {activeReport && <CommitteeReportView report={activeReport} />}
    </div>
  );
}

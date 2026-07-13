"use client";

import type { NodeStatus } from "@/frontend/types";

interface PipelineNode {
  id: string;
  label: string;
  status: NodeStatus;
}

interface PipelineProgressProps {
  nodes: PipelineNode[];
}

const NODE_ICONS: Record<string, string> = {
  entityResolver: "🔍",
  financialData: "📊",
  newsSentiment: "📰",
  competitiveAnalysis: "⚔️",
  riskFlags: "⚠️",
  synthesis: "🧠",
};

export default function PipelineProgress({ nodes }: PipelineProgressProps) {
  return (
    <div className="w-full max-w-4xl mx-auto py-8">
      {/* Desktop: Horizontal pipeline */}
      <div className="hidden md:flex items-center justify-between gap-1">
        {nodes.map((node, i) => (
          <div key={node.id} className="flex items-center flex-1">
            {/* Node */}
            <div
              className={`pipeline-node ${node.status} flex flex-col items-center gap-2 min-w-[100px]`}
            >
              <div className="relative">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl transition-all duration-500"
                  style={{
                    background:
                      node.status === "completed"
                        ? "rgba(52, 211, 153, 0.15)"
                        : node.status === "running"
                          ? "rgba(34, 211, 238, 0.15)"
                          : node.status === "error"
                            ? "rgba(248, 113, 113, 0.15)"
                            : "var(--surface-elevated)",
                    border: `1px solid ${
                      node.status === "completed"
                        ? "rgba(52, 211, 153, 0.4)"
                        : node.status === "running"
                          ? "rgba(34, 211, 238, 0.4)"
                          : node.status === "error"
                            ? "rgba(248, 113, 113, 0.4)"
                            : "var(--border)"
                    }`,
                    boxShadow:
                      node.status === "running"
                        ? "0 0 20px rgba(34, 211, 238, 0.2)"
                        : node.status === "completed"
                          ? "0 0 12px rgba(52, 211, 153, 0.15)"
                          : "none",
                  }}
                >
                  {node.status === "completed" ? (
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="var(--accent-green)"
                      strokeWidth={2.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  ) : node.status === "error" ? (
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="var(--accent-red)"
                      strokeWidth={2.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  ) : (
                    <span>{NODE_ICONS[node.id] || "⚙️"}</span>
                  )}
                </div>
                {node.status === "running" && (
                  <div className="absolute inset-0 rounded-2xl animate-ping opacity-20"
                    style={{ background: "var(--accent-cyan)" }}
                  />
                )}
              </div>
              <span
                className="text-xs text-center font-medium leading-tight"
                style={{
                  color:
                    node.status === "completed"
                      ? "var(--accent-green)"
                      : node.status === "running"
                        ? "var(--accent-cyan)"
                        : node.status === "error"
                          ? "var(--accent-red)"
                          : "var(--text-muted)",
                }}
              >
                {node.label}
              </span>
            </div>

            {/* Connector line */}
            {i < nodes.length - 1 && (
              <div
                className={`pipeline-connector flex-1 mx-2 ${
                  node.status === "completed" ? "active" : ""
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Mobile: Vertical pipeline */}
      <div className="md:hidden flex flex-col gap-3">
        {nodes.map((node, i) => (
          <div key={node.id}>
            <div
              className={`pipeline-node ${node.status} flex items-center gap-3 p-3 rounded-xl`}
              style={{
                background:
                  node.status === "running"
                    ? "rgba(34, 211, 238, 0.05)"
                    : "transparent",
              }}
            >
              <div className="node-dot flex-shrink-0" />
              <span
                className="text-sm font-medium"
                style={{
                  color:
                    node.status === "completed"
                      ? "var(--accent-green)"
                      : node.status === "running"
                        ? "var(--accent-cyan)"
                        : "var(--text-muted)",
                }}
              >
                {NODE_ICONS[node.id]} {node.label}
              </span>
              {node.status === "running" && (
                <svg
                  className="animate-spin h-4 w-4 ml-auto"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="var(--accent-cyan)"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="var(--accent-cyan)"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
              )}
            </div>
            {i < nodes.length - 1 && (
              <div
                className="ml-[5px] w-[2px] h-3"
                style={{
                  background:
                    node.status === "completed"
                      ? "var(--accent-green)"
                      : "var(--border)",
                }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

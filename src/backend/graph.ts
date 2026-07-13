// ─── LangGraph Assembly ───────────────────────────────────────────────
// Wires all nodes into a StateGraph with fan-out/fan-in topology:
//
//   START → entityResolver → [conditional: if error → synthesis]
//                           → fan-out: financialData, newsSentiment,
//                                      competitive, riskFlags
//                           → fan-in: synthesis → END
//
// Uses a "router" node pattern to avoid mixing conditional + static
// edges from the same node (which LangGraph doesn't allow).

import { StateGraph, START, END } from "@langchain/langgraph";
import { AgentStateAnnotation } from "@/backend/state";
import { entityResolverNode } from "@/backend/nodes/entity-resolver";
import { financialDataNode } from "@/backend/nodes/financial-data";
import { newsSentimentNode } from "@/backend/nodes/news-sentiment";
import { competitiveNode } from "@/backend/nodes/competitive";
import { riskFlagsNode } from "@/backend/nodes/risk-flags";
import { companyOverviewNode } from "@/backend/nodes/overview";
import { synthesisNode } from "@/backend/nodes/synthesis";
import type { AgentGraphState } from "@/backend/state";

/**
 * Conditional routing after entity resolution.
 * Returns an array of node names to fan-out to.
 * LangGraph will execute all returned nodes in parallel.
 */
function routeAfterResolver(
  state: AgentGraphState
): string[] {
  if (!state.resolvedEntity) {
    // Entity resolution failed — skip directly to synthesis
    return ["synthesis"];
  }
  // Fan-out to all 5 research nodes in parallel (including companyOverview)
  return ["financialData", "newsSentiment", "competitiveAnalysis", "riskFlags", "companyOverview"];
}

/**
 * Build and compile the research agent graph.
 */
export function buildResearchGraph() {
  const graph = new StateGraph(AgentStateAnnotation)
    // ── Register all nodes ──
    .addNode("entityResolver", entityResolverNode)
    .addNode("financialData", financialDataNode)
    .addNode("newsSentiment", newsSentimentNode)
    .addNode("competitiveAnalysis", competitiveNode)
    .addNode("riskFlags", riskFlagsNode)
    .addNode("companyOverview", companyOverviewNode)
    .addNode("synthesis", synthesisNode)

    // ── Entry point ──
    .addEdge(START, "entityResolver")

    // ── Conditional fan-out from entity resolver ──
    .addConditionalEdges("entityResolver", routeAfterResolver, [
      "financialData",
      "newsSentiment",
      "competitiveAnalysis",
      "riskFlags",
      "companyOverview",
      "synthesis",
    ])

    // ── Fan-in: all research nodes → synthesis ──
    .addEdge("financialData", "synthesis")
    .addEdge("newsSentiment", "synthesis")
    .addEdge("competitiveAnalysis", "synthesis")
    .addEdge("riskFlags", "synthesis")
    .addEdge("companyOverview", "synthesis")

    // ── Exit ──
    .addEdge("synthesis", END);

  return graph.compile();
}

/** Pre-compiled graph instance for reuse across requests */
export const researchAgent = buildResearchGraph();

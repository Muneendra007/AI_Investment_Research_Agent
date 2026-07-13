// ─── LangGraph State Annotation ───────────────────────────────────────
// Defines the LangGraph StateGraph annotation with reducers for
// parallel node execution. Array fields use merge reducers so
// multiple nodes can safely append without conflicts.

import { Annotation } from "@langchain/langgraph";
import type {
  ResolvedEntity,
  Financials,
  NewsItem,
  CompetitiveAnalysis,
  RiskFlag,
  Decision,
  CompanyOverview,
} from "@/frontend/types";

/**
 * LangGraph state annotation with reducers for parallel writes.
 *
 * - `errors` and `completedNodes` use array-merge reducers (multiple
 *   parallel nodes can append simultaneously).
 * - All other fields use last-write-wins reducers (only one node
 *   writes to each).
 */
export const AgentStateAnnotation = Annotation.Root({
  // Input
  companyName: Annotation<string>(),

  // Pipeline tracking
  currentNode: Annotation<string>({
    reducer: (_prev, next) => next,
    default: () => "idle",
  }),

  // Node outputs (each written by exactly one node)
  resolvedEntity: Annotation<ResolvedEntity | undefined>({
    reducer: (_prev, next) => next,
    default: () => undefined,
  }),
  financials: Annotation<Financials | undefined>({
    reducer: (_prev, next) => next,
    default: () => undefined,
  }),
  news: Annotation<NewsItem[] | undefined>({
    reducer: (_prev, next) => next,
    default: () => undefined,
  }),
  competitive: Annotation<CompetitiveAnalysis | undefined>({
    reducer: (_prev, next) => next,
    default: () => undefined,
  }),
  risks: Annotation<RiskFlag[] | undefined>({
    reducer: (_prev, next) => next,
    default: () => undefined,
  }),
  overview: Annotation<CompanyOverview | undefined>({
    reducer: (_prev, next) => next,
    default: () => undefined,
  }),
  decision: Annotation<Decision | undefined>({
    reducer: (_prev, next) => next,
    default: () => undefined,
  }),

  // Parallel-safe arrays (multiple nodes can append)
  errors: Annotation<string[]>({
    reducer: (prev, next) => [...prev, ...next],
    default: () => [],
  }),
  completedNodes: Annotation<string[]>({
    reducer: (prev, next) => [...prev, ...next],
    default: () => [],
  }),
});

/** Inferred type from the annotation for use in node functions */
export type AgentGraphState = typeof AgentStateAnnotation.State;

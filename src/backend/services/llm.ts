// ─── Shared LLM Instance ──────────────────────────────────────────────
// Lazy-initialized ChatGroq instances shared across all graph nodes.
// Uses Groq's LPU for fast inference with openai/gpt-oss-120b.
// API key is checked at first use, not at import time, so the build
// doesn't fail without env vars set.

import { ChatGroq } from "@langchain/groq";

let _llm: ChatGroq | null = null;
let _llmCreative: ChatGroq | null = null;

function getApiKey(): string {
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    throw new Error(
      "GROQ_API_KEY is not set. Get one free at https://console.groq.com"
    );
  }
  return key;
}

/**
 * Shared ChatGroq LLM instance (lazy-initialized).
 * - Model: openai/gpt-oss-120b
 * - Temperature: 0.1 (low for consistent, factual outputs)
 * - Max retries: 2 (handles transient Groq rate limits)
 */
export const llm: ChatGroq = new Proxy({} as ChatGroq, {
  get(_target, prop, receiver) {
    if (!_llm) {
      _llm = new ChatGroq({
        apiKey: getApiKey(),
        model: "openai/gpt-oss-120b",
        temperature: 0.1,
        maxRetries: 2,
      });
    }
    return Reflect.get(_llm, prop, receiver);
  },
});

/**
 * Higher-temperature variant for creative/analytical tasks
 * (competitive analysis, risk assessment where diverse reasoning helps).
 */
export const llmCreative: ChatGroq = new Proxy({} as ChatGroq, {
  get(_target, prop, receiver) {
    if (!_llmCreative) {
      _llmCreative = new ChatGroq({
        apiKey: getApiKey(),
        model: "openai/gpt-oss-120b",
        temperature: 0.3,
        maxRetries: 2,
      });
    }
    return Reflect.get(_llmCreative, prop, receiver);
  },
});

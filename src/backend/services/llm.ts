// ─── Shared LLM Instance ──────────────────────────────────────────────
// Lazy-initialized LLM instances shared across all graph nodes.
// Supports:
// 1. Google Vertex AI (via Service Account JSON credentials in google-credentials.json or GOOGLE_APPLICATION_CREDENTIALS)
// 2. Google Gemini API (via GEMINI_API_KEY or GOOGLE_API_KEY)
// 3. Groq (via GROQ_API_KEY)

import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { ChatVertexAI } from "@langchain/google-vertexai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatGroq } from "@langchain/groq";
import fs from "fs";
import path from "path";

let _llm: BaseChatModel | null = null;
let _llmCreative: BaseChatModel | null = null;

interface ServiceAccountCredentials {
  type?: string;
  project_id?: string;
  private_key_id?: string;
  private_key?: string;
  client_email?: string;
  client_id?: string;
  auth_uri?: string;
  token_uri?: string;
  auth_provider_x509_cert_url?: string;
  client_x509_cert_url?: string;
  universe_domain?: string;
}

function loadServiceAccountCredentials(): ServiceAccountCredentials | null {
  // Check if raw JSON is in env
  if (process.env.VERTEX_SERVICE_ACCOUNT_JSON) {
    try {
      return JSON.parse(process.env.VERTEX_SERVICE_ACCOUNT_JSON);
    } catch {
      console.warn("Failed to parse VERTEX_SERVICE_ACCOUNT_JSON");
    }
  }

  // Check file paths
  const possiblePaths = [
    process.env.GOOGLE_APPLICATION_CREDENTIALS,
    path.resolve(process.cwd(), "google-credentials.json"),
    path.resolve(process.cwd(), "..", "google-credentials.json"),
  ].filter(Boolean) as string[];

  for (const p of possiblePaths) {
    try {
      if (fs.existsSync(p)) {
        const content = fs.readFileSync(p, "utf-8");
        const parsed = JSON.parse(content);
        if (parsed.client_email && parsed.private_key) {
          return parsed;
        }
      }
    } catch {
      // Continue searching
    }
  }

  return null;
}

function createModel(temperature: number): BaseChatModel {
  // 1. Check Groq API Key (Primary & Recommended)
  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey && groqKey.trim().length > 0) {
    const modelName = process.env.GROQ_MODEL || "qwen/qwen3.8-27b";
    return new ChatGroq({
      apiKey: groqKey.trim(),
      model: modelName,
      temperature,
      maxRetries: 4,
    });
  }

  // 2. Check Google Gemini API Key (Google AI Studio)
  const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (geminiKey && geminiKey.trim().length > 0) {
    const modelName = process.env.GEMINI_MODEL || "gemini-2.0-flash";
    return new ChatGoogleGenerativeAI({
      apiKey: geminiKey.trim(),
      model: modelName,
      temperature,
      maxRetries: 2,
    });
  }

  // 3. Check Vertex AI service account credentials (Only if explicitly enabled or if no API keys found)
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.VERTEX_SERVICE_ACCOUNT_JSON) {
    const serviceAccount = loadServiceAccountCredentials();
    if (serviceAccount && serviceAccount.client_email && serviceAccount.private_key) {
      const projectId = serviceAccount.project_id || process.env.GOOGLE_CLOUD_PROJECT || "gen-lang-client-0834204365";
      const location = process.env.VERTEX_LOCATION || "us-central1";
      const modelName = process.env.VERTEX_MODEL || "gemini-1.5-flash";

      return new ChatVertexAI({
        model: modelName,
        location,
        temperature,
        authOptions: {
          credentials: {
            client_email: serviceAccount.client_email,
            private_key: serviceAccount.private_key,
          },
          projectId,
        },
        maxRetries: 2,
      });
    }
  }

  throw new Error(
    "No AI Model API configured. Please provide a GROQ_API_KEY from https://console.groq.com in your .env.local file."
  );
}

/**
 * Shared LLM instance (lazy-initialized).
 * Low temperature (0.1) for consistent, factual outputs.
 */
export const llm: BaseChatModel = new Proxy({} as BaseChatModel, {
  get(_target, prop, receiver) {
    if (!_llm) {
      _llm = createModel(0.1);
    }
    return Reflect.get(_llm, prop, receiver);
  },
});

/**
 * Higher-temperature variant (0.3) for creative/analytical tasks
 * (competitive analysis, risk assessment).
 */
export const llmCreative: BaseChatModel = new Proxy({} as BaseChatModel, {
  get(_target, prop, receiver) {
    if (!_llmCreative) {
      _llmCreative = createModel(0.3);
    }
    return Reflect.get(_llmCreative, prop, receiver);
  },
});

// ─── POST /api/analyze ────────────────────────────────────────────────
// Chatbot endpoint. Classifies message intent, responds to chat/follow-ups,
// or triggers the multi-node LangGraph pipeline for stock queries.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { buildResearchGraph } from "@/backend/graph";
import { llm } from "@/backend/services/llm";
import type { ChatMessage } from "@/frontend/types";

// ── Simple in-memory rate limiter ──
const rateLimit = new Map<string, number>();
const RATE_LIMIT_MS = 3000; // 1 request per 3 seconds per IP

function isRateLimited(ip: string): boolean {
  const lastRequest = rateLimit.get(ip);
  const now = Date.now();
  if (lastRequest && now - lastRequest < RATE_LIMIT_MS) {
    return true;
  }
  rateLimit.set(ip, now);
  if (rateLimit.size > 1000) {
    const cutoff = now - RATE_LIMIT_MS * 2;
    for (const [key, time] of rateLimit.entries()) {
      if (time < cutoff) rateLimit.delete(key);
    }
  }
  return false;
}

/** Intent Classifier Zod Schema */
const IntentSchema = z.object({
  type: z
    .enum(["chat", "analyze", "followup"])
    .describe(
      "Classify whether the user is greeting/chatting, asking to analyze a new company, or asking a follow-up query about a previously researched company."
    ),
  companyName: z
    .string()
    .nullable()
    .optional()
    .describe(
      "If type is 'analyze', extract the company name or stock ticker to research (e.g. 'Apple', 'Tesla', 'MSFT'). Leave null or empty otherwise."
    ),
});

/** Node ID to human-readable label mapping */
const NODE_LABELS: Record<string, string> = {
  entityResolver: "Resolving Company",
  companyOverview: "Gathering Web Overview",
  financialData: "Fetching Financials",
  newsSentiment: "Analyzing News & Sentiment",
  competitiveAnalysis: "Competitive Analysis",
  riskFlags: "Scanning Risk Flags",
  synthesis: "Making Decision",
};

export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for") ||
    request.headers.get("x-real-ip") ||
    "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a few seconds." },
      { status: 429 }
    );
  }

  // ── Parse request body ──
  let body: { message?: string; history?: ChatMessage[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { message, history } = body;
  if (!message || typeof message !== "string" || message.trim().length === 0) {
    return NextResponse.json(
      { error: "A non-empty string 'message' is required" },
      { status: 400 }
    );
  }

  // Prevent DOS via excessive payload lengths
  if (message.length > 500) {
    return NextResponse.json(
      { error: "Message exceeds maximum allowed length of 500 characters." },
      { status: 400 }
    );
  }

  const sanitizedMessage = message.trim().slice(0, 500);

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (
        type: string,
        data: Record<string, unknown>
      ) => {
        const event = JSON.stringify({
          type,
          timestamp: new Date().toISOString(),
          ...data,
        });
        controller.enqueue(encoder.encode(`data: ${event}\n\n`));
      };

      try {
        // Format recent conversation context for awareness (ChatMessage uses sender and text)
        const conversationHistory = (history || [])
          .filter((h) => h.text && h.text.trim().length > 0)
          .slice(-8)
          .map((h) => `${h.sender === "user" ? "User" : "Assistant"}: ${h.text.trim()}`)
          .join("\n\n");

        // 1. Classify Message Intent using Groq
        const classifier = llm.withStructuredOutput(IntentSchema);
        const classification = await classifier.invoke(
          `You are an intent classifier for a conversational AI investment assistant.
Your goal is to ensure the assistant is friendly, natural to talk to, and ONLY runs a full research pipeline when the user explicitly asks for an analysis or investment verdict.

User Message: "${sanitizedMessage}"

${conversationHistory ? `Recent Conversation History:\n${conversationHistory}\n` : ""}

Classify as one of:
- analyze: ONLY choose this if the user EXPLICITLY asks to run research, generate a scorecard/report, or give a buy/sell/pass verdict (e.g., "analyze Apple", "evaluate Tesla", "is Microsoft a buy?", "run research on Tata Motors", "give me a report on Google"). Do NOT choose analyze for general questions or casual chat.
- followup: The user is asking a question directly referring back to the previously analyzed company's data (e.g., "why did you pass?", "what was its P/E ratio again?", "tell me more about the risks you found").
- chat: The DEFAULT for almost everything else: greetings ("hi", "hello"), casual conversation, thank yous, general knowledge inquiries ("what is the company name of mama earth?", "who is the CEO of Tesla?"), discussions about finance or the stock market in general, or when the user is just conversing naturally without asking you to run an investment evaluation.`
        );

        const { type, companyName } = classification;

        // 2. Handle Chat Response (Friendly, conversational, knowledgeable)
        if (type === "chat") {
          const chatResult = await llm.invoke(
            `You are AuraInvest, a friendly, intelligent, and warm AI investment partner.
You converse naturally, remember conversation context, and answer finance, business, and company questions clearly and casually.

Instructions:
- CRITICAL: Read the Recent Chat History below. If the user refers to "it", "they", "the company", or asks a follow-up question (e.g. "how it listed in the stocks?"), resolve what company or topic they were just discussing and answer specifically about THAT company.
- Be conversational, concise, natural, and helpful.
- Answer their question directly in clear plain English.
- If relevant, let the user know they can say "analyze <company>" whenever they want a full research report with financial health, valuation, and Buy/Pass scores.

${conversationHistory ? `Recent Chat History:\n${conversationHistory}\n` : ""}
User: "${sanitizedMessage}"`
          );
          sendEvent("chat_response", { text: chatResult.content });
          controller.close();
          return;
        }

        // 3. Handle Follow-up Response
        if (type === "followup") {
          // Find the last analysis result in chat history
          const lastAnalysis = history
            ?.slice()
            .reverse()
            .find((h) => h.analysisResult)?.analysisResult;

          let context = "";
          if (lastAnalysis) {
            context = `You are discussing research for: ${
              lastAnalysis.resolvedEntity?.name || lastAnalysis.companyName
            }.
            Here are the details from the previous run:
            - Verdict: ${lastAnalysis.decision?.verdict}
            - Confidence: ${lastAnalysis.decision?.confidence}%
            - Summary: ${lastAnalysis.decision?.executiveSummary}
            - Pros: ${lastAnalysis.decision?.pros.join("; ")}
            - Cons: ${lastAnalysis.decision?.cons.join("; ")}
            - Score Breakdown: ${JSON.stringify(lastAnalysis.decision?.scoreBreakdown)}
            - Financials: ${JSON.stringify(lastAnalysis.financials || "None (private)")}
            - Moat/Competitive: ${JSON.stringify(lastAnalysis.competitive)}
            - Risk Flags: ${JSON.stringify(lastAnalysis.risks)}`;
          } else {
            context = "No previous company analysis context exists in this chat history yet. Remind the user to ask about a specific company first.";
          }

          const chatResult = await llm.invoke(
            `You are the AI Investment Research Agent. Answer the user's follow-up question using the provided context of the analyzed company.
            
CONTEXT:
${context}

QUESTION:
"${message}"`
          );
          sendEvent("chat_response", { text: chatResult.content });
          controller.close();
          return;
        }

        // 4. Handle Company Analysis (LangGraph pipeline)
        if (type === "analyze" && companyName) {
          // Clean & sanitize company name
          const queryName = companyName
            .trim()
            .replace(/[<>{}[\]\\\/]/g, "")
            .slice(0, 100);

          // Tell frontend we classified as analyze and are starting resolution
          sendEvent("intent_classified", { companyName: queryName });

          const graph = buildResearchGraph();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const finalState: Record<string, any> = { companyName: queryName };
          const announcedNodes = new Set<string>();

          const streamResult = await graph.stream(
            { companyName: queryName },
            { streamMode: "updates" }
          );

          for await (const update of streamResult) {
            for (const [nodeId, nodeOutput] of Object.entries(update)) {
              if (nodeId === "__start__" || nodeId === "__end__") continue;

              const label = NODE_LABELS[nodeId] || nodeId;

              if (!announcedNodes.has(nodeId)) {
                sendEvent("node_start", { node: nodeId, label });
                announcedNodes.add(nodeId);
              }

              const output = nodeOutput as Record<string, unknown>;

              // Manually merge arrays
              if (Array.isArray(output.errors) && output.errors.length > 0) {
                finalState.errors = [
                  ...(finalState.errors || []),
                  ...output.errors,
                ];
              }
              if (
                Array.isArray(output.completedNodes) &&
                output.completedNodes.length > 0
              ) {
                finalState.completedNodes = [
                  ...(finalState.completedNodes || []),
                  ...output.completedNodes,
                ];
              }

              // Merge standard keys
              for (const [key, value] of Object.entries(output)) {
                if (key !== "errors" && key !== "completedNodes") {
                  finalState[key] = value;
                }
              }

              const nodeErrors = output.errors as string[] | undefined;
              if (nodeErrors && nodeErrors.length > 0) {
                sendEvent("node_error", {
                  node: nodeId,
                  label,
                  error: nodeErrors.join("; "),
                });
              }

              sendEvent("node_complete", {
                node: nodeId,
                label,
                data: output,
              });
            }
          }

          sendEvent("final_result", { data: finalState });
        } else {
          // Fallback if classifier returned analyze but no companyName was parsed
          const chatResult = await llm.invoke(
            `Explain to the user that they asked to analyze a company, but you couldn't resolve which specific company or ticker they meant. Ask them to clarify the name (e.g. "Analyze Apple" or "Is TSLA a buy?").`
          );
          sendEvent("chat_response", { text: chatResult.content });
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unknown error";
        sendEvent("error", { error: message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

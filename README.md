# 📊 AuraInvest AI — Equity Research & Debate-Driven Investment Committee

> **Dual-mode AI investment research terminal.** Chat naturally with an equity analyst for live public/private company reports, or upload supporting PDF documents and convene an **8-stage Debate-Driven Investment Committee** powered by **Microsoft Agent Framework** and persistent **Qdrant RAG**.

**Tech Stack:** Next.js 16 · React 19 · LangGraph.js · **Microsoft Agent Framework** (`agent-framework-core`, `agent-framework-orchestrations`, `agent-framework-openai`) · FastAPI · Qdrant · FastEmbed · PyPDF · Groq / Gemini / OpenAI · Finnhub · FMP · SEC EDGAR · Tavily

---

## 🌟 Key Capabilities

### 1. Debate-Driven Investment Committee (Microsoft Agent Framework + RAG)

Switch to the **🏛️ Investment Committee** tab in the header to upload PDF documents and run a structured adversarial investment debate:

| Stage | Component | Responsibility |
|---|---|---|
| **0. Document RAG** | `committee_service/rag.py` | Extracts text page-by-page from uploaded PDFs (`pypdf`), sanitizes and flags prompt-injection directives, splits into overlapping chunks with exact page provenance, embeds via `BAAI/bge-small-en-v1.5` (`fastembed`), and persists vectors in **Qdrant** (`data/vectordb`). |
| **1. Research Agent** | `ResearchExecutor` + `Agent` | Retrieves relevant PDF sections and organizes factual financial findings, opportunities, risks, and supporting facts. Every claim links to verified citation IDs (`C1`, `C2`, ...); marks `insufficient_evidence` honestly if docs are missing/thin. |
| **2. Bull & Bear (Parallel)** | `add_fan_out_edges` | **Bull Agent** (arguing `BUY`) and **Bear Agent** (arguing `AVOID`) independently evaluate the Research dossier concurrently in the same Microsoft Agent Framework superstep. |
| **3. Argument Exchange** | `add_fan_in_edges` | Synchronizes both opening briefs via `ArgumentExchangeExecutor` into shared workflow state and identifies contested points. |
| **4. Rebuttal Agent** | `RebuttalExecutor` | Gives both Bull and Bear agents an opportunity to directly rebut each other's claims, coordinated and grounded by `RebuttalAgent` using verified citations only. |
| **5. Judge Agent** | `JudgeExecutor` | Neutrally evaluates Research, Bull, Bear, and Rebuttals to recommend **`BUY`**, **`HOLD`**, or **`AVOID`** citing verified evidence only. |
| **6. Risk Agent (Mandatory)** | `RiskExecutor` | Evaluates investment risk **independently** (never receives Judge's recommendation) across 5 explicit criteria totaling **0–100**: Financial/Leverage (0–25), Operational/Execution (0–20), Regulatory/Legal/Governance (0–20), Market/Competitive (0–20), and Evidence Uncertainty (0–15). |
| **7. Deterministic Risk Veto** | `DecisionEnforcementExecutor` | Non-LLM deterministic gate: if `risk_score >= risk_veto_threshold` (configurable 0–100, default `70`), forces final recommendation to **`HOLD`** regardless of the Judge's recommendation and explains why the veto fired. |
| **8. Final Report & Export** | `ReportGeneratorExecutor` | Yields the complete `InvestmentCommitteeReport` with interactive citation traceability back to exact document name + page + excerpt, viewable in-app and exportable as **Markdown (`.md`)**, **JSON (`.json`)**, or printable PDF. |

### 2. Conversational Market Chat Terminal (LangGraph.js)

The **💬 Market Chat** tab preserves the full real-time market research pipeline:
- **Intent Classification** (`chat`, `analyze`, `followup`) via Groq/Gemini/Vertex.
- **Parallel LangGraph Research Nodes** (`entityResolver` → `financialData`, `newsSentiment`, `competitiveAnalysis`, `riskFlags`, `companyOverview` → `synthesis`).
- **Live Market Integrations**: Finnhub, Financial Modeling Prep (FMP), Alpha Vantage, SEC EDGAR (`10-K`/`10-Q`/`8-K`), NewsAPI, and Tavily web search.

---

## 🏗️ Project Structure

```text
AI_Investment_Research_Agent/
├── committee_service/                  # Python Microsoft Agent Framework & RAG backend
│   ├── config.py                       # Storage paths, thresholds, env loading
│   ├── models.py                       # Pydantic schemas (documents, citations, debate, risk, report)
│   ├── rag.py                          # PDF extraction, prompt-injection defense, chunking, Qdrant RAG
│   ├── llm_factory.py                  # OpenAIChatCompletionClient for Groq / Gemini / OpenAI
│   ├── agents.py                       # 6 Microsoft Agent Framework Agents + citation filter & deterministic veto
│   ├── workflow.py                     # WorkflowBuilder DAG (fan-out/fan-in + sequential + SSE streaming)
│   ├── server.py                       # FastAPI endpoints (/health, /documents*, /committee/run)
│   └── requirements.txt                # Python dependencies
├── tests/                              # Pytest suite (RAG, all 6 agents, workflow, veto, FastAPI SSE)
│   ├── conftest.py
│   ├── pdf_helpers.py
│   ├── test_rag.py
│   ├── test_agents.py
│   ├── test_workflow.py
│   └── test_server.py
├── src/
│   ├── app/
│   │   ├── page.tsx                    # Dual-mode UI (Market Chat + Investment Committee)
│   │   ├── layout.tsx                  # Root layout & dark terminal theme
│   │   ├── globals.css
│   │   └── api/
│   │       ├── analyze/route.ts        # Existing LangGraph SSE endpoint
│   │       └── committee/
│   │           ├── documents/route.ts  # GET list / POST PDF upload proxy
│   │           ├── documents/[id]/route.ts # DELETE PDF document proxy
│   │           └── run/route.ts        # POST committee debate SSE stream proxy
│   ├── backend/
│   │   ├── committee-bridge.ts         # Auto-starts/connects to Python committee FastAPI service
│   │   ├── graph.ts & state.ts         # Existing LangGraph market research pipeline
│   │   ├── nodes/                      # Existing 7 market nodes
│   │   └── services/                   # Groq/Gemini/Vertex, Finnhub, FMP, SEC EDGAR, NewsAPI, Tavily
│   └── frontend/
│       ├── types.ts                    # Shared TypeScript contracts
│       └── components/
│           ├── InvestmentCommitteePanel.tsx
│           ├── DocumentManager.tsx
│           ├── CommitteeProgress.tsx
│           ├── CommitteeReportView.tsx
│           └── ...                     # Existing chat research cockpit cards
├── .env.example
└── pyproject.toml
```

---

## 🚀 Setup & Running Locally

### Prerequisites
- **Node.js** 20+ and **npm**
- **Python** 3.10+ (tested on Python 3.10.9)

### 1. Install Dependencies

```bash
# Node.js / Next.js dependencies
npm install

# Python virtual environment for Microsoft Agent Framework & Qdrant RAG
python -m venv .venv
# Windows PowerShell:
.venv\Scripts\pip install -r committee_service\requirements.txt
# macOS / Linux:
# .venv/bin/pip install -r committee_service/requirements.txt
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env.local` and set your keys:

```env
# Primary LLM Provider (at least one LLM key is required)
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=openai/gpt-oss-20b

# Optional alternate LLM providers
GEMINI_API_KEY=
OPENAI_API_KEY=

# Market Chat APIs (for Market Chat mode)
FINNHUB_API_KEY=your_finnhub_key
TAVILY_API_KEY=your_tavily_key
FMP_API_KEY=
ALPHA_VANTAGE_API_KEY=
NEWS_API_KEY=
SEC_EDGAR_USER_AGENT=InvestmentAgent your@email.com

# Committee & RAG Configuration
COMMITTEE_SERVICE_URL=http://127.0.0.1:8001
RISK_VETO_THRESHOLD=70
EMBEDDING_MODEL=BAAI/bge-small-en-v1.5
COMMITTEE_DATA_DIR=data
```

### 3. Run the Application

```bash
npm run dev
```

Open **[http://localhost:3000](http://localhost:3000)**.
The Next.js backend automatically spawns the local Python Microsoft Agent Framework & Qdrant service (`.venv`) on port `8001` on the first Document/Committee request. You can also launch the Python service explicitly if preferred:

```bash
.venv\Scripts\python.exe -m uvicorn committee_service.server:app --host 127.0.0.1 --port 8001
```

---

## ✅ Verification & Testing

```bash
# 1. Run Python tests (RAG, all 6 agents, workflow order/concurrency, risk veto, FastAPI SSE)
.venv\Scripts\python.exe -m pytest -v tests

# 2. Run ESLint & Next.js production build
npm run lint
npm run build
```

> **Disclaimer:** For informational and educational research purposes only. Outputs do not constitute licensed financial advice.

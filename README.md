# 📊 AI Investment Research Agent

> **Chat with an AI analyst.** Type any company name — public or private — and get a structured **Invest** or **Pass** verdict backed by real-time financials, news sentiment, competitive analysis, risk flags, and a scored rubric. It's like having a junior equity research analyst on your laptop.

**Tech Stack:** Next.js 16 · LangGraph.js · Groq (Llama 3.3 70B) · Finnhub API · Tavily Search · TypeScript

---

## 📸 What It Looks Like

The UI is a conversational chat interface. You type messages like a normal chat ("hi", "should I invest in Tesla?", "what are the risks?"), and the agent responds — either with a friendly reply or a full multi-dimensional research report with a clear verdict.

---

## 🌟 Key Features

| Feature | Description |
|---|---|
| **💬 Conversational Chat** | Talk naturally — greetings, questions, follow-ups. No forms to fill. |
| **🔍 Smart Entity Resolution** | Type "Apple" or "Tata" or "MSFT" — the agent figures out which exact company and ticker you mean. |
| **⚡ Parallel Multi-Agent Research** | 5 specialized AI agents research the company simultaneously (financials, news, competition, risks, overview). |
| **📊 Scored Decision Rubric** | Each company is scored 1-10 on 5 dimensions. Average ≥ 6.5 → Invest. Average < 5.0 → Pass. |
| **🟢 Retail-Friendly Results** | No jargon. Clear "Bottom Line" summary, side-by-side Pros & Cons, confidence percentage. |
| **📡 Real-Time Streaming** | Watch each research step complete live via Server-Sent Events (SSE). |
| **🔄 Follow-Up Questions** | Ask "why did you say pass?" or "explain the risks" — the agent remembers the last analysis. |
| **💾 Persistent Chat History** | Conversations survive page refreshes (saved in browser LocalStorage). |
| **🌐 Works for Private Companies** | Even if a company isn't publicly traded, the agent uses web search (Tavily) to gather business model, valuation estimates, and key products. |

---

## 🏗️ Architecture — How It Works

This is a **multi-agent system** where each "agent" is a specialized node in a LangGraph.js state graph. When you ask about a company, here's exactly what happens:

### Step-by-Step Workflow

```
   YOU: "Should I invest in Tesla?"
    │
    ▼
┌─────────────────────────────────────────────────────────┐
│  STEP 0: Intent Classifier (Groq LLM)                  │
│  Reads your message and classifies it as:               │
│    • "chat"     → reply with a greeting                 │
│    • "analyze"  → trigger the full research pipeline    │
│    • "followup" → answer using previous analysis data   │
│  Extracts: companyName = "Tesla"                        │
└─────────────────────────────────────────────────────────┘
    │  (classified as "analyze")
    ▼
┌─────────────────────────────────────────────────────────┐
│  STEP 1: Entity Resolver                                │
│  Converts "Tesla" → { ticker: "TSLA", name: "Tesla     │
│  Inc", sector: "Automobiles", exchange: "NASDAQ" }      │
│                                                         │
│  How: Finnhub symbol search → LLM fallback if ambiguous │
│       → Finnhub profile validation                      │
└─────────────────────────────────────────────────────────┘
    │  (entity resolved successfully)
    │
    │  ┌──── PARALLEL FAN-OUT ─── 5 nodes run simultaneously ────┐
    ▼  ▼              ▼              ▼            ▼              ▼
┌─────────┐   ┌─────────────┐  ┌──────────┐  ┌────────┐  ┌──────────┐
│Financial│   │    News &   │  │Competitive│  │  Risk  │  │ Company  │
│  Data   │   │  Sentiment  │  │ Analysis  │  │ Flags  │  │ Overview │
│         │   │             │  │           │  │        │  │          │
│Finnhub  │   │Finnhub News │  │Finnhub    │  │Groq LLM│  │Tavily    │
│Quote +  │   │or Tavily    │  │Peers +    │  │analyzes │  │Web Search│
│Metrics  │   │fallback →   │  │Groq LLM   │  │risks by │  │+ Groq LLM│
│API      │   │Groq LLM     │  │moat       │  │category │  │synthesis │
│         │   │classifies   │  │assessment │  │& assign │  │business  │
│         │   │each headline│  │           │  │severity │  │model info│
└────┬────┘   └──────┬──────┘  └─────┬─────┘  └───┬────┘  └────┬─────┘
     │               │               │            │             │
     └───────────────┴───────┬───────┴────────────┴─────────────┘
                             │  (all 5 complete → FAN-IN)
                             ▼
┌─────────────────────────────────────────────────────────┐
│  STEP 3: Synthesis / Decision Engine (Groq LLM)         │
│                                                         │
│  Receives ALL upstream data and evaluates against a     │
│  5-dimension rubric (scored 1-10 each):                 │
│    1. Financial Health                                  │
│    2. Valuation                                         │
│    3. Momentum (news sentiment)                         │
│    4. Risk Profile (inverse: 10 = low risk)             │
│    5. Competitive Position                              │
│                                                         │
│  Outputs: Verdict (Invest/Pass), Confidence (0-100%),   │
│           Executive Summary, Pros, Cons, Score Breakdown │
└─────────────────────────────────────────────────────────┘
    │
    ▼
   YOU see the full analysis card in the chat
```

### Why Parallel?

Running 5 research nodes **simultaneously** instead of one-after-another cuts the total response time from ~25 seconds to ~8 seconds. LangGraph's fan-out/fan-in pattern makes this possible — all 5 nodes read from the shared state independently, then their outputs merge back before the synthesis node runs.

---

## 🧩 What Each Component Does

### Backend Nodes (`src/backend/nodes/`)

| Node | File | What It Does | Data Sources |
|---|---|---|---|
| **Entity Resolver** | `entity-resolver.ts` | Maps "Apple" or "TSLA" to a structured company profile (ticker, sector, exchange, logo, market cap). Handles ambiguity ("Tata" → picks the largest entity). | Finnhub Symbol Search → Finnhub Company Profile → Groq LLM (fallback) |
| **Financial Data** | `financial-data.ts` | Fetches real-time stock price, 52-week range, P/E ratio, revenue growth, margins, debt-to-equity, ROE, beta. Degrades gracefully if metrics are missing. | Finnhub Quote API + Finnhub Basic Financials API |
| **News & Sentiment** | `news-sentiment.ts` | Gets the last 90 days of company headlines. Batch-classifies each headline as positive/neutral/negative in a single LLM call. Falls back to Tavily web search if Finnhub has no news (e.g., private companies). | Finnhub Company News → Tavily Search (fallback) → Groq LLM (classifier) |
| **Competitive Analysis** | `competitive.ts` | Identifies 3-5 direct competitors, assesses market positioning, and evaluates the company's competitive moat (brand, network effects, switching costs, IP). | Finnhub Peers API → Groq LLM (creative analysis) |
| **Risk Flags** | `risk-flags.ts` | Identifies 3-7 specific risks across regulatory, governance, operational, financial, and market categories. Each risk gets a severity level (low/medium/high) and evidence source. | Groq LLM (creative analysis using news context) |
| **Company Overview** | `overview.ts` | Gathers a plain-English business summary, revenue model explanation, valuation/funding info, and key products via live web search. Especially useful for private companies where financial APIs return nothing. | Tavily Search API → Groq LLM (structured synthesis) |
| **Synthesis** | `synthesis.ts` | The decision engine. Receives ALL upstream data, scores the company on the 5-dimension rubric, produces the final Invest/Pass verdict with confidence, executive summary, pros, and cons. | All upstream node outputs → Groq LLM (structured decision) |

### Backend Services (`src/backend/services/`)

| Service | File | Role |
|---|---|---|
| **Groq LLM** | `llm.ts` | Two lazy-initialized `ChatGroq` instances — one with `temperature: 0.1` (factual tasks) and one with `temperature: 0.3` (creative analysis). Uses a Proxy pattern so env keys are validated at runtime, not build time. |
| **Finnhub Client** | `finnhub.ts` | Rate-limited (1 req/sec to stay under 60/min free tier) wrapper around Finnhub REST API. Includes 10-second timeouts and graceful null returns on errors. |
| **Tavily Client** | `tavily.ts` | Simple POST wrapper around Tavily's web search API. Used as a fallback news source and for the company overview node. |

### Frontend Components (`src/frontend/components/`)

| Component | File | What It Renders |
|---|---|---|
| **DecisionCard** | `DecisionCard.tsx` | The verdict banner (Invest/Pass with confidence %), "The Bottom Line" executive summary, and side-by-side Pros vs Cons grid. |
| **FinancialsCard** | `FinancialsCard.tsx` | Stock price, 52-week range bar, and a grid of key financial metrics (P/E, margins, growth, debt). |
| **NewsSentiment** | `NewsSentiment.tsx` | Sentiment distribution bar (positive/neutral/negative counts) and a scrollable list of recent headlines with sentiment badges. |
| **CompetitiveLandscape** | `CompetitiveLandscape.tsx` | Peer company tags, market position summary, and moat assessment. |
| **RiskFlags** | `RiskFlags.tsx` | Severity-colored risk flag cards (red=high, yellow=medium, green=low). |
| **OverviewCard** | `OverviewCard.tsx` | Company summary, business model, valuation/funding, and key product tags. |
| **ScoreBreakdown** | `ScoreBreakdown.tsx` | Visual radar/bar chart of the 5-dimension rubric scores (1-10 each). |
| **PipelineProgress** | `PipelineProgress.tsx` | Real-time progress tracker showing which nodes are running/completed/errored. |

### API Layer (`src/app/api/analyze/route.ts`)

The single API endpoint handles **all three conversation modes**:

1. **Chat** → Groq generates a friendly conversational response
2. **Analyze** → Triggers the full LangGraph pipeline, streams SSE events to the UI
3. **Follow-up** → Groq answers questions using the previous analysis data as context

The endpoint uses **Server-Sent Events (SSE)** for streaming, so the UI can show real-time progress as each node starts and completes.

---

## 🧠 The Role of Each Technology

### LangGraph.js — The Orchestrator
LangGraph defines the **execution topology** — which nodes run, in what order, and how their outputs combine. It manages:
- **State**: A shared `Annotation` object that all nodes read from and write to
- **Edges**: Entity Resolver → (conditional fan-out) → 5 research nodes → (fan-in) → Synthesis
- **Parallel execution**: All 5 research nodes run simultaneously via the fan-out pattern
- **Reducers**: Array fields (errors, completedNodes) use merge-append reducers so multiple parallel nodes can safely write without overwriting each other

### Groq (Llama 3.3 70B) — The Brain
Groq's LPU (Language Processing Unit) provides **ultra-fast LLM inference** (~200ms per call vs ~2-5s on OpenAI). This speed is critical because the pipeline makes **8+ LLM calls** per analysis:
- 1 × Intent classification
- 1 × Entity resolution (fallback)
- 1 × News sentiment batch classification
- 1 × Competitive moat analysis
- 1 × Risk flag identification
- 1 × Company overview synthesis
- 1 × Final synthesis decision

All LLM calls use **Zod structured output** — the LLM is forced to return JSON that matches a predefined schema, eliminating parsing errors.

### Finnhub — The Financial Data Source
Provides real-time market data on the free tier (60 calls/min):
- Symbol search (resolve names → tickers)
- Company profiles (sector, exchange, market cap, logo)
- Real-time quotes (current price, day change)
- Basic financial metrics (P/E, margins, growth, debt, ROE, beta)
- Company news (last 90 days of headlines)
- Peer companies (competitor tickers)

### Tavily — The Web Search Fallback
When Finnhub has no data (private companies, limited coverage), Tavily fills the gap:
- Fallback news search for companies with no Finnhub news coverage
- Business model and valuation research for the company overview node
- Supports both private and public companies

### Next.js 16 — The Full-Stack Framework
- **App Router** with server-side API routes for the SSE endpoint
- **React 19** for the client-side chat UI
- **SSE streaming** from the API route to the browser for real-time progress

---

## 📊 Decision Rubric — How the Verdict is Made

The synthesis node scores each company **1–10** on five dimensions:

| Dimension | Score Meaning | Data Used |
|---|---|---|
| **Financial Health** | Revenue growth, profit margins, debt levels | P/E, revenue growth %, gross/operating/net margins, debt-to-equity, ROE |
| **Valuation** | Is the stock overpriced or underpriced? | P/E ratio vs sector norms, market cap, 52-week range position |
| **Momentum** | Recent sentiment trend | Positive/neutral/negative headline ratio, recent price movement |
| **Risk Profile** | 10 = very safe, 1 = very risky (inverse scale) | Number and severity of risk flags, high-severity flag count |
| **Competitive Position** | Moat strength, market dominance | Peer comparison, moat assessment, market position durability |

### Verdict Rules

| Condition | Verdict |
|---|---|
| Average score **≥ 6.5** | ✅ **Invest** |
| Average score **< 5.0** | ❌ **Pass** |
| Between 5.0–6.5 | Uses judgment, reduces confidence |
| Each HIGH-severity risk flag | Subtracts 5-10% from confidence |
| Each missing data source | Subtracts 10% from confidence |
| Confidence cap | Never exceeds **95%** (epistemic humility) |

---

## 📂 Project Structure

```
AI_Investment_Research_Agent/
├── .env                              # API keys (not committed to git)
├── .env.example                      # Template for required keys
├── package.json                      # Dependencies & scripts
├── next.config.ts                    # Next.js configuration
├── tsconfig.json                     # TypeScript configuration
│
└── src/
    ├── app/                          # Next.js App Router
    │   ├── api/
    │   │   └── analyze/
    │   │       └── route.ts          # POST endpoint — intent classification + SSE pipeline
    │   ├── page.tsx                  # Chat UI — conversation display + input
    │   ├── layout.tsx                # Root HTML layout + metadata
    │   └── globals.css               # Complete dark theme + glassmorphism styles
    │
    ├── backend/                      # LangGraph multi-agent pipeline
    │   ├── graph.ts                  # StateGraph wiring — edges, fan-out, fan-in topology
    │   ├── state.ts                  # State Annotation — fields, reducers, defaults
    │   ├── nodes/                    # Individual agent node implementations
    │   │   ├── entity-resolver.ts    # ① Resolve company name → ticker + profile
    │   │   ├── financial-data.ts     # ②a Fetch price, metrics, fundamentals
    │   │   ├── news-sentiment.ts     # ②b Fetch news → batch classify sentiment
    │   │   ├── competitive.ts        # ②c Peer analysis + moat assessment
    │   │   ├── risk-flags.ts         # ②d Identify & classify risk flags
    │   │   ├── overview.ts           # ②e Web search → business model summary
    │   │   └── synthesis.ts          # ③ Score rubric → Invest/Pass verdict
    │   └── services/                 # Shared external API wrappers
    │       ├── llm.ts                # Groq ChatGroq instances (lazy-init via Proxy)
    │       ├── finnhub.ts            # Finnhub REST client (rate-limited, typed)
    │       └── tavily.ts             # Tavily web search client
    │
    └── frontend/                     # React UI layer
        ├── types.ts                  # TypeScript interfaces shared across the app
        └── components/               # Reusable card components
            ├── DecisionCard.tsx       # Verdict banner + Pros/Cons + Bottom Line
            ├── FinancialsCard.tsx      # Stock price + financial metrics grid
            ├── NewsSentiment.tsx       # Sentiment bar + headline list
            ├── CompetitiveLandscape.tsx# Peers + moat + market position
            ├── RiskFlags.tsx           # Severity-colored risk cards
            ├── OverviewCard.tsx        # Business model + funding + products
            ├── ScoreBreakdown.tsx      # 5-dimension score visualization
            └── PipelineProgress.tsx    # Real-time node status tracker
```

---

## 🚀 Setup & Installation

### Prerequisites
- **Node.js** 18 or later
- **npm** (comes with Node.js)

### 1. Clone & Install

```bash
git clone <repo-url>
cd AI_Investment_Research_Agent
npm install
```

### 2. Get Your API Keys (All Free)

You need **2 required** keys and **1 recommended** key:

| Key | Required? | Where to Get It | Free Tier |
|---|---|---|---|
| `GROQ_API_KEY` | ✅ Required | [console.groq.com](https://console.groq.com) | 30 requests/minute |
| `FINNHUB_API_KEY` | ✅ Required | [finnhub.io](https://finnhub.io) | 60 calls/minute |
| `TAVILY_API_KEY` | 🟡 Recommended | [tavily.com](https://tavily.com) | 1000 searches/month |
| `ALPHA_VANTAGE_API_KEY` | ⚪ Optional | [alphavantage.co](https://www.alphavantage.co/support/#api-key) | 25 calls/day |
| `NEWS_API_KEY` | ⚪ Optional | [newsapi.org](https://newsapi.org) | 100 requests/day |

### 3. Create Your `.env` File

```env
# Required
GROQ_API_KEY=your_groq_api_key_here
FINNHUB_API_KEY=your_finnhub_api_key_here

# Recommended (enables private company research + news fallback)
TAVILY_API_KEY=your_tavily_api_key_here

# Optional
ALPHA_VANTAGE_API_KEY=your_key_here
NEWS_API_KEY=your_key_here
```

### 4. Run the App

```bash
# Development mode (with hot reload)
npm run dev

# Or build for production
npm run build
npm run start
```

Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 💬 How to Use It

### Example Conversations

| You Type | What Happens |
|---|---|
| `"hello"` | The agent greets you and explains what it can do. |
| `"Should I invest in Tesla?"` | Full research pipeline runs → you get a detailed Invest/Pass report. |
| `"Analyze Tata"` | Entity resolver picks the largest Tata entity (TCS), runs full analysis. |
| `"What are the risks?"` | Follow-up — agent answers using the previous Tesla/Tata analysis data. |
| `"Why did you say Invest?"` | Follow-up — explains the reasoning behind the verdict. |
| `"MyFitnessPal"` | Private company — uses Tavily web search for business model info. |

### Tips
- **Be specific:** "Is Microsoft a good buy?" works better than "tech stocks"
- **Ask follow-ups:** After an analysis, ask about specific aspects — risks, financials, competitors
- **Try private companies:** The agent works for non-public companies too, though financial data will be limited
- **New Chat button:** Click 🧹 to clear history and start analyzing a different company

---

## 🛠️ Key Architectural Decisions

| Decision | Why |
|---|---|
| **Groq over OpenAI/Claude** | 10-50x faster inference on free tier. Speed matters when making 8+ LLM calls per analysis. Trade-off: slightly weaker reasoning, mitigated by Zod structured outputs. |
| **Finnhub over Yahoo Finance** | Proper API with structured responses and generous free tier (60 calls/min). Yahoo Finance has no official API and scraping is unreliable. |
| **Lazy LLM initialization** | Uses a Proxy pattern to defer API key validation to runtime. This prevents `next build` from failing in CI/CD environments without env vars. |
| **Single SSE endpoint** | One `/api/analyze` route handles chat, analysis, and follow-ups. Intent is classified first, then the appropriate handler runs. Simplifies the API surface. |
| **Zod structured outputs** | Every LLM call returns validated JSON matching a Zod schema. No regex parsing, no JSON.parse failures, no hallucinated field names. |
| **Array merge reducers** | LangGraph state uses `(prev, next) => [...prev, ...next]` for arrays like `errors` and `completedNodes`, so multiple parallel nodes can safely append without overwriting each other. |
| **Confidence cap at 95%** | The system intentionally never reports > 95% confidence. With limited data sources and AI-generated analysis, epistemic humility is important. |

---

## 📜 License

This project is for educational and personal use. Not financial advice.

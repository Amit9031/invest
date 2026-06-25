# Insight Invest™ - Smart Investment Research System

---

## 1. Overview — What It Does
Insight Invest is a full-stack, multi-agent AI research system designed to analyze companies, evaluate financials, gather market intelligence, weigh critical risks, and draft professional investment theses. 

The system takes a company name (e.g., "Apple", "Tesla", or a private entity like "OpenAI"), conducts comprehensive qualitative and quantitative research, and outputs:
*   A definitive decision: **`INVEST`**, **`PASS`**, or **`HOLD`**.
*   A fundamental rating: `Strong Buy`, `Buy`, `Hold`, `Sell`, or `Strong Sell`.
*   An analyst confidence score (`0%` to `100%`).
*   A detailed, beautifully compiled **Investment Research Report** covering executive summary, investment thesis, key risk factors, and financial metrics.

---

## 2. How to Run It — Setup and Run Steps (plus any keys/ env needed)

### Requirements
*   **Node.js**: Version 18.x or newer (Vercel builds with `24.x`).
*   **Google Gemini API Key** or **OpenAI API Key**.

### Setup Steps
1.  **Clone / Download** the repository.
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Copy the example environment variables file to create a local `.env` file:
    ```bash
    cp .env.example .env
    ```
4.  Configure your Gemini API key in the `.env` file:
    ```env
    GEMINI_API_KEY=your_gemini_api_key_here
    ```
    *(Note: The project is configured to use the `gemini-2.5-flash` model, which is the default active model in the AI Studio free-tier sandbox).*

### Run Steps (Local Web Application)
Start the Next.js development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser to access the premium, glassmorphic research dashboard.

### Run Steps (Command Line Interface - CLI)
You can also run the agent logic directly in the terminal using the CLI runner:
```bash
npx tsx scripts/test-agent.ts "Company Name"
```
Example:
```bash
npx tsx scripts/test-agent.ts "Apple"
```

---

## 3. How It Works — Your Approach and Architecture

The backend is structured as a **State Graph** using LangGraph.js. Each step in the research process is managed by an autonomous, specialized node:

```
[User Input] 
     │
     ▼
┌─────────────────────────────────┐
│       1. Ticker Matcher         │ ──(If Private Entity)──┐
└─────────────────────────────────┘                        │
     │ (If Public Stock)                                   │
     ▼                                                     ▼
┌─────────────────────────────────┐               ┌──────────────────┐
│      2. Financial Analyst       │               │                  │
└─────────────────────────────────┘               │                  │
     │                                            │                  │
     ▼                                            │                  │
┌─────────────────────────────────┐               │                  │
│       3. Web Researcher         │ ◄─────────────┘                  │
└─────────────────────────────────┘                                  │
     │                                                               │
     ▼                                                               │
┌─────────────────────────────────┐                                  ▼
│        4. Risk Analyst          │                       [Skip to News]
└─────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────┐
│     5. Investment Committee     │
└─────────────────────────────────┘
     │
     ▼
[Final Thesis & Recommendation]
```

### Agent Nodes:
1.  **Ticker & Sector Matcher**: Integrates with Yahoo Finance search to match the company name to a public stock ticker. If unmatched, it uses Gemini to evaluate if the company is private/early-stage.
2.  **Financial Analyst** *(Public only)*: Pulls raw financial statement metrics from Yahoo Finance (Market Cap, P/E ratio, margins, revenue growth, debt-to-equity, liquidity) and writes a quantitative valuation report.
3.  **Web News Researcher**: Scrapes search engines for recent news and competitor details, then analyzes market/public sentiment (Bullish/Bearish/Neutral).
4.  **Risk Analyst**: Conducts a downside assessment identifying regulatory, operational, competitive, and macroeconomic vulnerabilities.
5.  **Investment Committee**: Synthesizes the quantitative and qualitative findings to deliver the final rating, decision, confidence score, and research thesis.

---

## 4. Key Decisions & Trade-offs — What You Chose and Why, and What You Left Out

### What We Chose and Why:
*   **TypeScript-Safe Yahoo Finance v3**: Upgraded the integration to use the class-based instantiation required by `yahoo-finance2` v3. This resolved silent query failures caused by older static API calls.
*   **Plain Markdown Metadata Parsing**: Instead of requesting the LLM to output a complex JSON block containing a multi-line Markdown report (which frequently fails due to unescaped newline syntax errors), the Investment Committee outputs a standard Markdown document prefixed with simple metadata tags (`[DECISION]: ...`). The backend parses these headers using regular expressions, resulting in a robust, bulletproof workflow.
*   **Rules-Based Fallback Engine**: If LLM keys are missing or hit rate-limits (HTTP 429), the nodes catch the exceptions and run a local rules-based engine. This parses the real-time Yahoo Finance metrics to output logical, dynamic hold/pass verdicts and a customized report rather than crashing.

### What We Left Out:
*   **Vector Database (RAG)**: We opted to use live search scraping and direct API lookups (like Yahoo Finance) instead of a vector database index. This guarantees that all financial and news data is completely fresh and up-to-date.
*   **Multi-Agent Communication Protocols**: Nodes run sequentially in a directed acyclic graph rather than dynamically chatting with each other. This trade-off significantly improves speed and lowers token consumption.

---

## 5. Example Runs — Your Agent’s Output on a Few Companies of Your Choice

### Example 1: `"Apple"`
*   **Ticker Matched**: `AAPL`
*   **Quantitative Metrics**: Price: `$293.17` | YoY Growth: `16.6%` | Net Margin: `27.2%` | P/E: `33.9x` | Market Cap: `$4113.34B`
*   **Verdict**: **`HOLD`**
*   **Rating**: `Hold` (Confidence: `70%`)
*   **Executive Thesis**: Apple Inc. presents a stable outlook with high margin efficiency and solid revenue growth. However, its elevated P/E multiple (33.9x) requires continuous growth to justify stock prices, directing a Hold position.

### Example 2: `"OpenAI"` (Private Company)
*   **Ticker Matched**: `N/A` (Private Entity)
*   **Quantitative Metrics**: `N/A` (Private entity fallback mode)
*   **Verdict**: **`PASS`**
*   **Rating**: `Hold` (Confidence: `70%`)
*   **Executive Thesis**: OpenAI is a leading private generative AI entity with high brand equity. However, the lack of public filings, high capital burn, and structure complexity lead the committee to pass on capital commitment at this stage.

---

## 6. What You Would Improve with More Time
1.  **SEC Edgar Integration**: Add automated parsing of 10-K and 10-Q filings for deeper financial audits.
2.  **Earnings Call Scraper**: Scrape PDF transcripts of corporate quarterly calls and perform NLP semantic analysis on executive tone.
3.  **User Portfolio Manager**: Add database storage to allow users to track analyzed stocks over time.
4.  **Multi-Language Reports**: Translate final theses and reports to support international investment offices.

---

## 7. BONUS points: LLM Chat Transcript Logs
As mandated by the bonus points request, this project was built entirely in a pair programming session with an LLM agent (**Insight Analyst / Antigravity**).

The complete, chronological dialogue log documenting every single prompt, instruction, and decision made during the construction of this assignment is fully included in this repository:
*   **Transcript Log File**: **[`chat_history.md`](file:///c:/Users/Amit%20Ranjan/Downloads/assignment/chat_history.md)** (located at the root directory).

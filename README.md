# Insight Invest™ - Smart Investment Research System

Insight Invest is a full-stack, multi-agent AI research system designed to analyze companies, evaluate financials, gather market intelligence, weigh critical risks, and draft professional investment theses. 

Under the hood, the system orchestrates a modular pipeline of specialized agent nodes using **LangGraph.js**, **LangChain.js**, **Yahoo Finance (v3)**, and **Google Gemini 2.5**.

---

## 1. Overview
The system takes a company name (e.g., "Apple", "Tesla", or a private entity like "OpenAI"), conducts comprehensive qualitative and quantitative research, and outputs:
*   A definitive decision: **`INVEST`**, **`PASS`**, or **`HOLD`**.
*   A fundamental rating: `Strong Buy`, `Buy`, `Hold`, `Sell`, or `Strong Sell`.
*   An analyst confidence score (`0%` to `100%`).
*   A detailed, beautifully compiled **Investment Research Report** covering executive summary, investment thesis, key risk factors, and financial metrics.

---

## 2. How to Run It

### Setup
1.  **Clone / Download** the repository.
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Copy the example environment file:
    ```bash
    cp .env.example .env
    ```
4.  Configure your Gemini API key in `.env`:
    ```env
    GEMINI_API_KEY=your_gemini_api_key_here
    ```
    *(Note: The project is configured to use the `gemini-2.5-flash` model, which is the default active model in the AI Studio free-tier sandbox).*

### Run the Web Application
Start the Next.js development server:
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser to access the premium, glassmorphic research dashboard.

### Run via Command Line Interface (CLI)
You can also run the agent logic directly in the terminal using the CLI runner:
```bash
npx tsx scripts/test-agent.ts "Company Name"
```
Example:
```bash
npx tsx scripts/test-agent.ts "Apple"
```

---

## 3. How It Works (Architecture & Workflow)

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

## 4. Key Decisions & Trade-Offs

*   **TypeScript-Safe Yahoo Finance v3**: Upgraded the integration to use the class-based instantiation required by `yahoo-finance2` v3. This resolved silent query failures caused by older static API calls.
*   **Plain Markdown Metadata Parsing**: Instead of requesting the LLM to output a complex JSON block containing a multi-line Markdown report (which frequently fails due to unescaped newline syntax errors), the Investment Committee outputs a standard Markdown document prefixed with simple metadata tags (`[DECISION]: ...`). The backend parses these headers using regular expressions, resulting in a robust, bulletproof workflow.
*   **Rules-Based Fallback Engine**: If LLM keys are missing or hit rate-limits (HTTP 429), the nodes catch the exceptions and run a local rules-based engine. This parses the real-time Yahoo Finance metrics to output logical, dynamic hold/pass verdicts and a customized report rather than crashing.

---

## 5. Example Run

### Input: `"Apple"`
```
[TICKERMATCHER] Matched "Apple" to stock ticker "AAPL" in the Technology sector.
[FINANCIALANALYST] Completed quantitative analysis of AAPL. P/E: 33.8, Margin: 27.2%, YoY Growth: 16.6%.
[WEBRESEARCHER] Fetched web news. Market sentiment identified as "Bullish".
[RISKANALYST] Completed downside risk assessment (Flagged P/E multiples and competitive threats).
[INVESTMENTCOMMITTEE] Voted. Decision: INVEST with a Buy rating (75% confidence).
```

### Final Thesis Summary
*   **Decision**: **`INVEST`**
*   **Rating**: **`Buy`**
*   **Confidence**: `75%`
*   **Thesis**: Apple shows outstanding profit margin efficiency (27.2%) and strong revenue growth (16.6%). Its ecosystem and shift into AI justify its premium P/E valuation, making it a Buy.

---

## 6. Future Improvements
1.  **SEC Edgar Integration**: Add automated parsing of 10-K and 10-Q filings for deeper financial audits.
2.  **Earnings Call Scraper**: Scrape PDF transcripts of corporate quarterly calls and perform NLP semantic analysis on executive tone.
3.  **User Portfolio Manager**: Add database storage to allow users to track analyzed stocks over time.

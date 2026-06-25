import { ResearchState } from "./state";
import { getLLM } from "../llm";
import { resolveTickerAndFinancials, searchWeb } from "./tools";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

// Simple utility to extract JSON from LLM markdown responses
function parseJsonFromResponse(text: string): any {
  const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/{[\s\S]*}/);
  if (jsonMatch) {
    try {
      const jsonText = jsonMatch[1] ? jsonMatch[1].trim() : jsonMatch[0].trim();
      return JSON.parse(jsonText);
    } catch (e) {
      console.error("JSON parsing error on text:", text, e);
    }
  }
  return null;
}

/**
 * 1. Ticker & Sector Matcher Node
 * Searches for a ticker symbol and resolves sector/industry.
 */
export async function tickerMatcherNode(state: ResearchState) {
  const companyName = state.companyName;
  const logPrefix = "Ticker Matcher Agent: ";
  
  // Call Yahoo Finance search tool
  const result = await resolveTickerAndFinancials(companyName);

  if (result.isPublic && result.ticker) {
    return {
      ticker: result.ticker,
      isPublic: true,
      sector: result.sector,
      industry: result.industry,
      financials: result.financials,
      currentAgent: "Financial Analyst",
      logs: [
        `${logPrefix}Successfully matched "${companyName}" to public stock ticker "${result.ticker}" in the ${result.sector} sector (${result.industry} industry).`
      ]
    };
  } else {
    // If not found directly, let LLM check if it's a known public company and suggest a ticker
    const llm = getLLM();
    const prompt = `
The user is researching the company: "${companyName}".
Our Yahoo Finance lookup failed to find a direct stock symbol.
Analyze if "${companyName}" is a well-known public company and determine if it has a stock ticker (e.g. "Google" -> "GOOGL").
If it is public, reply with the exact ticker. If it is private, early-stage, or you are unsure, flag it as private.

Respond ONLY with a JSON block:
\`\`\`json
{
  "isPublic": boolean,
  "ticker": "string or empty",
  "reason": "explanation of why it is public/private"
}
\`\`\`
`;
    
    try {
      const response = await llm.invoke([new HumanMessage(prompt)]);
      const parsed = parseJsonFromResponse(response.content as string);
      
      if (parsed && parsed.isPublic && parsed.ticker) {
        // Try searching again with the suggested ticker
        const secondTryResult = await resolveTickerAndFinancials(parsed.ticker);
        if (secondTryResult.ticker) {
          return {
            ticker: secondTryResult.ticker,
            isPublic: true,
            sector: secondTryResult.sector,
            industry: secondTryResult.industry,
            financials: secondTryResult.financials,
            currentAgent: "Financial Analyst",
            logs: [
              `${logPrefix}Yahoo Finance search fell back to LLM recommendation. Matched to ticker "${secondTryResult.ticker}" (${secondTryResult.sector}).`
            ]
          };
        }
      }
    } catch (e) {
      console.error("LLM ticker matching refinement failed:", e);
    }

    return {
      ticker: "",
      isPublic: false,
      sector: "Private / Private Equity",
      industry: "Venture-Backed / Private",
      financials: {
        summary: `No public market data available. "${companyName}" is analyzed as a private entity.`
      },
      currentAgent: "Web Researcher", // Skip financial node for private companies
      logs: [
        `${logPrefix}No stock ticker found. Analyzing "${companyName}" as a private or venture-backed entity.`
      ]
    };
  }
}

/**
 * 2. Financial Analyst Node
 * Analyzes quantitative financial statement data for public stocks.
 */
export async function financialAnalystNode(state: ResearchState) {
  const logPrefix = "Financial Analyst Agent: ";
  
  if (!state.isPublic || !state.ticker) {
    return {
      currentAgent: "Investment Committee",
      logs: [`${logPrefix}Skipped financial statement node (not a public company).`]
    };
  }

  const llm = getLLM();
  const financials = state.financials;

  const prompt = `
Analyze the following financial metrics for ${state.companyName} (${state.ticker}):
- Current Price: $${financials.price || "N/A"}
- Market Capitalization: $${financials.marketCap ? (financials.marketCap / 1e9).toFixed(2) + "B" : "N/A"}
- Trailing P/E Ratio: ${financials.peRatio || "N/A"}
- Dividend Yield: ${financials.dividendYield ? financials.dividendYield.toFixed(2) + "%" : "N/A"}
- Earnings Per Share (EPS): $${financials.eps || "N/A"}
- Net Profit Margin: ${financials.profitMargins ? financials.profitMargins.toFixed(2) + "%" : "N/A"}
- Revenue Growth (YoY): ${financials.revenueGrowth ? financials.revenueGrowth.toFixed(2) + "%" : "N/A"}
- Debt-to-Equity Ratio: ${financials.debtToEquity || "N/A"}
- Current Ratio (Liquidity): ${financials.currentRatio || "N/A"}
- Free Cash Flow: $${financials.freeCashFlow ? (financials.freeCashFlow / 1e6).toFixed(2) + "M" : "N/A"}
- Wall Street Analyst Rating Mean (1.0 Buy to 5.0 Sell): ${financials.recommendationMean || "N/A"}

Context Summary:
${financials.summary || "No description available."}

Write a professional quantitative evaluation of this company's financial health, addressing:
1. **Valuation**: Is the stock expensive or cheap based on P/E and growth?
2. **Profitability & Margins**: Is the company highly profitable, or running on thin margins?
3. **Balance Sheet Strength**: Review Debt-to-Equity and liquidity (Current Ratio).
4. **Cash Flow & Growth**: Is revenue growth positive and is free cash flow strong?

Keep your report concise (approx 250-300 words), formatted in Markdown.
`;

  try {
    const response = await llm.invoke([
      new SystemMessage("You are an expert Wall Street Equity Research Analyst specializing in quantitative analysis."),
      new HumanMessage(prompt)
    ]);

    // Save report block inside the state's financials object
    const financialsUpdated = {
      ...financials,
      analysis: response.content as string
    };

    return {
      financials: financialsUpdated,
      currentAgent: "Investment Committee",
      logs: [
        `${logPrefix}Completed quantitative analysis of ${state.ticker}. Highlighted metrics: P/E of ${financials.peRatio || "N/A"}, Profit Margin of ${financials.profitMargins ? financials.profitMargins.toFixed(1) + "%" : "N/A"}, and YoY Revenue Growth of ${financials.revenueGrowth ? financials.revenueGrowth.toFixed(1) + "%" : "N/A"}.`
      ]
    };
  } catch (error) {
    console.warn("Financial Analyst Node LLM call failed. Invoking rules-based quantitative engine:", error);
    
    // Generate rules-based analysis using financials parameters
    const price = financials.price || 0;
    const pe = financials.peRatio || 0;
    const margin = financials.profitMargins || 0;
    const growth = financials.revenueGrowth || 0;
    const de = financials.debtToEquity || 0;
    
    let valuationSummary = `The company trades at a stock price of $${price.toFixed(2)}. `;
    if (pe > 0) {
      valuationSummary += `Its P/E ratio is ${pe.toFixed(1)}x, indicating a ${pe > 25 ? "premium growth valuation" : "reasonable baseline valuation"} relative to historical averages.`;
    } else {
      valuationSummary += "No PE valuation multiple is currently available.";
    }

    let profitSummary = `The business records a net profit margin of ${margin.toFixed(1)}%. `;
    if (margin > 15) {
      profitSummary += "This demonstrates strong core profitability and excellent operational efficiency.";
    } else if (margin > 5) {
      profitSummary += "This represents a stable but moderate margin profile typical of its industry peer group.";
    } else if (margin > 0) {
      profitSummary += "The company runs on thin margins, suggesting vulnerability to supply chain and operational cost pressures.";
    } else {
      profitSummary += "The company's net profit margin is currently negative or unavailable, reflecting high operating costs.";
    }

    let growthSummary = `YoY Revenue Growth stands at ${growth.toFixed(1)}%. `;
    if (growth > 15) {
      growthSummary += "This indicates high-velocity top-line expansion, reflecting strong product demand and market capture.";
    } else if (growth > 0) {
      growthSummary += "This indicates moderate, steady sales growth.";
    } else if (growth < 0) {
      growthSummary += "Negative top-line growth points to market maturation or intensifying competitive threats.";
    } else {
      growthSummary += "Year-over-year growth metrics are currently unlisted or flat.";
    }

    let balanceSheetSummary = "";
    if (de > 0) {
      balanceSheetSummary = `Its Debt-to-Equity ratio of ${de.toFixed(2)} indicates a ${de > 100 ? "leveraged balance sheet structure" : "conservative debt profile"}.`;
    } else {
      balanceSheetSummary = "The debt-to-equity ratio is unlisted, indicating a potentially cleaner capital structure.";
    }

    const mockAnalysis = `
### Quantitative Financial Evaluation

#### 1. Valuation & Pricing
${valuationSummary}

#### 2. Profitability & Margins
${profitSummary}

#### 3. Balance Sheet & Leverage
${balanceSheetSummary}

#### 4. Growth Profile
${growthSummary}
    `.trim();

    const financialsUpdated = {
      ...financials,
      analysis: mockAnalysis
    };

    return {
      financials: financialsUpdated,
      currentAgent: "Investment Committee",
      logs: [
        `${logPrefix}Completed rules-based quantitative evaluation of ${state.ticker}. (Fallback mode active)`
      ]
    };
  }
}

/**
 * 3. Web & News Researcher Node
 * Gathers news, competitors, and qualitative market updates.
 */
export async function webResearcherNode(state: ResearchState) {
  const logPrefix = "Web Researcher Agent: ";
  const companyName = state.companyName;

  // Build search queries
  const newsQuery = `${companyName} news developments 2025 2026`;
  const competitorQuery = `${companyName} competitors market share`;

  // Fetch search results
  const newsResults = await searchWeb(newsQuery);
  const competitorResults = await searchWeb(competitorQuery);

  const newsContent = newsResults.map(r => `- **[${r.title}](${r.url || "#"})**: ${r.snippet}`).join("\n");
  const competitorContent = competitorResults.map(r => `- **[${r.title}](${r.url || "#"})**: ${r.snippet}`).join("\n");

  const llm = getLLM();
  const prompt = `
Summarize the current news and competitive market standing for "${companyName}".
Here is the web search data we gathered:

--- RECENT DEVELOPMENTS & NEWS ---
${newsContent || "No recent news found."}

--- COMPETITIVE LANDSCAPE & MARKET ---
${competitorContent || "No competitor details found."}

Based on this data, write a brief analysis (in Markdown) answering:
1. What are the 2-3 most critical recent news items or events surrounding the company?
2. Who are its primary competitors, and how does it differentiate itself?
3. What is the general public/market sentiment toward the company (Bullish/Bearish/Neutral)?

Ensure all statements are backed by the provided search snippets. Keep the summary under 300 words.
`;

  try {
    const response = await llm.invoke([
      new SystemMessage("You are a Senior Business Journalist and Corporate Intelligence Researcher."),
      new HumanMessage(prompt)
    ]);

    // Also determine a quick sentiment label
    const sentimentPrompt = `
Analyze the sentiment of the following news details for ${companyName}:
"${response.content}"
Is the overall news sentiment Bullish, Bearish, or Neutral? Respond with exactly one word.
`;
    const sentimentResp = await llm.invoke([new HumanMessage(sentimentPrompt)]);
    const sentimentVal = (sentimentResp.content as string).trim().replace(/[^a-zA-Z]/g, "");

    return {
      news: [response.content as string],
      sentiment: sentimentVal || "Neutral",
      currentAgent: "Investment Committee",
      logs: [
        `${logPrefix}Fetched and processed ${newsResults.length + competitorResults.length} web search results. Identified market sentiment as "${sentimentVal || "Neutral"}".`
      ]
    };
  } catch (error) {
    console.warn("Web Researcher Node LLM call failed. Invoking fallback market intelligence compiler:", error);
    
    // Determine sentiment based on fundamentals if LLM failed
    const growth = state.financials?.revenueGrowth || 0;
    const margin = state.financials?.profitMargins || 0;
    const sentimentVal = (growth > 10 && margin > 10) ? "Bullish" : (growth < 0 || margin < 0) ? "Bearish" : "Neutral";
    
    const mockNewsAnalysis = `
### Market Intelligence Report

#### 1. Recent Events & Announcements
- **Market Positioning**: ${companyName} continues to expand its footprint in the ${state.sector || "Unknown"} sector. Recent corporate filings show continuous focus on product lines matching the ${state.industry || "Unknown"} vertical.
- **Industry Trend**: Emerging industry reports highlight accelerating technological transitions in ${state.industry || "Unknown"}, which directly impacts the company's long-term competitive moat.
- **Corporate Developments**: Strategic corporate reorganizations and ongoing investment in research and development are noted as key priorities in recent public communications.

#### 2. Competitors & Differentiation
- **Competitive Landscape**: Key competitors include established major firms in ${state.sector || "Unknown"} and secondary regional niche operators.
- **Moat & Differentiation**: The company differentiates itself through established brand equity, strategic distribution relationships, and product ecosystem integration.

#### 3. Market Sentiment
- Based on trailing growth metrics and sector dynamics, the market sentiment is evaluated as **${sentimentVal}**.
    `.trim();

    return {
      news: [mockNewsAnalysis],
      sentiment: sentimentVal,
      currentAgent: "Investment Committee",
      logs: [
        `${logPrefix}Compiled rules-based market intelligence report. Identified sentiment as "${sentimentVal}". (Fallback mode active)`
      ]
    };
  }
}

/**
 * 4. Risk Analyst Node
 * Evaluates risk vectors, barriers, and potential downside.
 */
export async function riskAnalystNode(state: ResearchState) {
  const logPrefix = "Risk Analyst Agent: ";
  const llm = getLLM();

  // Combine financials & news text for risk analysis
  const financialsInfo = state.isPublic 
    ? `P/E: ${state.financials.peRatio || "N/A"}, Debt/Equity: ${state.financials.debtToEquity || "N/A"}, Revenue Growth: ${state.financials.revenueGrowth || "N/A"}%`
    : "Private Company (detailed financials unavailable)";
  
  const newsInfo = state.news?.[0] || "No news summaries available.";

  const prompt = `
Perform a critical risk assessment for "${state.companyName}".
Analyze these details:
- Sector/Industry: ${state.sector} / ${state.industry}
- Financial Overview: ${financialsInfo}
- Recent News & Sentiment: ${newsInfo}

Identify the top 3-4 risk factors that could lead to an investment failure or decline in company value.
Address these categories where relevant:
1. **Regulatory & Compliance**: Legal hurdles, government policies, antitrust.
2. **Execution & Operational**: Product delays, supply chain, management issues.
3. **Competitive Threat**: Technologies or competitors displacing the company (e.g. technological disruption).
4. **Macroeconomic / Financial**: High debt burden, interest rates, capital needs.

Be critical, objective, and realistic. Write a clean markdown list under 250 words.
`;

  try {
    const response = await llm.invoke([
      new SystemMessage("You are a cynical Risk Officer and Short-Seller Analyst looking for reasons a company might fail."),
      new HumanMessage(prompt)
    ]);

    // Parse the response into bullet items
    const risksList = (response.content as string)
      .split("\n")
      .map(item => item.trim())
      .filter(item => item.startsWith("-") || item.match(/^\d+\./));

    return {
      risks: risksList.length > 0 ? risksList : [response.content as string],
      currentAgent: "Investment Committee",
      logs: [
        `${logPrefix}Completed downside risk assessment. Identified ${risksList.length || 3} critical vulnerability vectors including industry-wide and asset-specific exposures.`
      ]
    };
  } catch (error) {
    console.warn("Risk Analyst Node LLM call failed. Invoking fallback risk ledger compiler:", error);
    
    const de = state.financials?.debtToEquity || 0;
    const margin = state.financials?.profitMargins || 0;
    
    const fallbackRisks = [
      `Competitive Threat: Intense competition within the ${state.sector || "current"} sector leading to potential price compression and customer churn.`,
      `Technological & Execution Risk: High research and development overhead required to adapt to technological shifts in the ${state.industry || "industry"} space.`,
      de > 120 
        ? `Balance Sheet Leverage: Elevated Debt-to-Equity ratio (${de.toFixed(1)}%) representing credit vulnerability under restrictive monetary environments.`
        : `Operational Overhead: Regulatory compliance and operational overhead impacting profitability scales in local markets.`,
      margin < 5 
        ? `Thin Net Margins: Operating profit margin of ${margin.toFixed(1)}% leaves little safety margin against macroeconomic inflation or supply chain increases.`
        : `Product Maturation: Potential slowdown in core customer adoption curves, requiring constant diversification into capital-intensive adjacent verticals.`
    ];

    return {
      risks: fallbackRisks,
      currentAgent: "Investment Committee",
      logs: [
        `${logPrefix}Completed downside risk assessment. Identified ${fallbackRisks.length} key risk exposures based on corporate financials. (Fallback mode active)`
      ]
    };
  }
}

/**
 * 5. Investment Committee Node
 * Integrates all reports, makes the final decision, and structures the final output.
 */
export async function investmentCommitteeNode(state: ResearchState) {
  const logPrefix = "Investment Committee: ";
  const llm = getLLM();

  const company = state.companyName;
  const isPublic = state.isPublic;
  const ticker = state.ticker;
  const financials = state.financials;
  const newsAnalysis = state.news?.[0] || "No news details.";
  const riskAnalysis = state.risks?.join("\n") || "No risk analysis.";

  const financialSummaryText = isPublic
    ? `
- Price: $${financials.price || "N/A"}
- P/E: ${financials.peRatio || "N/A"}
- Margins: ${financials.profitMargins ? financials.profitMargins.toFixed(1) + "%" : "N/A"}
- Revenue Growth: ${financials.revenueGrowth ? financials.revenueGrowth.toFixed(1) + "%" : "N/A"}
- Debt/Equity: ${financials.debtToEquity || "N/A"}
- Quantitative Financial Report:
${financials.analysis || "No financial report."}
`
    : "Private Company (metrics not publicly listed). Analyzed via market footprint.";

  const prompt = `
You are the Chairman of the Investment Committee. You must synthesize all research reports on "${company}" and make the final decision: **INVEST** or **PASS**.

Here is the accumulated research:
--- COMPANY OVERVIEW ---
Name: ${company}
Ticker: ${ticker || "N/A"} (Public: ${isPublic})
Sector/Industry: ${state.sector} / ${state.industry}

--- FINANCIAL REPORT ---
${financialSummaryText}

--- NEWS & MARKET POSITION ---
${newsAnalysis}

--- RISK PROFILE ---
${riskAnalysis}

Your task:
1. Make a definitive decision: "INVEST" or "PASS" (or "HOLD" only if completely balanced).
2. Assign a rating (e.g. "Strong Buy", "Buy", "Hold", "Sell", "Strong Sell").
3. Determine a confidence score (0 to 100) based on data completeness and risk profile.
4. Compile a comprehensive, beautiful Investment Research Report in Markdown.

The report should have:
- **Header**: Decision (INVEST/PASS) in large letters, Ticker, and Rating.
- **Executive Summary**: A punchy 3-sentence summary of the investment decision.
- **Investment Thesis**: Detailed arguments supporting your decision.
- **Key Risks & Red Flags**: Critical concerns that could derail the thesis.
- **Financial & Market Strength**: Summary table and evaluation.
- **Final Verdict**: Explicit summary reasoning.

Respond by prefixing your markdown report with exactly these three metadata headers at the very top (case-sensitive), followed by your markdown report:
[DECISION]: <INVEST or PASS or HOLD>
[RATING]: <Strong Buy, Buy, Hold, Sell, or Strong Sell>
[CONFIDENCE]: <number between 0 and 100>

Example Output Format:
[DECISION]: INVEST
[RATING]: Buy
[CONFIDENCE]: 85

# INVESTMENT RESEARCH REPORT: ...
`;

  try {
    const response = await llm.invoke([
      new SystemMessage("You are the Managing Director of a premier Venture Capital & Private Equity Fund."),
      new HumanMessage(prompt)
    ]);

    const content = response.content as string;
    const decisionMatch = content.match(/\[DECISION\]:\s*(INVEST|PASS|HOLD)/i);
    const ratingMatch = content.match(/\[RATING\]:\s*([^\n\r]+)/i);
    const confidenceMatch = content.match(/\[CONFIDENCE\]:\s*(\d+)/i);

    if (decisionMatch && ratingMatch && confidenceMatch) {
      const decisionVal = decisionMatch[1].toUpperCase().trim() as "INVEST" | "PASS" | "HOLD";
      const ratingVal = ratingMatch[1].replace(/[\[\]]/g, "").trim();
      const confidenceVal = parseInt(confidenceMatch[1].trim());
      
      // Clean up the metadata block from the report so it displays cleanly in the UI
      const cleanReport = content
        .replace(/\[DECISION\]:\s*(INVEST|PASS|HOLD)/gi, "")
        .replace(/\[RATING\]:\s*[^\n]+/gi, "")
        .replace(/\[CONFIDENCE\]:\s*\d+/gi, "")
        .trim();

      return {
        decision: decisionVal,
        rating: ratingVal || "Hold",
        confidence: confidenceVal || 70,
        report: cleanReport,
        currentAgent: "Complete",
        logs: [
          `${logPrefix}Investment Committee has voted. Decision: **${decisionVal}** with a rating of **${ratingVal}** (Confidence: ${confidenceVal}%). Thesis and report generated successfully.`
        ]
      };
    } else {
      throw new Error("Failed to parse expected metadata headers from LLM markdown response.");
    }
  } catch (error) {
    console.warn("Investment Committee Node LLM call failed. Invoking fallback synthesis engine:", error);
    
    const growth = state.financials?.revenueGrowth || 0;
    const margin = state.financials?.profitMargins || 0;
    const pe = state.financials?.peRatio || 0;
    const sentiment = state.sentiment || "Neutral";
    
    // Formulate a logical investment decision based on financials
    let decision: "INVEST" | "PASS" | "HOLD" = "HOLD";
    let rating = "Hold";
    let confidence = 70;
    
    if (growth > 8 && margin > 12 && (pe === 0 || pe < 30)) {
      decision = "INVEST";
      rating = growth > 20 ? "Strong Buy" : "Buy";
      confidence = 80;
    } else if (growth < 0 || margin < 3 || pe > 45) {
      decision = "PASS";
      rating = pe > 60 ? "Strong Sell" : "Sell";
      confidence = 75;
    } else {
      decision = "HOLD";
      rating = "Hold";
      confidence = 70;
    }

    // Compile a beautiful Markdown report using the real variables
    const fallbackReport = `
# INVESTMENT RESEARCH REPORT: ${company.toUpperCase()}
## Decision: **${decision}** | Ticker: **${ticker || "N/A"}** | Rating: **${rating}**

---

### Executive Summary
After compiling quantitative financials, web news developments, and corporate risk vectors, the Investment Committee recommends a **${decision}** position on ${company}. The decision is supported by a fundamental rating of **${rating}** with a confidence score of **${confidence}%**.

---

### Investment Thesis
1. **Financial Strength**: The company displays ${margin > 12 ? "high margin efficiency" : "moderate baseline operations"} with a net profit margin of ${margin ? margin.toFixed(1) + "%" : "N/A"} and annual growth of ${growth ? growth.toFixed(1) + "%" : "N/A"}.
2. **Market Standing**: Classified under the **${state.sector || "Unknown"}** sector (${state.industry || "Unknown"} industry), the company benefits from a solid baseline footprint despite high sector competitiveness.
3. **Sentiment Anchor**: Current market sentiment is registered as **${sentiment}**, reflecting ${sentiment === "Bullish" ? "strong demand trends and optimistic guidance." : "a balanced and cautious investor outlook."}

---

### Key Risks & Red Flags
- **Industry Vulnerability**: Regulatory updates or disruption in the **${state.industry || "Unknown"}** space could pressure market share.
- **Valuation Limits**: ${pe > 0 ? `The trailing P/E ratio is currently ${pe.toFixed(1)}x, requiring continuous growth to justify price levels.` : "Absence of public listing multiple metrics increases speculative variance."}
- **Downside Exposures**: Identified key risks include sector competitor intensity and macro cost inflation.

---

### Quantitative Snapshot Table
| Parameter | Value Recorded |
| :--- | :--- |
| **Market Capitalization** | ${financials.marketCap ? "$" + (financials.marketCap / 1e9).toFixed(2) + "B" : "N/A"} |
| **Stock Price** | ${financials.price ? "$" + financials.price.toFixed(2) : "N/A"} |
| **YoY Revenue Growth** | ${growth ? growth.toFixed(1) + "%" : "N/A"} |
| **Net Profit Margin** | ${margin ? margin.toFixed(1) + "%" : "N/A"} |
| **P/E Ratio (Trailing)** | ${pe ? pe.toFixed(1) : "N/A"} |

---

### Final Verdict
The Committee votes for **${decision}** on ${company}. The company exhibits ${decision === "INVEST" ? "favorable growth-to-valuation characteristics" : decision === "PASS" ? "elevated fundamental challenges and high valuation multiples" : "balanced characteristics suitable for a wait-and-see tracking status"}.
    `.trim();

    return {
      decision: decision as any,
      rating,
      confidence,
      report: fallbackReport,
      currentAgent: "Complete",
      logs: [
        `${logPrefix}Completed analysis synthesis. Decision: **${decision}** with a rating of **${rating}** (Confidence: ${confidence}%). (Fallback mode active)`
      ]
    };
  }
}

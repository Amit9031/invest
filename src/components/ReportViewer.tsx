import React, { useState } from "react";
import { 
  TrendingUp, 
  BookOpen, 
  ShieldAlert, 
  Globe, 
  Copy, 
  Check, 
  ExternalLink 
} from "lucide-react";
import { FinancialData } from "../lib/agent/state";

interface ReportViewerProps {
  report?: string;
  decision?: "INVEST" | "PASS" | "HOLD";
  rating?: string;
  confidence?: number;
  isPublic?: boolean;
  ticker?: string;
  sector?: string;
  industry?: string;
  financials?: FinancialData;
  news?: string[];
  risks?: string[];
}

export default function ReportViewer({
  report = "",
  decision = "PASS",
  rating = "Hold",
  confidence = 50,
  isPublic = false,
  ticker = "",
  sector = "Unknown",
  industry = "Unknown",
  financials = {},
  news = [],
  risks = [],
}: ReportViewerProps) {
  const [activeTab, setActiveTab] = useState<"thesis" | "financials" | "news" | "risks">("thesis");
  const [copied, setCopied] = useState(false);

  // Helper to format currency/numbers
  const formatCurrency = (val: number | undefined) => {
    if (val === undefined || isNaN(val)) return "N/A";
    if (val >= 1e12) return `$${(val / 1e12).toFixed(2)}T`;
    if (val >= 1e9) return `$${(val / 1e9).toFixed(2)}B`;
    if (val >= 1e6) return `$${(val / 1e6).toFixed(2)}M`;
    return `$${val.toFixed(2)}`;
  };

  const formatPercent = (val: number | undefined) => {
    if (val === undefined || isNaN(val)) return "N/A";
    return `${val.toFixed(2)}%`;
  };

  // Helper to format the analyst recommendation mean scale (1 = Buy, 5 = Sell)
  const formatRecommendation = (val: number | undefined) => {
    if (val === undefined || isNaN(val)) return "N/A";
    let text = "Hold";
    if (val < 1.8) text = "Strong Buy";
    else if (val < 2.5) text = "Buy";
    else if (val < 3.5) text = "Hold";
    else if (val < 4.5) text = "Underperform / Sell";
    else text = "Strong Sell";
    return `${val.toFixed(1)} (${text})`;
  };

  // Simple Markdown to HTML parser
  const renderMarkdown = (md: string) => {
    if (!md) return null;
    
    // Process markdown string line by line
    const lines = md.split("\n");
    let inList = false;
    let listItems: string[] = [];
    const htmlElements: React.ReactNode[] = [];

    const flushList = (key: number) => {
      if (listItems.length > 0) {
        htmlElements.push(
          <ul key={`list-${key}`} className="list-disc pl-6 mb-4 space-y-1 text-slate-300">
            {listItems.map((item, i) => (
              <li key={i} dangerouslySetInnerHTML={{ __html: item }} />
            ))}
          </ul>
        );
        listItems = [];
        inList = false;
      }
    };

    lines.forEach((line, index) => {
      let trimmed = line.trim();

      // Bold formatting helper
      const parseFormatting = (text: string) => {
        return text
          .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
          .replace(/\*(.*?)\*/g, "<em>$1</em>")
          .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noreferrer" class="text-cyan-400 hover:underline inline-flex items-center gap-1">$1 <span class="text-[10px]">↗</span></a>');
      };

      // Header matching
      if (trimmed.startsWith("### ")) {
        flushList(index);
        htmlElements.push(
          <h3 key={index} className="text-lg font-bold text-white mt-6 mb-2">
            {trimmed.slice(4)}
          </h3>
        );
      } else if (trimmed.startsWith("## ")) {
        flushList(index);
        htmlElements.push(
          <h2 key={index} className="text-xl font-bold text-white border-b border-slate-800 pb-2 mt-8 mb-4">
            {trimmed.slice(3)}
          </h2>
        );
      } else if (trimmed.startsWith("# ")) {
        flushList(index);
        htmlElements.push(
          <h1 key={index} className="text-2xl font-black text-white mt-4 mb-4">
            {trimmed.slice(2)}
          </h1>
        );
      } 
      // Unordered lists matching
      else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        inList = true;
        listItems.push(parseFormatting(trimmed.slice(2)));
      } 
      // Empty line closes a list
      else if (trimmed === "") {
        flushList(index);
      } 
      // Standard paragraph
      else {
        flushList(index);
        htmlElements.push(
          <p key={index} className="mb-4 text-slate-300 leading-relaxed" dangerouslySetInnerHTML={{ __html: parseFormatting(trimmed) }} />
        );
      }
    });

    flushList(lines.length);

    return <div className="markdown-body">{htmlElements}</div>;
  };

  const handleCopyReport = () => {
    navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const decisionClass = decision === "INVEST" ? "invest" : decision === "PASS" ? "pass" : "hold";
  const decisionLabel = decision === "INVEST" ? "INVEST" : decision === "PASS" ? "PASS" : "HOLD / WATCHLIST";
  const tagline = decision === "INVEST" 
    ? "Highly recommended opportunity. Favorable risk-reward metrics." 
    : decision === "PASS"
    ? "Decline transaction. High risks or unfavorable valuation."
    : "Maintain tracking position. Awaiting more favorable entries.";

  return (
    <div className="report-container">
      {/* Action Bar */}
      <div className="action-bar">
        <button className="action-btn" onClick={handleCopyReport}>
          {copied ? <Check size={16} className="text-emerald-400" /> : <Copy size={16} />}
          <span>{copied ? "Copied!" : "Copy Full Report"}</span>
        </button>
      </div>

      {/* Decision Summary Card */}
      <div className={`decision-card ${decisionClass} glass-panel`}>
        <div className="decision-meta">
          <span className="company-badge">
            {ticker ? `${ticker} · ${sector}` : sector}
          </span>
          <div className="decision-heading">{decisionLabel}</div>
          <div className="decision-tagline">{tagline}</div>
        </div>

        {/* Confidence Widget */}
        <div className="confidence-widget">
          <span className="confidence-label">Agent Confidence</span>
          <div className="confidence-score">{confidence}%</div>
          <div className="progress-bar-bg mt-2">
            <div className="progress-bar-fill" style={{ width: `${confidence}%` }} />
          </div>
          <div className="text-[10px] text-slate-400 mt-2">
            Rating: <span className="font-semibold text-white">{rating}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs-header">
        <button 
          className={`tab-btn ${activeTab === "thesis" ? "active" : ""}`}
          onClick={() => setActiveTab("thesis")}
        >
          <BookOpen size={16} className="inline mr-2" />
          Investment Thesis
        </button>
        <button 
          className={`tab-btn ${activeTab === "financials" ? "active" : ""}`}
          onClick={() => setActiveTab("financials")}
        >
          <TrendingUp size={16} className="inline mr-2" />
          Financial Health
        </button>
        <button 
          className={`tab-btn ${activeTab === "news" ? "active" : ""}`}
          onClick={() => setActiveTab("news")}
        >
          <Globe size={16} className="inline mr-2" />
          Market Intelligence
        </button>
        <button 
          className={`tab-btn ${activeTab === "risks" ? "active" : ""}`}
          onClick={() => setActiveTab("risks")}
        >
          <ShieldAlert size={16} className="inline mr-2" />
          Risk Ledger
        </button>
      </div>

      {/* Tab Contents */}
      <div className="tab-content">
        {activeTab === "thesis" && (
          <div className="glass-panel p-6">
            {renderMarkdown(report)}
          </div>
        )}

        {activeTab === "financials" && (
          <div className="glass-panel p-6 space-y-6">
            <h3 className="text-xl font-bold text-white mb-4">Quantitative Financial Snapshot</h3>
            {isPublic ? (
              <>
                <div className="financial-grid">
                  <div className="financial-card">
                    <div className="financial-card-label">Market Capitalization</div>
                    <div className="financial-card-value">{formatCurrency(financials.marketCap)}</div>
                  </div>
                  <div className="financial-card">
                    <div className="financial-card-label">Current Stock Price</div>
                    <div className="financial-card-value">{formatCurrency(financials.price)}</div>
                  </div>
                  <div className="financial-card">
                    <div className="financial-card-label">P/E Ratio (Trailing)</div>
                    <div className="financial-card-value">
                      {financials.peRatio ? financials.peRatio.toFixed(2) : "N/A"}
                    </div>
                  </div>
                  <div className="financial-card">
                    <div className="financial-card-label">YoY Revenue Growth</div>
                    <div className="financial-card-value">{formatPercent(financials.revenueGrowth)}</div>
                  </div>
                  <div className="financial-card">
                    <div className="financial-card-label">Net Profit Margin</div>
                    <div className="financial-card-value">{formatPercent(financials.profitMargins)}</div>
                  </div>
                  <div className="financial-card">
                    <div className="financial-card-label">Debt-to-Equity Ratio</div>
                    <div className="financial-card-value">
                      {financials.debtToEquity ? financials.debtToEquity.toFixed(2) : "N/A"}
                    </div>
                  </div>
                </div>

                <div className="data-table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Financial Parameter</th>
                        <th>Value Recorded</th>
                        <th>Analysis Stance</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Current Ratio (Liquidity)</td>
                        <td>{financials.currentRatio ? financials.currentRatio.toFixed(2) : "N/A"}</td>
                        <td>
                          <span className={`metric-badge ${
                            (financials.currentRatio || 0) >= 1.5 ? "good" : (financials.currentRatio || 0) >= 1.0 ? "neutral" : "bad"
                          }`}>
                            {(financials.currentRatio || 0) >= 1.2 ? "Healthy Liquidity" : "Low liquidity"}
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td>Earnings Per Share (EPS)</td>
                        <td>${financials.eps ? financials.eps.toFixed(2) : "N/A"}</td>
                        <td>
                          <span className={`metric-badge ${
                            (financials.eps || 0) > 0 ? "good" : "bad"
                          }`}>
                            {(financials.eps || 0) > 0 ? "Profitable EPS" : "Negative EPS"}
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td>Dividend Yield</td>
                        <td>{formatPercent(financials.dividendYield)}</td>
                        <td>
                          <span className="metric-badge neutral">
                            {(financials.dividendYield || 0) > 0 ? "Income Generating" : "Growth Allocating"}
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td>Analyst Target Recommendation Mean</td>
                        <td>{formatRecommendation(financials.recommendationMean)}</td>
                        <td>
                          <span className={`metric-badge ${
                            (financials.recommendationMean || 3) <= 2.2 ? "good" : (financials.recommendationMean || 3) <= 3.2 ? "neutral" : "bad"
                          }`}>
                            {(financials.recommendationMean || 3) <= 2.5 ? "Wall Street Buy Stance" : "Hold/Sell Consensus"}
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {financials.analysis && (
                  <div className="mt-6 border-t border-slate-800 pt-6">
                    <h4 className="text-lg font-bold text-white mb-3">Equity Analyst Analysis</h4>
                    {renderMarkdown(financials.analysis)}
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-12 text-slate-400">
                <ShieldAlert size={48} className="mx-auto text-amber-500 mb-4 opacity-75" />
                <p className="font-semibold text-white mb-2">Private Company Directory Mode</p>
                <p className="text-sm max-width-md mx-auto">
                  Detailed public quantitative filings and SEC financials are unavailable for this entity. Research has proceeded using qualitative market footprints, fundings, and industry statistics.
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === "news" && (
          <div className="glass-panel p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h3 className="text-xl font-bold text-white">Market Sentiment & News</h3>
              <span className={`px-3 py-1 rounded text-xs font-bold uppercase tracking-wider ${
                news && news.length > 0 && news[0] && news[0].toLowerCase().includes("bullish") 
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                  : news && news.length > 0 && news[0] && news[0].toLowerCase().includes("bearish")
                  ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                  : "bg-slate-500/10 text-slate-400 border border-slate-500/20"
              }`}>
                {news && news.length > 0 && news[0] && news[0].toLowerCase().includes("bullish") 
                  ? "Bullish Sentiment" 
                  : news && news.length > 0 && news[0] && news[0].toLowerCase().includes("bearish")
                  ? "Bearish Sentiment"
                  : "Neutral Sentiment"}
              </span>
            </div>
            
            {news && news.length > 0 ? (
              news.map((nText, i) => (
                <div key={i} className="text-slate-300">
                  {renderMarkdown(nText)}
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-slate-400">
                <p>No recent news developments recorded.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "risks" && (
          <div className="glass-panel p-6 space-y-4">
            <h3 className="text-xl font-bold text-white mb-4">Downside Exposure & Risk Ledger</h3>
            <div className="border border-rose-500/15 bg-rose-500/5 rounded-lg p-4 mb-6">
              <p className="text-xs text-rose-400 font-semibold uppercase tracking-wider mb-1 flex items-center gap-2">
                <ShieldAlert size={14} /> Risk Warning
              </p>
              <p className="text-sm text-slate-300">
                The risks listed below were identified by the Risk Officer agent as top vulnerabilities that could challenge the investment thesis. Perform additional due diligence before committing capital.
              </p>
            </div>

            <div className="space-y-3">
              {risks && risks.length > 0 ? (
                risks.map((risk, index) => {
                  const cleanedRisk = risk ? risk.replace(/^(\d+\.|\-)\s*/, "") : "";
                  return (
                    <div key={index} className="flex gap-3 bg-black/25 p-3 rounded-lg border border-slate-900">
                      <span className="w-6 h-6 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center justify-center font-bold flex-shrink-0">
                        {index + 1}
                      </span>
                      <p className="text-sm text-slate-300 leading-relaxed font-medium">
                        {cleanedRisk}
                      </p>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-12 text-slate-400">
                  <p>No risk factors recorded.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

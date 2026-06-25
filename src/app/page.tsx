"use client";

import React, { useState } from "react";
import { Search, Info, HelpCircle } from "lucide-react";
import AgentMonitor from "../components/AgentMonitor";
import ReportViewer from "../components/ReportViewer";

interface LogEntry {
  timestamp: string;
  agent: string;
  message: string;
  type?: "info" | "success" | "system";
}

export default function Dashboard() {
  const [companyName, setCompanyName] = useState("");
  const [status, setStatus] = useState<"idle" | "running" | "completed" | "error">("idle");
  const [error, setError] = useState("");
  const [currentAgent, setCurrentAgent] = useState("");
  const [completedNodes, setCompletedNodes] = useState<string[]>([]);
  const [ticker, setTicker] = useState("");
  const [isPublic, setIsPublic] = useState<boolean | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  
  // Final report details
  const [reportData, setReportData] = useState<any>(null);

  const suggestions = [
    { name: "Apple", ticker: "AAPL" },
    { name: "Tesla", ticker: "TSLA" },
    { name: "Nvidia", ticker: "NVDA" },
    { name: "OpenAI", ticker: "Private" },
    { name: "Reliance Industries", ticker: "RELIANCE.NS" }
  ];

  const addLog = (agent: string, message: string, type?: "info" | "success" | "system") => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs((prev) => [...prev, { timestamp, agent, message, type }]);
  };

  const handleSearch = async (nameToSearch: string) => {
    if (!nameToSearch.trim()) return;

    // Reset State
    setStatus("running");
    setError("");
    setLogs([]);
    setReportData(null);
    setTicker("");
    setIsPublic(null);
    setCurrentAgent("tickerMatcher");
    setCompletedNodes([]);

    addLog("System", `Initiating investment research request for "${nameToSearch}"...`, "system");

    try {
      const response = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName: nameToSearch }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `Server responded with status ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("Response body is not readable.");
      }

      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        
        // Split buffer by double newlines to isolate Server-Sent Events
        const parts = buffer.split("\n\n");
        // Keep the last part in the buffer (might be incomplete)
        buffer = parts.pop() || "";

        for (const part of parts) {
          const trimmed = part.trim();
          if (!trimmed) continue;

          // Parse SSE fields
          const lines = trimmed.split("\n");
          let eventName = "";
          let dataStr = "";

          for (const line of lines) {
            if (line.startsWith("event:")) {
              eventName = line.slice(6).trim();
            } else if (line.startsWith("data:")) {
              dataStr = line.slice(5).trim();
            }
          }

          if (dataStr) {
            try {
              const data = JSON.parse(dataStr);

              if (eventName === "progress") {
                setCurrentAgent(data.currentAgent || "");
                if (data.completedNodes) setCompletedNodes(data.completedNodes);
                if (data.ticker) setTicker(data.ticker);
                if (data.isPublic !== undefined) setIsPublic(data.isPublic);
                
                // Add the log
                addLog(data.agent, data.log, data.currentAgent === "Complete" ? "success" : "info");
              } else if (eventName === "complete") {
                setReportData(data);
                setTicker(data.ticker || "");
                setIsPublic(data.isPublic);
                setCurrentAgent("Complete");
                setCompletedNodes(prev => {
                  const updated = [...prev];
                  if (!updated.includes("investmentCommittee")) {
                    updated.push("investmentCommittee");
                  }
                  return updated;
                });
                setStatus("completed");
                addLog("System", "Research workflow terminated successfully. Report generated.", "success");
              } else if (eventName === "error") {
                setError(data.message || "An error occurred during execution.");
                setStatus("error");
                addLog("System", `Execution halted with error: ${data.message}`, "system");
              }
            } catch (parseErr) {
              console.error("Error parsing chunk payload:", parseErr, dataStr);
            }
          }
        }
      }

    } catch (err: any) {
      console.error("Fetch/Stream error:", err);
      setError(err.message || "Unable to contact research API server.");
      setStatus("error");
      addLog("System", `API Error: ${err.message || "Connection refused."}`, "system");
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch(companyName);
  };

  return (
    <div className="app-container min-h-screen flex flex-col justify-between">
      <header className="mb-6">
        <h1 className="app-title">Insight Invest™</h1>
        <p className="app-subtitle">
          Smart Investment Research System. Instantly scrape, analyze financials, assess risks, and draft professional investment theses for public and private entities.
        </p>
      </header>

      <main className="flex-grow">
        {/* Search Panel */}
        <section className="glass-panel search-container">
          <form onSubmit={handleFormSubmit} className="search-form">
            <div className="search-input-wrapper">
              <Search className="search-icon" size={20} />
              <input
                type="text"
                placeholder="Enter company name (e.g. Microsoft, Tesla, OpenAI...)"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                disabled={status === "running"}
                className="search-input"
              />
            </div>
            <button 
              type="submit" 
              disabled={status === "running" || !companyName.trim()}
              className="search-button"
            >
              Analyze Company
            </button>
          </form>

          {/* Quick Suggestions */}
          <div className="suggestions-list">
            <span className="suggestion-label">Suggestions:</span>
            {suggestions.map((sug) => (
              <button
                key={sug.name}
                type="button"
                onClick={() => {
                  setCompanyName(sug.name);
                  handleSearch(sug.name);
                }}
                disabled={status === "running"}
                className="suggestion-chip"
              >
                {sug.name} <span className="text-[10px] opacity-60">({sug.ticker})</span>
              </button>
            ))}
          </div>
        </section>

        {/* Error Alert */}
        {error && (
          <div className="bg-rose-500/10 border border-rose-500/25 text-rose-300 px-4 py-3 rounded-lg mb-6 text-sm flex items-start gap-2">
            <Info size={16} className="mt-0.5 flex-shrink-0" />
            <div>
              <span className="font-bold">Research Error: </span>
              {error}
            </div>
          </div>
        )}

        {/* Agent Monitor Panel */}
        <AgentMonitor
          currentAgent={currentAgent}
          completedNodes={completedNodes}
          logs={logs}
          isPublic={isPublic}
          ticker={ticker}
          status={status}
        />

        {/* Final Report Viewer */}
        {status === "completed" && reportData && (
          <ReportViewer
            report={reportData.report}
            decision={reportData.decision}
            rating={reportData.rating}
            confidence={reportData.confidence}
            isPublic={reportData.isPublic}
            ticker={reportData.ticker}
            sector={reportData.sector}
            industry={reportData.industry}
            financials={reportData.financials}
            news={reportData.news}
            risks={reportData.risks}
          />
        )}
      </main>

      <footer>
        <p>
          Insight Invest™ © 2026. Built with Next.js App Router, LangGraph.js, Yahoo Finance, and Google Gemini.
        </p>
      </footer>
    </div>
  );
}

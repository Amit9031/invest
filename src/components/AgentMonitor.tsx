import React, { useEffect, useRef } from "react";
import { 
  Search, 
  TrendingUp, 
  Globe, 
  AlertTriangle, 
  Briefcase, 
  Terminal,
  CheckCircle,
  Loader2
} from "lucide-react";

interface AgentMonitorProps {
  currentAgent: string; // "tickerMatcher" | "financialAnalyst" | "webResearcher" | "riskAnalyst" | "investmentCommittee" | "Complete" | ""
  completedNodes: string[];
  logs: Array<{ timestamp: string; agent: string; message: string; type?: "info" | "success" | "system" }>;
  isPublic: boolean | null;
  ticker: string;
  status: "idle" | "running" | "completed" | "error";
}

export default function AgentMonitor({ currentAgent, completedNodes = [], logs, isPublic, ticker, status }: AgentMonitorProps) {
  const consoleEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll console to bottom when new logs arrive
  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  // Define the workflow steps
  const steps = [
    {
      id: "tickerMatcher",
      name: "Ticker Matcher",
      icon: Search,
      desc: "Resolving stock tickers",
      skipCondition: false
    },
    {
      id: "financialAnalyst",
      name: "Financial Analyst",
      icon: TrendingUp,
      desc: "Analyzing quantitative metrics",
      skipCondition: isPublic === false // Skip if company is private
    },
    {
      id: "webResearcher",
      name: "Web News Researcher",
      icon: Globe,
      desc: "Gathering news & sentiment",
      skipCondition: false
    },
    {
      id: "riskAnalyst",
      name: "Risk Analyst",
      icon: AlertTriangle,
      desc: "Identifying structural risks",
      skipCondition: false
    },
    {
      id: "investmentCommittee",
      name: "Investment Committee",
      icon: Briefcase,
      desc: "Voting & writing final thesis",
      skipCondition: false
    }
  ];

  // Helper to determine the visual class of a node
  const getNodeClass = (stepId: string, index: number) => {
    if (status === "idle") return "";
    
    // Check if skipped
    const step = steps[index];
    if (step.skipCondition) return "skipped";

    if (currentAgent === "Complete" && status === "completed") {
      return "completed";
    }

    if (completedNodes.includes(stepId)) {
      return "completed";
    }

    // Determine if it is currently active.
    const isTickerMatcherCompleted = completedNodes.includes("tickerMatcher");
    if (isTickerMatcherCompleted) {
      if (stepId === "investmentCommittee") {
        // Investment committee is active only if all preceding non-skipped nodes are completed.
        const precedingSteps = steps.slice(1, 4); // financialAnalyst, webResearcher, riskAnalyst
        const allPrecedingDone = precedingSteps.every(s => s.skipCondition || completedNodes.includes(s.id));
        return allPrecedingDone ? "active" : "";
      }
      // If it's one of the parallel nodes, it is active if it's not completed yet.
      if (["financialAnalyst", "webResearcher", "riskAnalyst"].includes(stepId)) {
        return "active";
      }
    } else {
      // If tickerMatcher is not completed, it is active.
      if (stepId === "tickerMatcher") {
        return "active";
      }
    }

    return "";
  };

  const getStatusText = () => {
    switch (status) {
      case "running":
        return "Research Agents Active...";
      case "completed":
        return "Analysis Complete";
      case "error":
        return "Execution Halted";
      default:
        return "Standby";
    }
  };

  if (status === "idle") return null;

  return (
    <div className="glass-panel monitor-container">
      <div className="monitor-header">
        <div className="monitor-title">
          {status === "running" ? (
            <Loader2 className="animate-spin text-cyan-400" size={20} />
          ) : (
            <CheckCircle className="text-emerald-400" size={20} />
          )}
          <span>{getStatusText()}</span>
        </div>
        <div className="monitor-status">
          {ticker ? `Ticker: ${ticker}` : isPublic === false ? "Private Company" : "Matching entity..."}
        </div>
      </div>

      {/* Agent Nodes Graph */}
      <div className="agent-graph">
        {steps.map((step, idx) => {
          const nodeClass = getNodeClass(step.id, idx);
          const Icon = step.icon;
          const isSkipped = step.skipCondition;

          return (
            <div 
              key={step.id} 
              className={`agent-node ${nodeClass}`}
              style={{ opacity: isSkipped ? 0.35 : 1 }}
            >
              <div className="agent-node-icon">
                <Icon size={20} />
              </div>
              <div className="agent-node-name">{step.name}</div>
              <div className="agent-node-status">
                {isSkipped ? (
                  "Bypassed"
                ) : nodeClass === "active" ? (
                  <span className="text-cyan-400 font-medium">Running...</span>
                ) : nodeClass === "completed" ? (
                  <span className="text-purple-400 font-medium">Done</span>
                ) : (
                  "Queued"
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Terminal Console */}
      <div className="console-box">
        <div className="flex items-center gap-2 text-slate-500 mb-2 border-b border-slate-900 pb-2">
          <Terminal size={14} />
          <span className="text-xs uppercase tracking-wider font-semibold">Live Research Logs</span>
        </div>
        {logs.map((log, index) => (
          <div 
            key={index} 
            className={`console-line ${
              log.type === "success" ? "success" : log.type === "system" ? "system" : ""
            }`}
          >
            <span className="console-timestamp">[{log.timestamp}]</span>
            <span className="console-message">
              <strong>{log.agent}:</strong> {log.message}
            </span>
          </div>
        ))}
        <div ref={consoleEndRef} />
      </div>
    </div>
  );
}

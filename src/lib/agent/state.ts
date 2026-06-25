import { Annotation } from "@langchain/langgraph";

export interface FinancialData {
  summary?: string;
  price?: number;
  marketCap?: number;
  peRatio?: number;
  dividendYield?: number;
  eps?: number;
  profitMargins?: number;
  revenueGrowth?: number;
  debtToEquity?: number;
  currentRatio?: number;
  freeCashFlow?: number;
  recommendationMean?: number;
  analysis?: string;
  financialsRaw?: any;
}

export const ResearchStateAnnotation = Annotation.Root({
  companyName: Annotation<string>,
  ticker: Annotation<string>,
  sector: Annotation<string>,
  industry: Annotation<string>,
  isPublic: Annotation<boolean>,
  financials: Annotation<FinancialData>,
  news: Annotation<string[]>,
  sentiment: Annotation<string>,
  risks: Annotation<string[]>,
  report: Annotation<string>,
  decision: Annotation<'INVEST' | 'PASS' | 'HOLD'>,
  rating: Annotation<string>,
  confidence: Annotation<number>, // 0-100
  logs: Annotation<string[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
  currentAgent: Annotation<string>({
    reducer: (x, y) => {
      if (!x) return y;
      if (!y) return x;
      const order = ["tickerMatcher", "financialAnalyst", "webResearcher", "riskAnalyst", "investmentCommittee", "Complete"];
      const normalize = (name: string) => {
        if (name === "Financial Analyst") return "financialAnalyst";
        if (name === "Web News Researcher" || name === "Web Researcher") return "webResearcher";
        if (name === "Risk Analyst") return "riskAnalyst";
        if (name === "Investment Committee") return "investmentCommittee";
        return name;
      };
      const normX = normalize(x);
      const normY = normalize(y);
      return order.indexOf(normY) > order.indexOf(normX) ? y : x;
    },
    default: () => "tickerMatcher",
  }),
});

export type ResearchState = typeof ResearchStateAnnotation.State;

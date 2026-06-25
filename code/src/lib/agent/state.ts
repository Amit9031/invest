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
  currentAgent: Annotation<string>,
});

export type ResearchState = typeof ResearchStateAnnotation.State;

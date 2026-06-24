import { StateGraph, START, END } from "@langchain/langgraph";
import { ResearchStateAnnotation } from "./state";
import {
  tickerMatcherNode,
  financialAnalystNode,
  webResearcherNode,
  riskAnalystNode,
  investmentCommitteeNode,
} from "./nodes";

// Build the state graph
const workflow = new StateGraph(ResearchStateAnnotation)
  // Add nodes
  .addNode("tickerMatcher", tickerMatcherNode)
  .addNode("financialAnalyst", financialAnalystNode)
  .addNode("webResearcher", webResearcherNode)
  .addNode("riskAnalyst", riskAnalystNode)
  .addNode("investmentCommittee", investmentCommitteeNode)

  // Set the entry point
  .addEdge(START, "tickerMatcher");

// Add conditional edge from tickerMatcher
// If it is a public company, analyze financials. Otherwise, skip to web news search.
workflow.addConditionalEdges(
  "tickerMatcher",
  (state) => {
    return state.isPublic ? "financialAnalyst" : "webResearcher";
  },
  {
    financialAnalyst: "financialAnalyst",
    webResearcher: "webResearcher",
  }
);

// Connect the remaining nodes in sequence
workflow.addEdge("financialAnalyst", "webResearcher");
workflow.addEdge("webResearcher", "riskAnalyst");
workflow.addEdge("riskAnalyst", "investmentCommittee");
workflow.addEdge("investmentCommittee", END);

// Compile the graph
export const graph = workflow.compile();

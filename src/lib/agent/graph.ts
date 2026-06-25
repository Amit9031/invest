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

// Connect the entry point
workflow.addEdge(START, "tickerMatcher");

// Fan-out from tickerMatcher to all analysis nodes in parallel
workflow.addEdge("tickerMatcher", "financialAnalyst");
workflow.addEdge("tickerMatcher", "webResearcher");
workflow.addEdge("tickerMatcher", "riskAnalyst");

// Fan-in from all analysis nodes to the Investment Committee
workflow.addEdge("financialAnalyst", "investmentCommittee");
workflow.addEdge("webResearcher", "investmentCommittee");
workflow.addEdge("riskAnalyst", "investmentCommittee");

workflow.addEdge("investmentCommittee", END);

// Compile the graph
export const graph = workflow.compile();

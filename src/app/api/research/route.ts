import { NextRequest } from "next/server";
import { graph } from "@/lib/agent/graph";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { companyName } = await req.json();

    if (!companyName || typeof companyName !== "string" || !companyName.trim()) {
      return new Response(JSON.stringify({ error: "Company name is required." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const encoder = new TextEncoder();
    
    // Set up Server-Sent Events (SSE) stream
    const customReadableStream = new ReadableStream({
      async start(controller) {
        // Helper to send events in SSE format
        const sendEvent = (event: string, data: any) => {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          );
        };

        try {
          console.log(`Starting research stream for: "${companyName}"`);
          
          sendEvent("progress", {
            agent: "System",
            log: `Initializing research nodes for "${companyName}"...`,
            currentAgent: "tickerMatcher",
          });

          // Run LangGraph streaming
          const eventStream = await graph.stream(
            { companyName: companyName.trim() },
            { streamMode: "updates" }
          );

          let finalState: any = {};

          for await (const update of eventStream) {
            // update has the format { [nodeName]: statePatch }
            const nodeNames = Object.keys(update);
            for (const nodeName of nodeNames) {
              const statePatch = (update as any)[nodeName];
              
              // Accumulate final state changes
              finalState = { ...finalState, ...statePatch };

              // Extract new logs if any
              const newLogs = statePatch.logs || [];
              const lastLog = newLogs[newLogs.length - 1] || `${nodeName} completed analysis.`;

              // Map nodeName to user friendly name for display
              let friendlyName = nodeName;
              if (nodeName === "tickerMatcher") friendlyName = "Ticker Matcher";
              else if (nodeName === "financialAnalyst") friendlyName = "Financial Analyst";
              else if (nodeName === "webResearcher") friendlyName = "Web News Researcher";
              else if (nodeName === "riskAnalyst") friendlyName = "Risk Analyst";
              else if (nodeName === "investmentCommittee") friendlyName = "Investment Committee";

              sendEvent("progress", {
                agent: friendlyName,
                log: lastLog,
                currentAgent: statePatch.currentAgent || finalState.currentAgent,
                ticker: finalState.ticker,
                isPublic: finalState.isPublic,
              });
            }
          }

          // Send final completion event with all compiled data
          sendEvent("complete", {
            decision: finalState.decision || "PASS",
            rating: finalState.rating || "Hold",
            confidence: finalState.confidence || 50,
            report: finalState.report || "Error generating report.",
            ticker: finalState.ticker,
            isPublic: finalState.isPublic,
            sector: finalState.sector,
            industry: finalState.industry,
            financials: finalState.financials,
            news: finalState.news,
            risks: finalState.risks,
          });

        } catch (error: any) {
          console.error("Error during LangGraph execution:", error);
          sendEvent("error", {
            message: error.message || "An internal error occurred during the research process.",
          });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(customReadableStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });

  } catch (error: any) {
    console.error("Request error in API route:", error);
    return new Response(JSON.stringify({ error: "Invalid request payload." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
}

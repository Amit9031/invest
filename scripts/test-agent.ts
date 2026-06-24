import * as dotenv from "dotenv";
import path from "path";
import { graph } from "../src/lib/agent/graph";

// Load environment variables from .env.local or .env
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

async function main() {
  const companyName = process.argv[2];
  if (!companyName) {
    console.error("Error: Please provide a company name as an argument.");
    console.error("Usage: npx tsx scripts/test-agent.ts \"Company Name\"");
    process.exit(1);
  }

  console.log(`\n======================================================`);
  console.log(`   Insight Invest - CLI RESEARCH RUNNER`);
  console.log(`   Researching: "${companyName}"`);
  console.log(`======================================================\n`);

  try {
    const stream = await graph.stream(
      { companyName: companyName.trim() },
      { streamMode: "updates" }
    );

    let finalState: any = {};

    for await (const update of stream) {
      const nodeNames = Object.keys(update);
      for (const node of nodeNames) {
        const statePatch = (update as any)[node];
        finalState = { ...finalState, ...statePatch };

        const newLogs = statePatch.logs || [];
        const lastLog = newLogs[newLogs.length - 1];

        if (lastLog) {
          console.log(`[${node.toUpperCase()}] ${lastLog}`);
        }
      }
    }

    console.log(`\n======================================================`);
    console.log(`   FINAL DECISION: ${finalState.decision}`);
    console.log(`   RATING: ${finalState.rating}`);
    console.log(`   CONFIDENCE: ${finalState.confidence}%`);
    console.log(`======================================================\n`);
    
    console.log("   --- COMPILED THESIS REPORT ---\n");
    console.log(finalState.report);
    console.log(`======================================================\n`);

  } catch (error) {
    console.error("Agent execution failed:", error);
    process.exit(1);
  }
}

main();

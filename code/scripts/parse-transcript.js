const fs = require("fs");
const path = require("path");
const readline = require("readline");

// Paths
const conversationId = "75ad19c8-00a3-4d86-b1d6-9c1e608fa097";
const appDataDir = "C:\\Users\\Amit Ranjan\\.gemini\\Insight";
const transcriptPath = path.join(appDataDir, "brain", conversationId, ".system_generated", "logs", "transcript.jsonl");
const outputPath = path.join(__dirname, "..", "chat_history.md");

async function parseTranscript() {
  if (!fs.existsSync(transcriptPath)) {
    console.error(`Error: Transcript file not found at ${transcriptPath}`);
    process.exit(1);
  }

  console.log(`Reading transcript from: ${transcriptPath}`);
  console.log(`Writing formatted history to: ${outputPath}`);

  const fileStream = fs.createReadStream(transcriptPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  let markdown = `# Insight Invest - Development Chat History\n\n`;
  markdown += `This file contains the complete, chronological chat transcript logs between the developer and the analyst (**Insight**) during the construction of this assignment. This log is provided for the BONUS points request.\n\n---\n\n`;

  let messageCount = 0;

  for await (const line of rl) {
    if (!line.trim()) continue;
    try {
      const data = JSON.parse(line);
      
      // User message
      if (data.source === "USER_EXPLICIT" && data.type === "USER_INPUT") {
        let content = data.content || "";
        
        // Clean user request tags
        content = content.replace(/<USER_REQUEST>([\s\S]*?)<\/USER_REQUEST>/, "$1").trim();
        // Remove settings details or metadata if they clutter the log
        content = content.split("<ADDITIONAL_METADATA>")[0].trim();
        content = content.split("<USER_SETTINGS_CHANGE>")[0].trim();

        markdown += `### 👤 User (Amit Ranjan)\n\n`;
        markdown += `${content}\n\n`;
        markdown += `---\n\n`;
        messageCount++;
      }
      
      // Agent message
      else if (data.source === "MODEL" && data.type === "PLANNER_RESPONSE") {
        const content = data.content || "";
        if (!content.trim()) continue;

        markdown += `### 🤖 Insight Analyst\n\n`;
        markdown += `${content}\n\n`;
        
        // Check if there was thinking details
        if (data.thinking) {
          // Optional: Add thinking summary or skip to keep it clean. Let's just keep it simple.
        }

        markdown += `---\n\n`;
        messageCount++;
      }
    } catch (err) {
      console.error("Error parsing line:", err);
    }
  }

  fs.writeFileSync(outputPath, markdown, "utf8");
  console.log(`Successfully formatted ${messageCount} dialogue turns into ${outputPath}!`);
}

parseTranscript();

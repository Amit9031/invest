import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatOpenAI } from "@langchain/openai";
import { BaseChatModel } from "@langchain/core/language_models/chat_models";

export function getLLM(): BaseChatModel {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  const openaiApiKey = process.env.OPENAI_API_KEY;

  if (geminiApiKey) {
    return new ChatGoogleGenerativeAI({
      model: "gemini-2.5-flash",
      temperature: 0.1,
      maxOutputTokens: 2048,
      apiKey: geminiApiKey,
      maxRetries: 0,
    });
  } else if (openaiApiKey) {
    return new ChatOpenAI({
      model: "gpt-4o-mini",
      temperature: 0.1,
      apiKey: openaiApiKey,
      maxRetries: 0,
    });
  } else {
    // If no key is set, we still return a placeholder so the build compiles.
    // In runtime, this will fail gracefully or fallback. We will log a warning.
    console.warn("WARNING: No LLM API keys found in environment variables. Falling back to mock/Gemini default.");
    return new ChatGoogleGenerativeAI({
      model: "gemini-2.5-flash",
      temperature: 0.1,
      apiKey: "placeholder",
      maxRetries: 0,
    });
  }
}

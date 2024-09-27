import { MistralAI } from "@langchain/mistralai";
import * as dotenv from 'dotenv';
dotenv.config();

const llm = new MistralAI({
  apiKey: process.env.MISTRAL_API_KEY, // Add your API key here
  model: "codestral-latest",
  temperature: 0,
  maxTokens: 1,
  maxRetries: 2,
  // other params...
});

const inputText = "MistralAI is an AI company that ";

async function run() {
  try {
    const completion = await llm.invoke(inputText);
    console.log(completion);
  } catch (error) {
    console.error("Error:", error);
  }
}

run();
import { MistralAI } from "@langchain/mistralai";
import * as dotenv from 'dotenv';
dotenv.config();

const llm = new MistralAI({
  apiKey: process.env.MISTRAL_API_KEY, // Add your API key here
  model: "codestral-latest",
  temperature: 0,
  maxTokens: 30,
  maxRetries: 2,
  verbose:true
  // other params...
});

const inputText = "What is the capital of India?";

async function run() {
  try {
    const completion = await llm.invoke(inputText);
    console.log(completion);
  } catch (error) {
    console.error("Error:", error);
  }
}

run();
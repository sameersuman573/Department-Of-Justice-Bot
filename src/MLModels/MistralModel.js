
import { ChatMistralAI } from "@langchain/mistralai";
import * as dotenv from 'dotenv';
dotenv.config();

export const LLM = new ChatMistralAI({
    model: "mistral-large-latest",
    apiKey: process.env.MISTRAL_API_KEY,
    temperature: 0.5,
    maxRetries: 2,
    maxTokens:150,
  }); 
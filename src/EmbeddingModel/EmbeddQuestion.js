import { NomicEmbeddings } from "@langchain/nomic";




export const EmbeddQuestion = new NomicEmbeddings({
    apiKey: process.env.NOMIC_API_KEY,
    inputType: "question"
  });
import { NomicEmbeddings } from "@langchain/nomic";




export const embeddingGenerator = new NomicEmbeddings({
    apiKey: process.env.NOMIC_API_KEY,  // Use your Nomic API key
    inputType: "document",  // Ensure the input type is "document" for embedding documents
});


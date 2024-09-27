import * as dotenv from 'dotenv';
dotenv.config();

import { MistralAI } from "@langchain/mistralai";
import { SearchApiLoader } from "@langchain/community/document_loaders/web/searchapi";

// Initialize the MistralAI model
const llm = new MistralAI({
    temperature: 0,
    maxTokens: 150,
    maxRetries: 2,
    apiKey: process.env.MISTRAL_API_KEY,
});

const query = "number of judges appointed at the Supreme Court";  // User-defined search query

// Define a prompt template for summarizing information
const promptTemplate = (snippets) => `
Based on the following information, please summarize the current composition of the Supreme Court of India:
${snippets.join("\n")}
Please provide a concise summary in English.
`;

// Function to split text into chunks
function splitText(text, chunkSize) {
    const chunks = [];
    for (let i = 0; i < text.length; i += chunkSize) {
        chunks.push(text.slice(i, i + chunkSize));
    }
    return chunks;
}

async function main() {
    try {
        // Use SearchApiLoader to load web search results
        const loader = new SearchApiLoader({ 
            q: query, 
            apiKey: process.env.SEARCH_API_KEY,
            engine: "google",
            timeout: 50000,
            hl: 'en',
            gl: 'in'
        });

        const docs = await loader.load();  // Load documents from SERP API

        // Extract relevant content from the loaded documents
        const snippets = docs.map(doc => {
            try {
                const content = JSON.parse(doc.pageContent);
                return `${content.title}: ${content.snippet}`;
            } catch (error) {
                console.error("Error parsing document content:", error);
                return "";  // Return empty if there's an error
            }
        }).filter(snippet => snippet.length > 0);  // Filter out empty snippets

        // Log the extracted snippets for debugging
        console.log("Extracted snippets:", snippets);

        // Check if snippets are empty
        if (snippets.length === 0) {
            console.warn("No valid snippets found. Exiting...");
            return;
        }

        // Combine all snippets into a single string
        const combinedSnippets = snippets.join("\n");

        // Split the combined snippets into smaller chunks
        const chunkSize = 1000;  // Define the chunk size
        const chunks = splitText(combinedSnippets, chunkSize);

        let combinedResponses = "";

        // Process each chunk individually
        for (let chunk of chunks) {
            const llmInput = promptTemplate([chunk]);
            console.log("Input to LLM:", llmInput);

            // Generate summary using the LLM
            const response = await llm.invoke({ input: llmInput });

            // Log the raw response from the LLM for debugging
            console.log("LLM Response:", response);

            // Combine the responses
            combinedResponses += response + "\n";
        }

        // Print only the final combined summary
        console.log("Final Summary:", combinedResponses);
        
    } catch (error) {
        console.error("Error occurred during the web search:", error);
    }
}

// Execute the main function
main();
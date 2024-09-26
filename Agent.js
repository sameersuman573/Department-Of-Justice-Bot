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

async function main() {
    try {
        // Use SearchApiLoader to load web search results
        const loader = new SearchApiLoader({ 
            q: query, 
            apiKey: process.env.SEARCH_API_KEY,
            engine: "google",
            timeout: 50000,
            hl: 'en',
            gl: 'us'
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

        // Format the input using the prompt template
        const llmInput = promptTemplate(snippets);
        console.log("Input to LLM:", llmInput);

        // Generate summary using the LLM
        const answer = await llm.invoke({ input: llmInput });

        // Log the raw response from the LLM for debugging
        console.log("LLM Response:", answer);

        // Print only the final summary
        console.log("Final Summary:", answer);
        
    } catch (error) {
        console.error("Error occurred during the web search:", error);
    }
}

// Execute the main function
main();

import { ChatMistralAI } from "@langchain/mistralai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { VoyageEmbeddings } from "@langchain/community/embeddings/voyage";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import * as dotenv from 'dotenv';
import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";

dotenv.config();

// Initialize ChatMistralAI
const llm = new ChatMistralAI({
  model: "mistral-large-latest",
  apiKey: process.env.MISTRAL_API_KEY,
  temperature: 0,
  maxRetries: 2,
  maxTokens: 10,
});

// Initialize VoyageEmbeddings
const embeddings = new VoyageEmbeddings({
  apiKey: process.env.VOYAGE_API_KEY,
  inputType: "document", // Specify input type
});

// Initialize MemoryVectorStore
const vectorStore = new MemoryVectorStore(embeddings);

// Define a Chat Prompt Template
const promptTemplate = ChatPromptTemplate.fromMessages([
  ["system", "You are a helpful assistant that helps people in the Department of Justice to solve their queries regarding cases."],
  ["human", "{input}"],
]);

// Function to scrape content from a webpage using Cheerio
async function ScrapeContent(url) {
  const loader = new CheerioWebBaseLoader(url, { selector: "p, h1, h2, h3" });
  try {
    const mainContent = await loader.load();
    let combinedContent = mainContent.map(content => content.pageContent).join("\n");
    return combinedContent;
  } catch (error) {
    console.error("Error loading webpage:", error);
    return null;
  }
}

// Function to split content into chunks
async function SplitContent(content) {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 500,
    chunkOverlap: 50,
  });
  const res = await splitter.createDocuments([content]);
  console.log(res);
  return res;
}

// Function to add chunks to the vector store with retry logic
async function AddchunksToVectorStore(vectorStore, chunks) {
  try {
    const texts = chunks
      .map((chunk) => chunk.pageContent)
      .filter((content) => typeof content === "string" && content.trim().length > 0);

    console.log("Texts to add to vector store:", texts);

    if (!texts || texts.length === 0) {
      throw new Error("No valid text content found in chunks.");
    }

    const documents = texts.map(text => ({ pageContent: text }));
    console.log("Documents to embed:", documents);

    // Retry logic for adding documents to the vector store
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await vectorStore.addDocuments(documents);
        console.log("Chunks successfully added to the vector store.", res);
        return; // Exit after successful addition
      } catch (error) {
        console.error("Attempt failed, retrying...", error);
        if (attempt === 2) throw error; // Throw error after last attempt
      }
    }
  } catch (error) {
    console.error("Error adding chunks to vector store:", error);
  }
}

// Function to search relevant chunks from vector store based on user query
async function SearchRelevantChunks(vectorStore, question) {
  try {
    const embed = await embeddings.embedQuery(question);
    const res = await vectorStore.similaritySearch(question, 3);
    return res.map(chunk => chunk.document);
  } catch (error) {
    console.error("Error in searching relevant chunks:", error);
    return [];
  }
}

// Function to generate a response using the LLM
async function GetAnswers(question, relevantChunks) {
  const truncatedQuestion = question.slice(0, 200);

  const formattedMessages = await promptTemplate.formatMessages({
    input: `User's question: ${truncatedQuestion}\n\nHere is some relevant web content to help answer the question:\n${relevantChunks.join("\n")}\n\nPlease provide an answer based on this content.`,
  });

  try {
    const res = await llm.invoke(formattedMessages);
    return res;
  } catch (error) {
    console.error("Error invoking LLM:", error);
    return "Sorry, I couldn't generate an answer.";
  }
}

// Main function to orchestrate the workflow
async function main() {
  const question = "What does the Department of Justice primarily do?";
  const url = "https://doj.gov.in/home-1/";

  // Step 1: Scrape the content from the webpage
  const scrapedData = await ScrapeContent(url);
  console.log(scrapedData, "This is the scraped data");

  // Step 2: If valid scraped data is found, proceed with further steps
  if (scrapedData && scrapedData.length > 0) {
    // Step 3: Split the scraped content into chunks
    const chunks = await SplitContent(scrapedData);

    // Step 4: Add the chunks to the vector store
    await AddchunksToVectorStore(vectorStore, chunks);

    // Step 5: Search relevant chunks based on the user's question
    const relevantChunks = await SearchRelevantChunks(vectorStore, question);

    if (relevantChunks.length > 0) {
      // Step 6: Get answers based on the relevant chunks
      const answer = await GetAnswers(question, relevantChunks);
      console.log("Answer:", answer);
    } else {
      console.log("No relevant content found.");
    }
  } else {
    console.log("No content found from the webpage.");
  }
}

// Run the main function
main();

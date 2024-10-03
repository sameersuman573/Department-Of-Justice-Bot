// import { ChatMistralAI } from "@langchain/mistralai";
// import { ChatPromptTemplate } from "@langchain/core/prompts";
// // import { VoyageEmbeddings } from "@langchain/community/embeddings/voyage";
// import { MemoryVectorStore } from "langchain/vectorstores/memory";
// import * as dotenv from 'dotenv';
// import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
// import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
// import { asyncHandler } from "../Utils/AsyncHandler.js";
// import { ApiResponse } from "../Utils/ApiResponse.js";
// import { ApiError } from "../Utils/ApiError.util.js";
// import { NomicEmbeddings } from "@langchain/nomic";
// import { Document } from "@langchain/core/documents";

// dotenv.config();

// // Constant URL
// const URL = "https://doj.gov.in/";

// // Initialize ChatMistralAI
// const llm = new ChatMistralAI({
//   model: "mistral-large-latest",
//   apiKey: process.env.MISTRAL_API_KEY,
//   temperature: 0,
//   maxRetries: 2,
//   maxTokens: 500,
// });

// // Initialize VoyageEmbeddings
// const embeddings = new NomicEmbeddings({
//   apiKey: process.env.NOMIC_API_KEY,
//   inputType: "document", // Specify input type
// });

// // Initialize MemoryVectorStore
// const vectorStore = new MemoryVectorStore(embeddings);
// console.log(embeddings , "This is my embeddings" );



// // Define a Chat Prompt Template
// const promptTemplate = ChatPromptTemplate.fromMessages([
//   ["system", "You are a helpful assistant that helps people in the Department of Justice to solve their queries based on the content on the webpage."],
//   ["human", "{input}"],
// ]);


// // Function to scrape content from a webpage using Cheerio
// async function scrapeContent(url) {
//   const loader = new CheerioWebBaseLoader(url, { selector: "p, h1, h2, h3" });
//   try {
//     const mainContent = await loader.load();
//     let combinedContent = mainContent.map(content => content.pageContent).join("\n");
//     return combinedContent;
//   } catch (error) {
//     console.error("Error loading webpage:", error);
//     return null;
//   }
// }

// // Function to split content into chunks
// async function splitContent(content) {
//   const splitter = new RecursiveCharacterTextSplitter({
//     chunkSize: 500,
//     chunkOverlap: 200,
//   });
//   const res = await splitter.createDocuments([content]);
//   console.log(res);
//   return res;
// }

// // Function to add chunks to the vector store with retry logic
// async function addChunksToVectorStore(vectorStore, chunks) {
//  try { 

//   const validChunks = chunks.filter(chunk => 
//   typeof chunk.pageContent === 'string' && chunk.pageContent.trim().length>0
//   )

//   // now extarcting the valid chunks
//   const contents = validChunks.map(chunk => chunk.pageContent)
//   console.log("valid Chunks ------ Texts to add to vector store:", contents);
  
 
//   if( !Array.isArray(contents)|| contents.length === 0){
//     throw new ApiError(400, "No valid text content found in chunks.");
//   }


//   const embeddingArray = await embeddings.embedDocuments(contents)

//   const documentEmbedding = chunks.map((chunk , index) => ({
//     content: chunk.pageContent,
//     embedding: embeddingArray[index],
//     metadata: {
//       source:URL,
//       timestamp: new Date().toISOString(),
//     }
//   }))


//   // const document = await Promise.all(chunks.map( async (chunk) => {
//   //   const embedding = await embeddings.embedDocuments(chunk.pageContent)
//   //   console.log("Embedding:", embedding);
//   //   return {
//   //     content: chunk.pageContent,
//   //     embedding: embedding,
//   //     metadata: {
//   //       source:URL,
//   //       timestamp: new Date().toISOString(),
//   //     }
//   //   }
    
//   // }))

//    console.log("Document to add to vector store:", documentEmbedding);

//   if(!documentEmbedding || documentEmbedding.length === 0){
//     throw new ApiError(400, "No valid text content found in chunks.");
//   }
  
//   const res = await vectorStore.addDocuments(documentEmbedding);
//   console.log("Chunks successfully added to the vector store.", res);

//  } catch (error) {
//   console.error("Error adding chunks to vector store:", error);
//     throw error;
//  }
// }

// // Function to search relevant chunks from vector store based on user query
// async function searchRelevantChunks(vectorStore, question) {
//   try {

//     if( typeof question !== 'string'){
//       throw new ApiError(400, "Question must be string");
//     }
//     console.log("Question:", question);
    
//     const embed = await embeddings.embedQuery(question);
//     console.log("Query Embedding:", embed);
//     const res = await vectorStore.similaritySearch(question, 5);
//     console.log("Relevant similaritySearch:", res);
//     return res.map(chunk => chunk.document);
//   } catch (error) {
//     console.error("Error in searching relevant chunks:", error);
//     return [];
//   }
// }

// // Function to generate a response using the LLM
// async function getAnswers(question, relevantChunks) {
//   const truncatedQuestion = question.slice(0, 500);

//  const formattedMessages = await promptTemplate.formatMessages({
//   input: `User's question: ${truncatedQuestion}\n\nHere is some relevant web content. Please summarize the content strictly according to the question. Try to Summarize the answer according to the content. If the answer is not found in the given web content, simply respond with "I am not able to find an answer to your question":\n${relevantChunks.join("\n")}\n\nSummarize the answer if found, otherwise say "Data is not available".`,
// });

//   try {

//     // I am dooing mistake here I am directky giving it to the Large Language Model 
//     const res = await llm.invoke(formattedMessages);
//     return res;
//   } catch (error) {
//     console.error("Error invoking LLM:", error);
//     return "Sorry, I couldn't generate an answer.";
//   }
// }

// // Controller function to handle the query from the frontend
// const handleQuery = asyncHandler(async (req, res, next) => {
//   const { question } = req.body;

//   if (!question) {
//     throw new ApiError(400, "Question is required");
//   }

//   console.log(question, "This is the question");
  

//   // Step 1: Scrape the content from the webpage
//   const scrapedData = await scrapeContent(URL);

//   console.log(scrapedData, "This is the scraped data");

//    // Step 2: If valid scraped data is found, proceed with further steps
//   if (scrapedData && scrapedData.length > 0) {
//     // Step 3: Split the scraped content into chunks
//     const chunks = await splitContent(scrapedData);
//     console.log(chunks, "These are the chunks");
    

//     // Step 4: Add the chunks to the vector store
//     await addChunksToVectorStore(vectorStore, chunks);
     

//     // Step 5: Search relevant chunks based on the user's question
//     const relevantChunks = await searchRelevantChunks(vectorStore, question);
//     console.log(relevantChunks, "These are the relevant chunks");
    

//     if (relevantChunks.length > 0) {
//       // Step 6: Get answers based on the relevant chunks
//       const answer = await getAnswers(question, relevantChunks);
//       console.log(answer);
      
//       return res.status(200).json(new ApiResponse(200, { answer }, "Answer generated successfully"));
//     } else {
//       throw new ApiError(404, "No relevant content found.");
//     }
//   } else {
//     throw new ApiError(404, "No content found from the webpage.");
//   }
// });

// export {
// //   handleQuery
// };


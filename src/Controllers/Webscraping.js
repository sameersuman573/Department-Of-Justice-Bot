import { ChatMistralAI } from "@langchain/mistralai";
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";
import * as dotenv from "dotenv";
import "@mendable/firecrawl-js";
import { FireCrawlLoader } from "@langchain/community/document_loaders/web/firecrawl";
 import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { NomicEmbeddings } from "@langchain/nomic";
import { MemoryVectorStore } from "langchain/vectorstores/memory";
import { createInterface } from "readline";
import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
 dotenv.config();
import { AgentExecutor, createToolCallingAgent } from "langchain/agents";
import { AIMessage, HumanMessage } from "@langchain/core/messages";
import { createRetrieverTool } from "langchain/tools/retriever";
import { Gram_nayalaya_URL } from "../KnowldegbaseLink/Gram_Nayalaya.js";
import { asyncHandler } from "../Utils/AsyncHandler.js";
import { ApiError } from "../Utils/ApiError.util.js";
import { ApiResponse } from "../Utils/ApiResponse.js";


// Algorithm

// PART 1
// 1. Lay the foundation with LLM , Searcheronweb , ChatPromptTemplate



// PART 2 
// 2. Now Initailize the Agent - It consist of 
// Loader initialize 
// splitter use - chunks 
// Embeddings create
// vector store save
// Retriver create -> Then create a Retriver tool and this tool will be called by the agent 
// So we have two tools 
// 1. Search Tools
// 2. LoadRetriver Tool


// NOTE - i want to call the Initilaize agent only when i have queries regarding LoadRetriver otherwise i want to use Search tool


// PART 3
// 1. Now we will create a Agent Executor which will be executing a agent based on our question
// 2. We have to give Description in the tools that when we want to use them so that they get called by the Tool calling agent
// 3. Now we will Invoke our question so for that make a function
// 4. Based on this we will have to Generate the ChatHistory of the user and the AI bot


// PART 4 - Final
// get the Question from the Frontend
// Now Invoke the question in agent exector - based on the question it will call the necessary tool



const LLM = new ChatMistralAI({
  model: "mistral-large-latest",
  apiKey: process.env.MISTRAL_API_KEY,
  temperature: 1,
  maxRetries: 2,
  maxTokens: 50,
});


const Searchtools = new TavilySearchResults({
  maxResults: 2,
  apiKey: process.env.TRAVERLY_SEARCH_KEY,
  description: "use this too for searching queries given by the user",
});


const prompt = ChatPromptTemplate.fromMessages([
  {
    role: "system",
    content: `
    You are a Helpful Assistant designed to answer user queries based on the content provided. 

    Instructions:
    1. Use the **Loader_search** tool for questions specifically about Gram Nyayalaya.
    2. For all other questions, use the **Searchtools** tool.
    3. If you do not have an answer, respond with: 
      "I do not know this answer." without any additional information.
    
    Context:
    - Focus on being concise and informative .
    - Prioritize the accuracy of the information provided.
    - Example Responses:
      - If asked "What is the number of operational Gram Nyayalayas in Punjab?", the response should be: "The number of operational Gram Nyayalayas in Punjab is 2."
      - If the information is not available, respond with: "I do not know this answer."
    `,
  },
  new MessagesPlaceholder("chat_history"),
  {
    role: "user",
    content: "{input}",
  },
  new MessagesPlaceholder("agent_scratchpad"),
]);


let agent = null;
let tools = null;
let chatHistory = [];


async function initializeAgent() {
  try {
    const loader = new FireCrawlLoader({
      url: Gram_nayalaya_URL, // The URL to scrape
      apiKey: process.env.FIRECRAWL_API_KEY,
      mode: "scrape",
    });

    const docs = await loader.load();
    const firstDoc = [docs[0]];
    console.log(firstDoc, "This is the metadata man");

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 200,
      chunkOverlap: 20,
    });
    const SplitDocs = await splitter.splitDocuments(firstDoc);

    const embeddings = new NomicEmbeddings({
      apiKey: process.env.NOMIC_API_KEY,
      inputType: "document",
    });

    const vectorStore = await MemoryVectorStore.fromDocuments(SplitDocs, embeddings);

    const retriever = vectorStore.asRetriever({
      k: 3, // Fetch the top 3 most relevant documents
    });

    const LoaderRetrieverTool = await createRetrieverTool(retriever, {
      name: "Loader_search",
      description: "Use this tool for searching information specifically about Number of Gram Nyayalaya Operational.",
    });

    tools = [Searchtools, LoaderRetrieverTool];

    agent = createToolCallingAgent({
      llm: LLM,
      tools: tools,
      prompt,
    });

    console.log("Agent initialized:", agent);
  } catch (error) {
    console.error("Error initializing agent:", error);
  }
}

async function invokeAgent(input) {
  try {
    const agentExecutor = new AgentExecutor({
      agent: agent,
      tools: tools,
    });

    const response = await agentExecutor.invoke({
      input: input,
      chat_history: chatHistory, // Pass the chat history as context for the conversation
    });

    console.log("Agent:", response.output);

    chatHistory.push(new HumanMessage(input));
    chatHistory.push(new AIMessage(response.output)); // Add agent's response to history

    return response.output;
  } catch (error) {
    console.error("Error invoking agent:", error.message);
    throw error;
  }
}



const handleQuery = asyncHandler(async(req , res , next) => {

 
  const {question} = req.body;

  if(!question){
    throw new ApiError(401 , "Question is Required")
  }

try {
    const FinalRes = await invokeAgent(question);

    return res.json(new ApiResponse(200 , FinalRes , "The Answer Given by Bot is"))
  
} catch (error) {
  throw new ApiError(401 , "Invoking Agent Did not run Final response")
}  
})

// async function handleQuery(req, res) {

//   const { question } = req.body;

//   if (!question) {
//     return res.status(400).send({ error: 'Question is required' });
//   }

//   try {
//     const response = await invokeAgent(question);
//     res.send({ response });
//   } catch (error) {
//     res.status(500).send({ error: error.message });
//   }
// }

initializeAgent();



export{
  handleQuery
}















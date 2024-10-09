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
import { ExaSearchResults } from "@langchain/exa";
import Exa from "exa-js";
dotenv.config();
import { AgentExecutor, createToolCallingAgent } from "langchain/agents";
import { AIMessage, HumanMessage } from "@langchain/core/messages";
import { createRetrieverTool } from "langchain/tools/retriever";
import { asyncHandler } from "../Utils/AsyncHandler.js";
import { ApiError } from "../Utils/ApiError.util.js";
import { ApiResponse } from "../Utils/ApiResponse.js";
import { tool } from "@langchain/core/tools";

// Part 1
//  Initialize the Chat llm , WebSearcher , prompt message

// Part 2
//  Now initialize the Agent Which will be Fethcing the Information from the Web by Scraping it
// 1.Now First load the data From the Url by scraping it
// 2.The Break it into chunks so that Smalller chunks help in precise retrival of data . It is Easier to use and return the data as better Embeddings are created And thus or LLm have a good context
// 3.Now Initilaize a vector store and save the data you have
// 4.Now We have to create a retriver which will find the answer if we invoke a question to him
// 5.Now we must create a retiver tool that will do the job of calling the rertiver ufnction by onvoking it a question
// 6. Now we will create a tool which will call these retiver agent whenver we want

// Part 3
// Now will make a function in which the agent will be given the question
// Therefore it will execute those question by calling the agent Executor

const urls = [
  {
    url: "https://www.tele-law.in/national-legal-services-authority.html",
    description: "Information about National Legal Services Authority(NALSA)",
  },
  {
    url: "https://dashboard.doj.gov.in/gn/fund_released",
    description:
      "Fund Released By Department Of justice for Gram Nyayalaya (Rs in Lakhs)",
  },
  {
    url: "https://dashboard.doj.gov.in/gn/operational_gram_nyayalaya",
    description:
      "Number Of Operational Gram Nyayalaya in States",
  },
  {
    url: "https://dashboard.doj.gov.in/gn/pendency_criminal",
    description: "Description of the number of cases pending in Gram Nyayalaya",
  },
  {
    url: "https://dashboard.doj.gov.in/gn/introduction",
    description: "Description and features of About  Gram Nyayalaya ",
  },
];

let Agent = null;
let tools = null;
let currentURL = null;
let chatHistory = [];

const LLM = new ChatMistralAI({
  model: "mistral-large-latest",
  apiKey: process.env.MISTRAL_API_KEY,
  temperature: 1,
  maxRetries: 2,
  maxTokens: 500,
});


   const EmbeddQuestion = new NomicEmbeddings({
    apiKey: process.env.NOMIC_API_KEY,
    inputType: "question"
  });


const embeddingGenerator = new NomicEmbeddings({
  apiKey: process.env.NOMIC_API_KEY,
  inputType: "document",
});

async function cosineSimilarity(a, b) {
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const MagnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val ** 2, 0));
  const MagnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val ** 2, 0));
  return dotProduct / (MagnitudeA * MagnitudeB);
}

async function SelectMostRelevantURL(question) {
  const QuestEmbedding = await EmbeddQuestion.embedQuery(question);
  let BestScore = -Infinity;
  let bestURL = null;

  // Now Iterate over the Url and select the best url based on Similarity
  for (const { url, description } of urls) {
    // create Description embeddings
    const DescriptionEmbedding = await EmbeddQuestion.embedQuery(description);
    const Result = await cosineSimilarity(DescriptionEmbedding, QuestEmbedding);

    if (Result > BestScore) {
      BestScore = Result; // Update BestScore with the new higher similarity score
      bestURL = url;
    }
  }
  return bestURL;
}

const Searchtools = new TavilySearchResults({
  maxResults: 2,
  apiKey: process.env.TRAVERLY_SEARCH_KEY,
  description: "use this too for searching queries given by the user",
});

const prompt = ChatPromptTemplate.fromMessages([
  {
    role: "system",
    content: `
    You are a helpuful assistant Who answer user queries
    1. If the question is about Gram Nyayalaya, determine the most relevant URL from the list provided.
    2. Use the corresponding loader tool to fetch the data.
    3. For any other queries, use the general search tool.
    `,
  },
  new MessagesPlaceholder("chat_history"),
  {
    role: "user",
    content: "{input}",
  },

  // ONE OF THE MOST IMPORTANT THING - IT IS USED TO MANAGE THE CONTEXT OF THE CONVERSATION
  new MessagesPlaceholder("agent_scratchpad"),
]);





async function InitializeAgent(url) {
  try {
    const loader = new FireCrawlLoader({
      url: url, // Use the passed URL or the default URL
      apiKey: process.env.FIRECRAWL_API_KEY,
      mode: "scrape",
    });

    const LoadWebData = await loader.load();
    const Docs = [LoadWebData[0]];
    // The Split Documents split the docs in array format

    const TextSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 200,
      chunkOverlap: 20,
    });

    const splitDocs = await TextSplitter.splitDocuments(Docs);

    // Embedding creation will be done while saving the data in docs

    const vectorstore = await MemoryVectorStore.fromDocuments(
      splitDocs,
      embeddingGenerator,
    );

    const retriever = vectorstore.asRetriever({
      k: 3,
      // List me the top 3 items apperared in your search
    });

    const LoadDataFromDeptofJustice = new createRetrieverTool(retriever, {
      name: "Loader_search",
      description:
        "Use this tool for retrieving information from the relevant URL.",
    });

    tools = [LoadDataFromDeptofJustice, Searchtools];

    // Based on sescription of each tool and Prompt given to the LLm The perfect agent will be called by the tool for a Given contextual question
    Agent = new createToolCallingAgent({
      llm: LLM,
      tools: tools,
      prompt,
    });

    console.log("The Agent is Initialized Successfully");
  } catch (error) {
    console.error(`Error initializing agent: ${error.message}`);
    throw new ApiError(401, `The Agent failed to initialize: ${error.message}`);
  }
}

async function invokeAgent(input) {
  try {
    const relevantURL = await SelectMostRelevantURL(input);

    if (!Agent || relevantURL != currentURL) {
      console.log("Re-initializing agent for the new URL:", relevantURL);
      const res = await InitializeAgent(relevantURL);
      console.log(res, "The InitializeAgent is ");
      currentURL = relevantURL;
    }

    // There can be many new agents thus it will take a new
    const agentExecutor = new AgentExecutor({
      agent: Agent,
      tools: tools,
    });

    const response = await agentExecutor.invoke({
      input: input,
      chat_history: chatHistory,
    });

    console.log(response.output);

    chatHistory.push(new HumanMessage(input));
    chatHistory.push(new AIMessage(response.output));

    return response.output;
  } catch (error) {
    console.error(`Error invoking agent: ${error.message}`);
    throw new ApiError(401, `The Agent failed to invoke: ${error.message}`);
  }
}

const handleQuery = asyncHandler(async (req, res, next) => {
  const { question } = req.body;

  if (!question) {
    throw new ApiError(401, "Please Give the Question");
  }

  try {
    const FinalRes = await invokeAgent(question);
    return res.json(
      new ApiResponse(200, FinalRes, "The Answer Given by Bot is"),
    );
  } catch (error) {
    console.log(error);
    console.error(error);
    throw new ApiError(401, "Invoking Agent Did not run Final response");
  }
});

export { handleQuery };

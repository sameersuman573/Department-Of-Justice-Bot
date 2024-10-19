import { ChatMistralAI } from "@langchain/mistralai";
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";
import {Document} from "../Model/Docs.model.js"
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
import { MongoDBAtlasVectorSearch } from "@langchain/mongodb";
import { MongoClient } from "mongodb";
import { Embeddings } from "@langchain/core/embeddings";
import {embeddingGenerator} from "../EmbeddingModel/embeddingGenerator.js"
import {urls} from "../KnowldegbaseLink/url.js"
import {EmbeddQuestion} from "../EmbeddingModel/EmbeddQuestion.js"
import {Searchtools} from "../Tools/SearchTool.js"
import {prompt} from "../PromptTemplates/BotPrompt.js"
import {LLM} from "../MLModels/MistralModel.js"
import { getMongoClient, getCollection, getVectorstore } from '../Db/index.db.js';
import {ConnectDB} from "../Db/index.db.js"
import { marked } from "marked";
import {filterDoc} from "../Utils/Filter.util.js"
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





// ------------------------------------------------------------
// const embeddingGenerator = new NomicEmbeddings({
//   apiKey: process.env.NOMIC_API_KEY,  // Use your Nomic API key
//   inputType: "document",  // Ensure the input type is "document" for embedding documents
// });



let mongoClient;
let collection ;
let vectorstore ;

// let collection = await getCollection()

( async() => {
  try {
    await ConnectDB(); // Ensure this is called to establish the connection
    mongoClient = await getMongoClient();
    collection = await getCollection(); // specify your collection name
    vectorstore = await getVectorstore(); // Ensure this is set up correctly too
  } catch (error) {
    console.error('Error initializing MongoDB connection:', error);
  }
})()








let Agent = null;
let tools = null;
let currentURL = null;
let chatHistory = [];



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






async function InsertDocuments(SplitDocs) {
  // 1. Generate Embeddings for each document for its ageContent
  // 2. Now save the New document having page content and its embedding
  // 3. Then Add in the Collection
try {
    
    for(const doc of SplitDocs ){
      const embedding = await embeddingGenerator.embedQuery(doc.pageContent);

      const docWithEmbedding = {
        pageContent:doc.pageContent,
        embedding:embedding
      }


      await collection.insertOne(docWithEmbedding)
      console.log(`Document with content '${doc.pageContent.slice(0, 30)}...' added to vector store.`);
    }


    console.log("All documents have been added to the vector store.");

} catch (error) {
  console.error(`There Was An error adding the documenst ${error.message}`)
  throw new ApiError(500, `Error adding documents: ${error.message}`);
}
}






async function InitializeAgent(url) {
  try {
    const loader = new FireCrawlLoader({
      url: url, // Use the passed URL or the default URL
      apiKey: process.env.FIRECRAWL_API_KEY,
      mode: "scrape",
    });

    const LoadWebData = await loader.load();
    // const Docs = [LoadWebData[0]];
    // The Split Documents split the docs in array format

    let doc = LoadWebData[0];

    // Apply the filterDoc function to clean the page content
    const filteredContent = filterDoc(doc.pageContent);
    doc.pageContent = filteredContent;

    const Docs = [doc];

    const TextSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 300,
      chunkOverlap: 30,
    });

    const splitDocs = await TextSplitter.splitDocuments(Docs);

    // Embedding creation will be done while saving the data in docs
    const AddDocToVectorstore = await InsertDocuments(splitDocs);


    // const vectorstore = await MemoryVectorStore.fromDocuments(
    //   splitDocs,
    //   embeddingGenerator,
    // );


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


function formatAsBulletPoints(text) {
  // Split the text by periods, new lines, or semicolons to create bullet points
  const sentences = text
    .split(/[\.\n;]/)
    .map(sentence => sentence.trim())
    .filter(sentence => sentence.length > 0);

  // Join sentences with bullet points
  return sentences.map(sentence => `- ${sentence}`).join('\n');
}



async function invokeAgent(input) {
  try {
    const relevantURL = await SelectMostRelevantURL(input);

    if (!Agent || relevantURL != currentURL) {
      console.log("Re-initializing agent for the new URL:", relevantURL);
      const res = await InitializeAgent(relevantURL,input);
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
    const formattedResponse = formatAsBulletPoints(response.output);


    chatHistory.push(new HumanMessage(input));
    chatHistory.push(new AIMessage(response.output));

    // return response.output;
    return formattedResponse;
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

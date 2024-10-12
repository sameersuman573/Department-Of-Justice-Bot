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


// MongoDB setup
// const mongoClient = new MongoClient(process.env.MONGODB_URI);
// await mongoClient.connect();
// const db = mongoClient.db(process.env.MONGODB_DB_NAME);
// // const collection = db.collection(process.env.MONGODB_COLLECTION_NAME);
// const collection = db.collection(process.env.MONGODB_COLLECTION_NAME);


// console.log("DB Name:", process.env.MONGODB_DB_NAME);
// console.log("Collection Name:", process.env.MONGODB_COLLECTION_NAME);
// console.log("MongoDB URI:", process.env.MONGODB_URI);


const embeddingGenerator = new NomicEmbeddings({
  apiKey: process.env.NOMIC_API_KEY,  // Use your Nomic API key
  inputType: "document",  // Ensure the input type is "document" for embedding documents
});



let mongoClient;
let collection;
let vectorstore;

// Function to connect to MongoDB
async function connectToMongoDB() {
    try {
        // console.log("Attempting to connect to MongoDB...");

        mongoClient = new MongoClient(process.env.MONGODB_URI);
        await mongoClient.connect();
        console.log("Connected to MongoDB successfully.");

        const dbName = process.env.MONGODB_DB_NAME;
        const collectionName = process.env.MONGODB_COLLECTION_NAME;

        if (!dbName || !collectionName) {
            throw new Error("Database name or collection name is not defined in the environment variables");
        }

        const db = mongoClient.db(dbName);
        collection = db.collection(collectionName);
        // console.log("Connected to DB:", dbName);
        // console.log("Using Collection:", collectionName);


        // Setting up of the vecotor store 
        vectorstore = new MongoDBAtlasVectorSearch(embeddingGenerator, {
          collection: collection,
          indexName: "vector_index", // The name of the Atlas search index. Defaults to "default"
          textKey: "pageContent", // The name of the collection field containing the raw content. Defaults to "text"
          embeddingKey: "embedding", // The name of the collection field containing the embedded text. Defaults to "embedding"
        });

    } catch (error) {
        console.error("MongoDB connection error:", error.message);
        throw new ApiError(500, `MongoDB connection error: ${error.message}`);
    }
}





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
    description: "Description and features of About Gram Nyayalaya ",
  },
];

let Agent = null;
let tools = null;
let currentURL = null;
let chatHistory = [];

const LLM = new ChatMistralAI({
  model: "mistral-large-latest",
  apiKey: process.env.MISTRAL_API_KEY,
  temperature: 0.5,
  maxRetries: 2,
  maxTokens: 250,
});


  const EmbeddQuestion = new NomicEmbeddings({
    apiKey: process.env.NOMIC_API_KEY,
    inputType: "question"
  });

  const embeddings = new NomicEmbeddings({
    apiKey: process.env.NOMIC_API_KEY,
    inputType: "query"
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





// async function InitializeAgent(url,input) {
//   try {
//     const loader = new FireCrawlLoader({
//       url: url, // Use the passed URL or the default URL
//       apiKey: process.env.FIRECRAWL_API_KEY,
//       mode: "scrape",
//     });

//     const LoadWebData = await loader.load();
//     const Docs = [LoadWebData[0]];
//     // The Split Documents split the docs in array format

//     const TextSplitter = new RecursiveCharacterTextSplitter({
//       chunkSize: 200,
//       chunkOverlap: 20,
//     });

//     const splitDocs = await TextSplitter.splitDocuments(Docs);

//     for(const doc of splitDocs){
//       const embedding = await embedd(doc.pageContent);








//     //   const newDocs = new Document({
//     //     Title:input,
//     //     embedding,
//     //     pageContent:doc.pageContent
//     //   })
//     //   await newDocs.save();
//     // }


//     const vectorstore = await MemoryVectorStore.fromDocuments(splitDocs , embeddings);








//     const retriever = vectorstore.asRetriever({
//       k: 3,
//       // List me the top 3 items apperared in your search
//     });

//     const LoadDataFromDeptofJustice = new createRetrieverTool(retriever, {
//       name: "Loader_search",
//       description:
//         "Use this tool for retrieving information from the relevant URL.",
//     });

//     tools = [LoadDataFromDeptofJustice, Searchtools];

//     // Based on sescription of each tool and Prompt given to the LLm The perfect agent will be called by the tool for a Given contextual question
//     Agent = new createToolCallingAgent({
//       llm: LLM,
//       tools: tools,
//       prompt,
//     });

//     console.log("The Agent is Initialized Successfully");
//   }
//   } catch (error) {
//     console.error(`Error initializing agent: ${error.message}`);
//     throw new ApiError(401, `The Agent failed to initialize: ${error.message}`);
//   }
// }


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




// async function vectorSearch(query) {
//   // My query will be converted back to the Embeddings 
//   // Now It will be Searched in the vector store And Whichever document best fits my embeddings the rertiver will be selecting those
//   // Therofore We would be using the Retriver for fetching the best 3 results 
//  try {
   
//    const EmbedQuestion = await EmbeddQuestion.embedQuery(query);
 
//    const retriever = vectorstore.asRetriever({
//      k:2
//    }) 
 
//    const SearchResult = await retriever.retrieve(query)
//    console.log("Search Results:", SearchResult);
 
//    return SearchResult.map(res => res.pageContent);
//  } catch (error) {
//   console.error(`There was Error finding your Answer using retriver ${error.message}`)
//   throw new ApiError(500 , "There is an Error finding the answer using retriever")
//  }

// }



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

// Initialize MongoDB connection at the start
connectToMongoDB()
    .then(() => {
        console.log("MongoDB connection established. Ready to handle requests.");
    })
    .catch((error) => {
        console.error("Failed to connect to MongoDB:", error.message);
        process.exit(1); // Exit if MongoDB connection fails
    });


export { handleQuery };

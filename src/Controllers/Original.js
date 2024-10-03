// import { ChatMistralAI } from "@langchain/mistralai";
// import {
//   ChatPromptTemplate,
//   MessagesPlaceholder,
// } from "@langchain/core/prompts";
// import * as dotenv from "dotenv";
// import "@mendable/firecrawl-js";
// import { FireCrawlLoader } from "@langchain/community/document_loaders/web/firecrawl";
//  import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
// import { NomicEmbeddings } from "@langchain/nomic";
// import { MemoryVectorStore } from "langchain/vectorstores/memory";
// import { createInterface } from "readline";
// import { TavilySearchResults } from "@langchain/community/tools/tavily_search";
//  dotenv.config();
// import { AgentExecutor, createToolCallingAgent } from "langchain/agents";
// import { AIMessage, HumanMessage } from "@langchain/core/messages";
// import { createRetrieverTool } from "langchain/tools/retriever";
// import { Gram_nayalaya_URL } from "../KnowldegbaseLink/Gram_Nayalaya.js";
// import { asyncHandler } from "../Utils/AsyncHandler.js";
// import { ApiError } from "../Utils/ApiError.util.js";
// import { ApiResponse } from "../Utils/ApiResponse.js";
// import { tool } from "@langchain/core/tools";
// import exp from "constants";


// // Part 1
// //  Initialize the Chat llm , WebSearcher , prompt message 


// // Part 2
// //  Now initialize the Agent Which will be Fethcing the Information from the Web by Scraping it
// // 1.Now First load the data From the Url by scraping it
// // 2.The Break it into chunks so that Smalller chunks help in precise retrival of data . It is Easier to use and return the data as better Embeddings are created And thus or LLm have a good context 
// // 3.Now Initilaize a vector store and save the data you have 
// // 4.Now We have to create a retriver which will find the answer if we invoke a question to him 
// // 5.Now we must create a retiver tool that will do the job of calling the rertiver ufnction by onvoking it a question
// // 6. Now we will create a tool which will call these retiver agent whenver we want 


// // Part 3
// // Now will make a function in which the agent will be given the question 
// // Therefore it will execute those question by calling the agent Executor 




// let Agent = null;
// let tools = null;
// let chatHistory = []




// const LLM = new ChatMistralAI({
//     model: "mistral-large-latest",
//     apiKey: process.env.MISTRAL_API_KEY,
//     temperature: 1,
//     maxRetries: 2,
//     maxTokens: 50,
//   });
  
  
//   const Searchtools = new TavilySearchResults({
//     maxResults: 2,
//     apiKey: process.env.TRAVERLY_SEARCH_KEY,
//     description: "use this too for searching queries given by the user",
//   });


// const prompt = ChatPromptTemplate.fromMessages([
//     {
//     role:"system",
//     content: `
//     You are a helpuful assistant Who answer user queries
//     1. If the Question is asked then Deliver only the Required Information 
//     2. If the Question is about Gram nyayalaya then use the LoaderSearch agent tool  to give the answer
//     3. For  any other queries you can use Search Tool
//     `
//     },
//     new MessagesPlaceholder("chat_history"),
//     {
//         role:"user",
//         content: "{input}"
//     },

//     // ONE OF THE MOST IMPORTANT THING - IT IS USED TO MANAGE THE CONTEXT OF THE CONVERSATION
//     new MessagesPlaceholder("agent_scratchpad"),

// ])

 

//   const embeddings = new NomicEmbeddings({
//     apiKey: process.env.NOMIC_API_KEY,
//     inputType: "document",
//   });


// async function InitializeAgent(url = Gram_nayalaya_URL) {

// try {


//   const loader = new FireCrawlLoader({
//     url: url, // Use the passed URL or the default URL
//     apiKey: process.env.FIRECRAWL_API_KEY,
//     mode: "scrape",
//   });

  
//         const LoadWebData = await loader.load(url)
//         const Docs = [LoadWebData[0]]
//         // The Split Documents split the docs in array format
    
//         const TextSplitter = new RecursiveCharacterTextSplitter({
//             chunkSize:200,
//             chunkOverlap:20
//         })
    
//         const splitDocs = await TextSplitter.splitDocuments(Docs)
    
//         // Embedding creation will be done while saving the data in docs
    
//         const vectorstore = await MemoryVectorStore.fromDocuments(splitDocs , embeddings);
    
//         const retriever = vectorstore.asRetriever({
//             k:3
//             // List me the top 3 items apperared in your search
//         })
    
//         const LoadDataFromDeptofJustice = new createRetrieverTool(retriever , {
//             name: "Loader_search",
//             description: "Use this tool for searching information specifically about Number of Gram Nyayalaya .",
//         })
    
//         tools = [LoadDataFromDeptofJustice , Searchtools]
    
    
//         // Based on sescription of each tool and Prompt given to the LLm The perfect agent will be called by the tool for a Given contextual question
//         Agent = new createToolCallingAgent({
//             llm:LLM,
//             tools:tools,
//             prompt
//         })


//         console.log("The Agent is Initialized Successfully");
        
// } catch (error) {
//     throw new ApiError(401 , "The Agent is not Initialized")
// }
// }



// async function invokeAgent(input) {


//    try {
//      // There can be many new agents thus it will take a new 
//      const agentExecutor = new AgentExecutor({
//          agent:Agent,
//          tools:tools
//      })
     
 
//      const response = await agentExecutor.invoke({
//         input:input,
//         chat_history:chatHistory
// }) 

// console.log(response.output);

// chatHistory.push(new HumanMessage(input))
// chatHistory.push(new AIMessage(response.output))
 
//     return response.output;

//   } catch (error) {
//     throw new ApiError(401 , "The Agent Executor Did not worked well")
//   }

// }



// const handleQuery = asyncHandler(async(req , res , next) => {

 
//         const {question} = req.body
    
//         if(!question){
//             throw new ApiError(401 , "Please Give the Question")
//         }
    
//         try {
//           const FinalRes = await invokeAgent(question);
//           return res.json(new ApiResponse(200, FinalRes, "The Answer Given by Bot is"));
//         } catch (error) {
//           throw new ApiError(401, "Invoking Agent Did not run Final response");
//         }
        
// })

// InitializeAgent();

// export {
//     handleQuery
// }
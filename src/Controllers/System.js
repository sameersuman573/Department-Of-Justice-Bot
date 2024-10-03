// import { ChatMistralAI } from "@langchain/mistralai";
// import { ChatPromptTemplate } from "@langchain/core/prompts";
// import * as dotenv from 'dotenv';
// import { Document } from "@langchain/core/documents";
// import {createStuffDocumentsChain} from 'langchain/chains/combine_documents'
// import {createRetrievalChain} from "langchain/chains/retrieval"
// import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
// import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
// import { NomicEmbeddings } from "@langchain/nomic";
// import { MemoryVectorStore } from "langchain/vectorstores/memory";
//  import { load } from "cheerio";
// import { asyncHandler } from "../Utils/AsyncHandler.js";
// import { ApiResponse } from "../Utils/ApiResponse.js";
// import { ApiError } from "../Utils/ApiError.util.js";
// dotenv.config();

// // Algortihm
// // 1. Initialize the Large Language Model
// // 2. Create Prompt Template with System behaviour  , context and Human input 
// // 3. Create a StuffDocumentsChain so that whatever is the most relevant documents featuring the question is Given to the LLm so that it can answer in a the most correct manner
// // 4. Now Load the Raw data from the internet 
// // 5. Now split the text 
// // 6. create a vector store to save the text 
// // 7. creta vector embeddings for it
// // 8. save the embeddings 
// // 9. create a retriever who will retrireve the most relevant documents form the vector store
// // 10. Now create a retirveival chain which will combine all the Documenst given by retirver and pass it to StuffDocumentsChain to combine then and then will feed it to the LLM
// // 11. Now feed your questions to the Retivelachain

// const url = "https://js.langchain.com/docs/how_to/assign/";


// const LLM = new ChatMistralAI({
//     model: "mistral-large-latest",
//     apiKey: process.env.MISTRAL_API_KEY,
//     temperature: 1,
//     maxRetries: 2,
//     maxTokens: 3000,
// })


// const prompt = ChatPromptTemplate.fromMessages([
//     { role: "system", content: "You are a Helpful Assistant who answers queries of the user based on the context of the content... If you donot get the answer say i Donot know this Answer donot say after that anything" },
//     {role: "system" , content: "{context}" },
//     {role: "user" , content:"{input}"}
// ])


// // As the server Starts the Data and Documents from the Webpage must be scraped so that it is ready for the user queries to be answervale by the llm 

// let RetrievalChain;
// async function InitializeDataFromweb() {

//     // creation of DocumentStuff chain
//     const chain = await createStuffDocumentsChain({
//         llm:LLM,
//         prompt:prompt
//     })


//     // -----------------------------------------------------

//     // Now load the Data from web and make it usable

//     // LOADER---------
//     const loader = new CheerioWebBaseLoader(url , 
//         {selector: "p,h1,h2,h3"}
//     )
//     const docs = await loader.load()


//     // Now Split the Documents 
//     const splitter = new RecursiveCharacterTextSplitter({
//         chunkSize:200,
//         chunkOverlap:20
//     })
//     const SplitDocs = await splitter.splitDocuments(docs)


//     // Now create embeddings 
//     const embeddings = new NomicEmbeddings({
//         apiKey: process.env.NOMIC_API_KEY,
//         inputType: "document",
//     })

//   // Correctly create the vector store from documents
// const vectorStore = await MemoryVectorStore.fromDocuments(SplitDocs, embeddings);


//     // -------------------------------------------------


//     // 
//     const retriever = vectorStore.asRetriever({
//         k: 3, // Fetch the top 3 most relevant documents
//     });


//     RetrievalChain = await createRetrievalChain({
//         retriever,
//         combineDocsChain:chain
//     })

// }


// InitializeDataFromweb();



// const handleQuery = asyncHandler(async(req , res , next) => {


//     // const question =  "What is the alternate way of passing data through steps of a chain ?"

//     const {question} = req.body; // Get the question from the request body
 
//     if( !question){
//         throw new ApiError(400 , "Please Give the Question so that the Bot can Answer the Question")
//     }

//     try {

//         const result = await RetrievalChain.invoke({
//             input:question
//         })

//         return res.json(200 , new ApiResponse( 200 ,{answer: result} , "Answer generated Successfully" ))
        
//     } catch (error) {
//         throw new ApiError(400 , "The Query handling has some mistake ")
//     }
// }
// )



// export{
//     handleQuery
// }
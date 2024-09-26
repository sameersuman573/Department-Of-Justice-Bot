import { ChatMistralAI } from "@langchain/mistralai";
import { ChatPromptTemplate, PromptTemplate } from "@langchain/core/prompts";
import * as dotenv from 'dotenv';
import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import { load } from "langchain/load";

dotenv.config();

const llm = new ChatMistralAI({
  model: "mistral-large-latest",
  apiKey: process.env.MISTRAL_API_KEY,
  temperature: 0,
  maxRetries: 2,
  maxTokens: 25,
  // other params...
});


// Algorithm
// 1. Initiaize the ChatModel
// 2. Make a ChatPromptTemplate
// 3. make a function to Load the content From the webpage
// 4. Now pass the Webscraped Data as well as your question regarding data to a function
// 5. The function Will make a prompt consisting of question and its direction to return the answer 
// 6. Now finally pass the prompt to the LLM model
// 7. Return the response to the user
const promptTemplate = ChatPromptTemplate.fromMessages([
  [
    "system",
    "You are a helpful assistant that helps people in the Department of Justice to solve their queries regarding cases.",
  ],
  ["human", "{input}"],
]);


async function ScrapeContent(url){
    const loader = new CheerioWebBaseLoader(url , {
        selector: "p",  // Selecting <p> tags to scrape text
    })

try {
    const MainContent = await loader.load();
    let combinedContent = MainContent.map(content => content.pageContent).join("\n");

    const truncatedContent = combinedContent.slice(0, 1000);
    return truncatedContent

} catch (error) {
    console.error("Error loading webpage:", error);
    return null;
}
}


async function GetAnswers(question , ScrapedData) {

    const truncatedQuestion = question.slice(0, 200);
    const truncatedScrapedData = ScrapedData.slice(0, 800);


    const formattedMessages = await promptTemplate.formatMessages({
        input: `User's question: ${truncatedQuestion}\n\nHere is some web content to help answer the question:\n${truncatedScrapedData}\n\nPlease provide an answer based on this content.`
    });
    
    
    const res = await llm.invoke(formattedMessages);
    return res;
}



async function main() {
    const question = "How TO Handle tool errors";
    const url = "https://js.langchain.com/v0.2/docs/how_to/tools_error";

    // 1. scrap the content from the webpage
    const scrapedData = await ScrapeContent(url);

        if(scrapedData.length > 0) {
            const answer = await GetAnswers(question , scrapedData);
            console.log(answer);
        }
        else {
            console.log("No content found")
        }
    
}



main();
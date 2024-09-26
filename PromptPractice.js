import { ChatPromptTemplate } from "@langchain/core/prompts";
import { MistralAI } from "@langchain/mistralai";
import * as dotenv from 'dotenv';
 dotenv.config();
import { StructuredChatOutputParser } from "langchain/agents";
import { LLMChain } from "langchain/chains";




class BotResponse{
    constructor(status , message , data = null , error = null){
        this.status = status
        this.message = message
        this.data = data
        this.error = error
    }
}

const llm = new MistralAI({
    model: "codestral-latest",
    temperature: 1,
    maxTokens: 10,
    maxRetries: 2,
    verbose: true
    // other params...
});



async function main(question) {


try {
        const prompt = ChatPromptTemplate.fromMessages([
            { role: 'system', content: 'You are an assistant for the Department of Justice.' },
            {role: 'user', content: `${question}`},
        ]);
    
    const formatting = await prompt.formatMessages();
    // // first fromat the message
    console.log(formatting);

        
    // Structed output parser
    const res = await llm.invoke({question: question})
    
    
    const StructuredRes = new BotResponse(
        "Success",
        "Response Retrived Successfully",
        {
            question: question,
            answer:res
        }
    );

    console.log(StructuredRes);
    return StructuredRes;

 } catch (error) {
    
    const errorRes = new BotResponse(
        500 ,
        "Something went wrong" , 
         null ,
         error.message)

         console.error(errorRes);
         return errorRes;
}


}




// This Question will come from Frontend
const question = "How can I pay fine for a traffic violation?"

main(question)





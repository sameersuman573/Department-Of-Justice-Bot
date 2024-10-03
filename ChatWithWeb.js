
const LLM = new ChatMistralAI({
  model: "mistral-large-latest",
  apiKey: process.env.MISTRAL_API_KEY,
  temperature: 1,
  maxRetries: 2,
  maxTokens: 50,
});

// const url = "https://dashboard.doj.gov.in/gn/operational_gram_nyayalaya"

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


const Searchtools = new TavilySearchResults({
  maxResults: 2,
  apiKey: process.env.TRAVERLY_SEARCH_KEY,
  description: "use this too for searching queries given by the user",
});

// -----------------------------------------------------
// CHAT WITH A PARTICULAR KNOWLEDGE BASE
// -----------------------------------------------------

// Now load the Data from web and make it usable

// LOADER---------


// This InitializingAgent is used to setup agent with the necessary tools and configuration
async function InitializingAgent() {

  const loader = new FireCrawlLoader({
    url: Gram_nayalaya_URL, // The URL to scrape
    apiKey: process.env.FIRECRAWL_API_KEY,
    mode: "scrape",
    // AT LAST DO IT CRAWL
    // For API documentation, visit https://docs.firecrawl.dev
  });

  const docs = await loader.load();
  // console.log(docs , "This is the result docs");

  const firstDoc = [docs[0]];
  console.log(firstDoc, "This is the metadata man");

  // Now Split the Documents
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 200,
    chunkOverlap: 20,
  });
  const SplitDocs = await splitter.splitDocuments(firstDoc);

  // Now create embeddings
  const embeddings = new NomicEmbeddings({
    apiKey: process.env.NOMIC_API_KEY,
    inputType: "document",
  });

  // Correctly create the vector store from documents
  const vectorStore = await MemoryVectorStore.fromDocuments(
    SplitDocs,
    embeddings,
  );

  // RETRIEVER
  const retriever = vectorStore.asRetriever({
    k: 3, // Fetch the top 3 most relevant documents
  });

  // -----------------------------------------------------
  // End
  // -----------------------------------------------------

  const LoaderRetrieverTool = await createRetrieverTool(retriever, {
    name: "Loader_search",
    description:
      "Use this tool for searching information specifically about Number of Gram Nyayalaya Operational.",
  });



  const tools = [Searchtools, LoaderRetrieverTool];

  const agent = createToolCallingAgent({
    llm: LLM,
    tools,
    prompt,
  });

  return { agent , tools};
}


// Example usage
InitializingAgent().then(async ({agent , tools}) => {
  // Use the agent here
  console.log("Agent initialized:", agent);


  // now the returned agent is passed to the Agent executor 
  const agentExecutor = new AgentExecutor({
    agent,
    tools,
  });

  const chatHistory = [];


  // Bot has Introduced itself ans have started working
  const initialResponse = await agentExecutor.invoke({
    input: "Hello",
    chat_history: chatHistory,
  });


  console.log("Agent:", initialResponse.output);



const r1 = createInterface({
  input: process.stdin,
  output: process.stdout,
});

const AskQuestion = () => {

  r1.question("user: ", async (input) => {
    if (input.toLowerCase() === "exit") {
      r1.close();
      return;
    }



    try {
      const response = await agentExecutor.invoke({
        input: input,
        chat_history: chatHistory, // Pass the chat history as context for the conversation
      });

      console.log("Agent", response.output);

      chatHistory.push(new HumanMessage(input));
      chatHistory.push(new AIMessage(response.output)); // Add agent's response to history
  
} catch (error) {
  console.error("Error invoking agent:", error.message); // Handle any errors
}


AskQuestion();

});
};


AskQuestion();


}).catch(error => {
  console.error("Error initializing agent:", error);
});











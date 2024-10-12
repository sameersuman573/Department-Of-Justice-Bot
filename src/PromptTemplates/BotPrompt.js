import {
    ChatPromptTemplate,
    MessagesPlaceholder,
  } from "@langchain/core/prompts";

export const prompt = ChatPromptTemplate.fromMessages([
    {
      role: "system",
      content: `
      You are a helpuful assistant Who answer user queries
      1. If the question is about Gram Nyayalaya, determine the most relevant URL from the list provided.
      2. Use the corresponding loader tool to fetch the data.
      3. For any other queries, use the general search tool.
      at last you must write source: and provide the source link within <a class="text-blue-400"></a> tag.
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
  
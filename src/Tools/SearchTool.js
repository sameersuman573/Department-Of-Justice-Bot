import { TavilySearchResults } from "@langchain/community/tools/tavily_search";



export const Searchtools = new TavilySearchResults({
    maxResults: 2,
    apiKey: process.env.TRAVERLY_SEARCH_KEY,
    description: "use this too for searching queries given by the user",
  });

import { VoyageEmbeddings } from "@langchain/community/embeddings/voyage";

// / Initialize VoyageEmbeddings
const embeddings = new VoyageEmbeddings({
  apiKey: process.env.VOYAGE_API_KEY,
  inputType: "document", // Specify input type
});
 
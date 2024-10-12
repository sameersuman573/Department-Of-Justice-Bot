
// import mongoose from "mongoose";
// import {MONGODB_DB_NAME} from "../Constant/constant.js";

// const ConnectDB = async() => {

//     try {
//         const ConnectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${MONGODB_DB_NAME}`);
//         console.log("MONGODB IS CONNECTED SUCCESSFULLY", ConnectionInstance.connection.host);
        
//     } catch (error) {
//         console.log("Problem in connecting to the databse" , error);
//         process.exit(1);
//     }
// }

// export default ConnectDB;

import { MongoClient } from "mongodb";
import { MongoDBAtlasVectorSearch } from "@langchain/mongodb";
import { ApiError } from "../Utils/ApiError.util.js";
import {embeddingGenerator} from "../EmbeddingModel/embeddingGenerator.js"


let mongoClient;
let collection;
let vectorstore;

export async function ConnectDB() {
    try {

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

        // Setting up the vector store 
        vectorstore = new MongoDBAtlasVectorSearch(embeddingGenerator, {
            collection: collection,
            indexName: "vector_index", // The name of the Atlas search index. Defaults to "default"
            textKey: "pageContent", // The name of the collection field containing the raw content. Defaults to "text"
            embeddingKey: "embedding", // The name of the collection field containing the embedded text. Defaults to "embedding"
        });



console.log("Database name:", dbName);
console.log("Collection name:", collectionName);
// console.log("Collection object:", collection);

    } catch (error) {
        console.error("MongoDB connection error:", error.message);
        throw new ApiError(500, `MongoDB connection error: ${error.message}`);
    }
}

// Ensure proper exports
export function getMongoClient() {
    if (!mongoClient) {
        throw new Error("MongoDB client is not initialized. Please call ConnectDB first.");
    }
    return mongoClient;
}

export function getCollection() {
    if (!collection) {
        throw new Error("MongoDB collection is not initialized. Please call ConnectDB first.");
    }
    return collection;
}

export function getVectorstore() {
    if (!vectorstore) {
        throw new Error("Vectorstore is not initialized. Please call ConnectDB first.");
    }
    return vectorstore;
}

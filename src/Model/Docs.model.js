 import mongoose, { Schema } from "mongoose";
 

 const DocumentSchema = new Schema({
    title: {
      type: String,
      required: true,
    },
    embedding: {
      type: [Number], // assuming embedding is an array of numbers
      required: true,
    },
    pageContent: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  });
  

export const Document = mongoose.model("Document", DocumentSchema)
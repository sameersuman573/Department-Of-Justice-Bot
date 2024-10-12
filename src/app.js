
import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser";
import { corsOption } from "./config.js";
import { createServer } from "http";

const app = express();
const httpServer = createServer(app);


app.use(cors(corsOption))



// Configuration for data fetching
// 1.managing data when it comes through json
app.use(express.json({limit: "20kb"}))
// 2.managing data when it comes through url
app.use(express.urlencoded({extended:true , limit:"20kb"}))
// 3.managing data to store pdf or files assests on my server
app.use(express.static("public"))
// 4. from my server i can acess the user browser cookies and do crud opeartion on it
app.use(cookieParser())





import WebBot from "./Routes/WebBot.js"

app.use('/api/v1/Bot' , WebBot);




export {app , httpServer}



import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser";
import { corsOption } from "./config.js";


// after writing this app will all properties of express 
// app has now superpowers
const app = express();

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


// app.use((req, res, next) => {
//     console.log(`${req.method} ${req.url}`);
//     next();
// });



// ROUTES

// Algorithm
// 1. write middleware
// 2. whenever any user will go /users then control will go to userRoute and userRoute contains register
// example URL -> https://localhost:8000/api/v1/users/register



 import WebBot from "./Routes/WebBot.js"

app.use('/api/v1/Bot' , WebBot);


// app.use((req, res, next) => {
//     console.log(`Unhandled request: ${req.method} ${req.url}`);
//     res.status(404).send('Not Found');
// })




export {app}


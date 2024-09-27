import dotenv from "dotenv";
import { app } from "./app.js";

// Load environment variables from the .env file
dotenv.config({
    path: './.env'
});

// Global error listener before the app listens on the port
app.on("error", (err) => {
    console.log("The app has some error before the app listens on the port", err);
    process.exit(1);
});

// Start the server
const port = process.env.PORT || 8000;
app.listen(port, () => {
    console.log(`Server is running at PORT ${port}`);
});
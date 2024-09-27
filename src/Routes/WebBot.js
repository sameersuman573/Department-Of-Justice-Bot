import { Router } from "express";
import { handleQuery } from "../Controllers/Webscraping.js"; // Adjust the path as necessary

const router = Router();

router.post("/WebAsk", handleQuery);

export default router;
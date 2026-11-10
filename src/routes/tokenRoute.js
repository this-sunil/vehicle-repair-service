import express from "express";
import { tokenController } from "../controller/tokenController.js";
import { tokenLimiter } from "../middleware/security.js";

const router=express.Router();

router.post("/token",tokenLimiter,tokenController);

export default router;

import express from "express";
import upload from "../middleware/upload.js";
import { verifyToken } from "../middleware/verifyToken.js";
import { aiInsightsController, aiChatController } from "../controller/aiController.js";

const router = express.Router();

// AI analytics snapshot for the dashboard insights panel
router.get("/ai/insights", verifyToken, aiInsightsController);

// AI copilot chat endpoint (local intelligence, optional Gemini upgrade)
router.post("/ai/chat", verifyToken, upload.none(), aiChatController);

export default router;

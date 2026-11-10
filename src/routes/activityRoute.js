import express from "express";
import upload from "../middleware/upload.js";
import { verifyToken } from "../middleware/verifyToken.js";
import { getActivityController } from "../controller/activityController.js";
import { searchController } from "../controller/searchController.js";
const router = express.Router();

router.get("/activity", verifyToken, getActivityController);
router.get("/search", verifyToken, searchController);

export default router;

import express from "express";
import { tokenController } from "../controller/tokenController.js";

const router=express.Router();

router.post("/token",tokenController);

export default router;
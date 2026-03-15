import express from "express";
import upload from "../middleware/upload.js";
import { addBookingController,getAllBookingController } from "../controller/bookController.js";
//import { verifyToken } from "../middleware/verifyToken.js";

const router=express.Router();
router.post("/bookAppointment",upload.single('photo'),addBookingController);
router.post("/bookingHistory",upload.none(),getAllBookingController);
export default router;

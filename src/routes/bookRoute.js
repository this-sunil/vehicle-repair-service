import express from "express";
import upload from "../middleware/upload.js";
import { addBookingController,deleteBookingController,getAllBookingController } from "../controller/bookController.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router=express.Router();
router.post("/bookAppointment",upload.single('photo'),addBookingController);
router.post("/bookingHistory",upload.none(),verifyToken,getAllBookingController);
router.patch("/updateBookHistory",upload.single('photo'),verifyToken,getAllBookingController);
router.delete("/deleteBookHistory",upload.none(),deleteBookingController);

export default router;

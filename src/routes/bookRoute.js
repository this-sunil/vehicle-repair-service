import express from "express";
import upload from "../middleware/upload.js";
import { addBookingController, deleteBookingController, getAllBookingController, updateBookingController } from "../controller/bookController.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router=express.Router();
router.post("/bookAppointment",upload.single('vehicle_photo'),verifyToken,addBookingController);
router.post("/bookingHistory",upload.none(),verifyToken,getAllBookingController);
router.patch("/updateBookHistory",upload.single('vehicle_photo'),verifyToken,updateBookingController);
router.put("/updateBookHistory",upload.single('vehicle_photo'),verifyToken,updateBookingController);
router.delete("/deleteBookHistory",upload.none(),deleteBookingController);

export default router;

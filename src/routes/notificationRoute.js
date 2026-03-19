import express from "express";
import upload from "../middleware/upload.js";
import { addNotificationController, deleteNotificationController, fetchNotificationController, updateNotificationController } from "../controller/notificationController.js";
const router=express.Router();
router.post("/addNotification",upload.single('photo'),addNotificationController);
router.delete("/deleteNotification",upload.none(),deleteNotificationController);
router.patch("/updateNotification",upload.single('photo'),updateNotificationController);
router.post("/fetchNotification",upload.none(),fetchNotificationController);
export default router;

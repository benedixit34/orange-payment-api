import { Router } from "express";
import { confirmMasterclassPaymentController, getPendingBookingData, saveToClickUp } from "../controllers/masterclass.controller.js";

const router = Router();

router.post("/save", saveToClickUp);
router.get("/pending/:reference", getPendingBookingData);
router.post("/confirm", confirmMasterclassPaymentController);

export default router;
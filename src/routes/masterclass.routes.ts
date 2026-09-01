import { Router } from "express";
import { createPaymentBooking, saveToClickUp } from "../controllers/masterclass.controller.js";

const router = Router();

router.post("/", createPaymentBooking);
router.post("/save", saveToClickUp);


export default router;
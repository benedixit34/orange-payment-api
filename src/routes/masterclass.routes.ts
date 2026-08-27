import { Router } from "express";
import { createBooking } from "../controllers/masterclass.controller.js";

const router = Router();

router.post("/", createBooking);

export default router;
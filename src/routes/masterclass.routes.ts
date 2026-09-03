import { Router } from "express";
import { saveToClickUp } from "../controllers/masterclass.controller.js";

const router = Router();

router.post("/save", saveToClickUp);


export default router;
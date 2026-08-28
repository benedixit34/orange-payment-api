import express from "express";
import cors from "cors";
import masterclassRoutes from "./routes/masterclass.routes.js";
import { pinoHttp } from "pino-http";
import logger from "./utils/logger.js";

const httpLogger = pinoHttp({
    logger,
});

const app = express();

app.use(
    cors({
        origin: "*"
    })
);

app.use(express.json());


app.use(httpLogger)

app.get("/api/health", (_req, res) => {
    res.json({
        success: true,
        message: "Masterclass backend is running."
    });
});

app.use("/api/bookings", masterclassRoutes);

export default app;
import express from "express";
import cors from "cors";
import masterclassRoutes from "./routes/masterclass.routes.js";

const app = express();

app.use(
    cors({
        origin: "*"
    })
);

app.use(express.json());

app.get("/api/health", (_req, res) => {
    res.json({
        success: true,
        message: "Masterclass backend is running."
    });
});

app.use("/api/bookings", masterclassRoutes);

export default app;
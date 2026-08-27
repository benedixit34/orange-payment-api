import express from 'express';
import cors from "cors";
import masterclassRoutes from "./routes/masterclass.routes.js";

const app = express();
const PORT = 3000;

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

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});

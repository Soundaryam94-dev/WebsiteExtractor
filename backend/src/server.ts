import "dotenv/config"; // must be first — loads .env before any module reads process.env

import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { extractRoute } from "./api/extract";
import { listExtractions, deleteExtraction } from "./api/extractions";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    methods: ["POST", "GET", "DELETE"],
  })
);
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

const extractLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, error: "Too many requests. Try again in 15 minutes." },
});

app.post("/api/extract", extractLimiter, extractRoute);
app.get("/api/extractions", listExtractions);
app.delete("/api/extractions/:id", deleteExtraction);

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});

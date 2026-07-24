import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";

import jobRoutes from "../routes/jobRoutes.js";

dotenv.config();

const app = express();

const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many requests. Please try again in a minute."
  }
});

app.disable("x-powered-by");

app.use(cors());

app.use(
  express.json({
    limit: "5mb"
  })
);

console.log("🧠 SwapOpt Brain loaded");

app.get("/", (req, res) => {
  return res.status(200).json({
    status: "ok",
    message: "SwapOpt optimized backend running",
    endpoints: [
      "/analyze",
      "/tailor",
      "/resume-draft",
      "/application-help",
      "/cover-letter",
      "/network"
    ]
  });
});

app.use("/", aiLimiter, jobRoutes);

app.use((req, res) => {
  return res.status(404).json({
    error: "Route not found"
  });
});

app.use((err, req, res, next) => {
  console.error(err);

  if (res.headersSent) {
    return next(err);
  }

  const status =
    Number.isInteger(err.status) && err.status >= 400
      ? err.status
      : 500;

  return res.status(status).json({
    error:
      status === 500
        ? "Internal server error"
        : err.message,
    ...(process.env.NODE_ENV === "development" &&
      status === 500 && {
        details: err.stack
      })
  });
});

export default app;
import dotenv from "dotenv";
dotenv.config({ path: "./.env" });

import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";
import pool from "./config/db.js";

/* ================= ROUTES ================= */
import authRoutes from "./routes/auth.routes.js";
import progressRoutes from "./routes/progress.routes.js";
import dailyGoalsRoutes from "./routes/dailyGoals.js";
import quizResultRoutes from "./routes/quizResults.js";
import courseResultRoutes from "./routes/courseResults.js";
import achievementsRoute from "./routes/achievements.js";
import activityRoute from "./routes/activity.js";
import notificationsRoutes from "./routes/notifications.js";
import jobsRoutes from "./routes/jobs.routes.js";

/* ================= APP INIT ================= */

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://skillmutant-frontend.vercel.app",
    ],
    credentials: true,
  })
);
app.use(express.json());
app.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});
/* ================= STATIC ================= */

app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

/* ================= ROUTES ================= */

app.get("/", (_, res) => res.send("Backend running"));

app.use("/api/auth", authRoutes);
app.use("/api/progress", progressRoutes);
app.use("/api/daily-goals", dailyGoalsRoutes);
app.use("/api/quiz-results", quizResultRoutes);
app.use("/api/course-results", courseResultRoutes);
app.use("/api/achievements", achievementsRoute);
app.use("/api/activity", activityRoute);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/jobs", jobsRoutes);



/* ================= DB TEST ================= */

app.get("/test-db", async (_, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "DB connection failed" });
  }
});

/* ================= START SERVER ================= */
/* ================= START SERVER ================= */

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});
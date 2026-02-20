import express from "express";
import db from "../config/db.js";
import authMiddleware from "../middleware/auth.middleware.js";
import { unlockAchievement } from "../utils/unlockAchievements.js";
import { logActivity } from "../utils/logActivity.js";

const router = express.Router();

/**
 * POST quiz result
 */
router.post("/submit", authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const { topic, score, total } = req.body;

  if (!topic || score == null || total == null) {
    return res.status(400).json({ error: "Invalid quiz data" });
  }

  try {
    // 1️⃣ Save quiz attempt
    await db.query(
      `
      INSERT INTO quiz_results (user_id, topic, score, total, attempted_at)
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      `,
      [userId, topic, score, total]
    );

    // 2️⃣ If perfect score → check achievements
    if (score === total) {
      const result = await db.query(
        `
        SELECT COUNT(*) AS total
        FROM quiz_results
        WHERE user_id = $1 AND score = total
        `,
        [userId]
      );

      const count = parseInt(result.rows[0].total);

      if (count >= 1) {
        await unlockAchievement(userId, "quiz_perfect_1");
      }

      if (count >= 5) {
        await unlockAchievement(userId, "quiz_perfect_5");
      }
    }

    await logActivity(
      userId,
      "quiz",
      `Completed quiz on ${topic} (${score}/${total})`,
      { skill: topic }
    );

    res.json({ success: true });
  } catch (err) {
    console.error("Quiz submit error:", err);
    res.status(500).json({ error: "Failed to save quiz result" });
  }
});

/**
 * GET all quiz results for logged in user
 */
router.get("/my-results", authMiddleware, async (req, res) => {
  const userId = req.user.id;

  try {
    const result = await db.query(
      `
      SELECT topic, score, total, attempted_at
      FROM quiz_results
      WHERE user_id = $1
      ORDER BY attempted_at DESC
      `,
      [userId]
    );

    res.json({ results: result.rows });
  } catch (err) {
    console.error("Fetch quiz results error:", err);
    res.status(500).json({ error: "Failed to fetch results" });
  }
});

export default router;

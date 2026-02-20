import express from "express";
import db from "../config/db.js";
import authMiddleware from "../middleware/auth.middleware.js";
import { unlockAchievement } from "../utils/unlockAchievements.js";
import { logActivity } from "../utils/logActivity.js";

const router = express.Router();

/**
 * Mark course as completed
 */
router.post("/complete", authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const { courseId } = req.body;

  if (!courseId) {
    return res.status(400).json({ error: "Missing courseId" });
  }

  try {
    // 1️⃣ Insert completion (ignore duplicates)
    await db.query(
      `
      INSERT INTO course_results (user_id, course_id, completed_at)
      VALUES ($1, $2, CURRENT_TIMESTAMP)
      ON CONFLICT (user_id, course_id) DO NOTHING
      `,
      [userId, courseId]
    );

    // 2️⃣ Count completed courses
    const result = await db.query(
      `
      SELECT COUNT(*) AS total
      FROM course_results
      WHERE user_id = $1
      `,
      [userId]
    );

    const count = parseInt(result.rows[0].total);

    if (count >= 1) {
      await unlockAchievement(userId, "course_1");
    }

    if (count >= 5) {
      await unlockAchievement(userId, "course_5");
    }

    await logActivity(
      userId,
      "course",
      `Completed course: ${courseId}`
    );

    res.json({ success: true });
  } catch (err) {
    console.error("Course completion error:", err);
    res.status(500).json({ error: "Failed to mark course completed" });
  }
});

export default router;

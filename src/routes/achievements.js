import express from "express";
import db from "../config/db.js";
import authMiddleware from "../middleware/auth.middleware.js";

const router = express.Router();

/**
 * Get all achievements with unlock status
 */
router.get("/", authMiddleware, async (req, res) => {
  const userId = req.user.id;

  try {
    const result = await db.query(
      `
      SELECT 
        a.id,
        a.code,
        a.title,
        a.description,
        a.icon,
        CASE 
          WHEN ua.unlocked_at IS NOT NULL THEN true
          ELSE false
        END AS unlocked
      FROM achievements a
      LEFT JOIN user_achievements ua
        ON a.id = ua.achievement_id
        AND ua.user_id = $1
      ORDER BY a.id
      `,
      [userId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Achievements fetch error:", err);
    res.status(500).json({ error: "Failed to fetch achievements" });
  }
});

export default router;

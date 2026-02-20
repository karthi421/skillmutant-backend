import express from "express";
import db from "../config/db.js";
import authMiddleware from "../middleware/auth.middleware.js";

const router = express.Router();

/**
 * POST /api/activity/log
 */
/*
router.post("/log", authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const { type, title } = req.body;

  if (!type || !title) {
    return res.status(400).json({ error: "Missing activity data" });
  }

  try {
    await db.query(
      `
      INSERT INTO activity_log (user_id, type, title)
      VALUES ($1, $2, $3)
      `,
      [userId, type, title]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("Activity log error:", err);
    res.status(500).json({ error: "Failed to log activity" });
  }
});
*/
/**
 * GET weekly activity
 */
router.get("/weekly", authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      `
      SELECT DATE(created_at) as day, COUNT(*) as count
      FROM activity_log
      WHERE user_id = $1
        AND created_at >= NOW() - INTERVAL '7 days'
      GROUP BY day
      ORDER BY day;
      `,
      [req.user.id]
    );

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch weekly activity" });
  }
});
router.get("/all", authMiddleware, async (req, res) => {
  const userId = req.user.id;

  try {
    const result = await db.query(
      `
      SELECT type, title, created_at,meta
      FROM activity_log
      WHERE user_id = $1
      ORDER BY created_at DESC
      `,
      [userId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("All activity error:", err);
    res.status(500).json({ error: "Failed to fetch activities" });
  }
});

export default router;

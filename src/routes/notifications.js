import express from "express";
import db from "../config/db.js";
import authMiddleware from "../middleware/auth.middleware.js";

const router = express.Router();

/* ================= CREATE NOTIFICATION ================= */

router.post("/", authMiddleware, async (req, res) => {
  console.log("📩 notification POST body:", req.body);

  const userId = req.user.id;
  const { type, message, meta, timestamp } = req.body;

  const ALLOWED_TYPES = [
    "daily_goal_reminder",
    "daily_goal_completed",
    "achievement_unlocked",
    "streak_milestone"
  ];

  if (!ALLOWED_TYPES.includes(type)) {
    return res.json({ skipped: true });
  }

  try {
    await db.query(
      `
      INSERT INTO notifications
      (user_id, type, message, meta, created_at, is_read)
      VALUES ($1, $2, $3, $4, TO_TIMESTAMP($5 / 1000.0), FALSE)
      `,
      [
        userId,
        type,
        message,
        meta ? JSON.stringify(meta) : null,
        timestamp || Date.now(),
      ]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("Notification insert error:", err);
    res.status(500).json({ error: "Failed to log activity" });
  }
});

/* ================= FETCH LAST 24 HOURS ================= */

router.get("/", authMiddleware, async (req, res) => {
  const userId = req.user.id;

  try {
    const result = await db.query(
      `
      SELECT 
        id,
        type,
        message,
        meta,
        is_read,
        created_at
      FROM notifications
      WHERE user_id = $1
        AND created_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
      ORDER BY created_at DESC
      `,
      [userId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Notification fetch error:", err);
    res.status(500).json({ error: "Failed to fetch activities" });
  }
});

/* ================= UNREAD COUNT ================= */

router.get("/unread-count", authMiddleware, async (req, res) => {
  const userId = req.user.id;

  try {
    const result = await db.query(
      `
      SELECT COUNT(*) as count
      FROM notifications
      WHERE user_id = $1
        AND is_read = FALSE
        AND created_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
      `,
      [userId]
    );

    res.json({ count: parseInt(result.rows[0].count) });
  } catch (err) {
    console.error("Unread count error:", err);
    res.status(500).json({ error: "Failed to fetch unread count" });
  }
});

/* ================= MARK ALL READ ================= */

router.post("/mark-read", authMiddleware, async (req, res) => {
  const userId = req.user.id;

  try {
    await db.query(
      `
      UPDATE notifications
      SET is_read = TRUE
      WHERE user_id = $1
        AND created_at >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
      `,
      [userId]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("Mark read error:", err);
    res.status(500).json({ error: "Failed to mark as read" });
  }
});

export default router;

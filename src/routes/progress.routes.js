import express from "express";
import authMiddleware from "../middleware/auth.middleware.js";
import db from "../config/db.js";

const router = express.Router();

/* ================= LOGIN STREAK ================= */

router.get("/login-streak", authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      `
      SELECT DISTINCT DATE(created_at) as day
      FROM activity_log
      WHERE user_id = $1
      ORDER BY day DESC
      `,
      [req.user.id]
    );

    const days = result.rows.map(r =>
      r.day.toISOString().split("T")[0]
    );

    let streak = 0;
    let currentDate = new Date();

    while (true) {
      const dateStr = currentDate.toISOString().split("T")[0];

      if (days.includes(dateStr)) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }
    }

    res.json({
      current_streak: streak,
      logged_dates: days,
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch streak" });
  }
});

/* ================= ACTIVITY LOG ================= */

router.post("/activity", authMiddleware, async (req, res) => {
  try {
    const { type, title } = req.body;
    if (!type || !title)
      return res.status(400).json({ error: "Missing activity data" });

    const result = await db.query(
      `SELECT login_dates FROM users WHERE id = $1`,
      [req.user.id]
    );

    let data = result.rows[0]?.login_dates || {
      logins: [],
      activities: [],
    };

    data.activities.push({
      type,
      title,
      date: new Date().toISOString(),
    });

    await db.query(
      `UPDATE users SET login_dates = $1 WHERE id = $2`,
      [JSON.stringify(data), req.user.id]
    );

    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to log activity" });
  }
});

/* ================= MONTHLY ANALYTICS ================= */
router.get("/analytics", authMiddleware, async (req, res) => {
  try {
    const month =
      req.query.month || new Date().toISOString().slice(0, 7);

    const result = await db.query(
      `
      SELECT created_at
      FROM activity_log
      WHERE user_id = $1
        AND TO_CHAR(created_at, 'YYYY-MM') = $2
      `,
      [req.user.id, month]
    );

    const totalActivities = result.rows.length;

    const weeks = {};
    result.rows.forEach(r => {
      const week = Math.ceil(new Date(r.created_at).getDate() / 7);
      weeks[week] = (weeks[week] || 0) + 1;
    });

    const mostActive =
      Object.entries(weeks).sort((a, b) => b[1] - a[1])[0];

    res.json({
      month,
      total_activities: totalActivities,
      most_active_week: mostActive
        ? `Week ${mostActive[0]}`
        : "N/A",
    });
  } catch (err) {
    res.status(500).json({ error: "Analytics failed" });
  }
});

export default router;

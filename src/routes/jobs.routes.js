import express from "express";
import authMiddleware from "../middleware/auth.middleware.js";
import db from "../config/db.js";
import { logActivity } from "../utils/logActivity.js";

const router = express.Router();

/* ================= SAVED JOBS ================= */

// Get saved jobs
router.get("/saved", authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      `
      SELECT *
      FROM saved_jobs
      WHERE user_id = $1
      ORDER BY created_at DESC
      `,
      [req.user.id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Fetch saved jobs error:", err);
    res.status(500).json({ error: "Failed to fetch saved jobs" });
  }
});

// Save a job
router.post("/save", authMiddleware, async (req, res) => {
  const { job_id, platform, title, company, data } = req.body;
   console.log("SAVE ROUTE HIT");
    console.log("USER:", req.user);
  console.log("BODY:", req.body);
  try {
    await db.query(
      `
      INSERT INTO saved_jobs
      (user_id, job_id, platform, title, company, data)
      VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [
        req.user.id,
        job_id,
        platform,
        title,
        company,
        JSON.stringify(data || {})
      ]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("Save job error:", err);
    res.status(500).json({ error: "Failed to save job" });
  }
});

// Remove saved job
router.delete("/saved/:jobId", authMiddleware, async (req, res) => {
  try {
    await db.query(
      `
      DELETE FROM saved_jobs
      WHERE user_id = $1 AND job_id = $2
      `,
      [req.user.id, req.params.jobId]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("Delete saved job error:", err);
    res.status(500).json({ error: "Failed to delete saved job" });
  }
});

/* ================= INTERVIEW FEEDBACK ================= */

// Get interview feedbacks
router.get("/interviews/feedbacks", authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      `
      SELECT *
      FROM interview_feedbacks
      WHERE user_id = $1
      ORDER BY created_at DESC
      `,
      [req.user.id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("Fetch interview feedback error:", err);
    res.status(500).json({ error: "Failed to fetch feedbacks" });
  }
});

// Mark feedback as read
router.patch(
  "/interviews/feedbacks/:id/read",
  authMiddleware,
  async (req, res) => {
    try {
      await db.query(
        `
        UPDATE interview_feedbacks
        SET is_read = TRUE
        WHERE id = $1 AND user_id = $2
        `,
        [req.params.id, req.user.id]
      );

      res.json({ success: true });
    } catch (err) {
      console.error("Mark feedback read error:", err);
      res.status(500).json({ error: "Failed to update feedback" });
    }
  }
);

// Save interview feedback
router.post(
  "/interviews/feedbacks",
  authMiddleware,
  async (req, res) => {
    const { company, role, score, feedback } = req.body;

    try {
      await db.query(
        `
        INSERT INTO interview_feedbacks
        (user_id, company, role, score, feedback)
        VALUES ($1, $2, $3, $4, $5)
        `,
        [
          req.user.id,
          company,
          role,
          score,
          JSON.stringify(feedback || {})
        ]
      );

      // ✅ ADD THIS PART
      await logActivity(
        req.user.id,
        "interview",
        `Completed mock interview for ${role} at ${company}`,
        { skill: role }
      );

      res.json({ success: true });
    } catch (err) {
      console.error("Insert interview feedback error:", err);
      res.status(500).json({ error: "Failed to save feedback" });
    }
  }
);
/* ================= LEARNING ROOM ACTIVITY ================= */

router.post(
  "/learning-room",
  authMiddleware,
  async (req, res) => {
    const { roomId } = req.body;

    if (!roomId) {
      return res.status(400).json({ error: "Missing roomId" });
    }

    try {
      await logActivity(
        req.user.id,
        "learning",
        `Joined Learning Room (${roomId})`,
        { skill: "collaboration" }
      );

      res.json({ success: true });
    } catch (err) {
      console.error("Learning room log error:", err);
      res.status(500).json({ error: "Failed to log learning room activity" });
    }
  }
);

export default router;

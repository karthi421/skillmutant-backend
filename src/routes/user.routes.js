import express from "express";
import authMiddleware from "../middlewares/auth.middleware.js";
import db from "../config/db.js";

const router = express.Router();

router.get("/me", authMiddleware, async (req, res) => {
  try {
    const result = await db.query(
      `SELECT id, name, email, role, created_at
       FROM users
       WHERE id = $1`,
      [req.user.id]
    );

    res.json(result.rows[0] || null);
  } catch (err) {
    console.error("Fetch user error:", err);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

export default router;

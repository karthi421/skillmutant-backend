import express from "express";
import db from "../config/db.js";
import authMiddleware from "../middleware/auth.middleware.js";
import { unlockAchievement } from "../utils/unlockAchievements.js";
import { logActivity } from "../utils/logActivity.js";

const router = express.Router();

/* ================= GET DAILY GOALS ================= */

router.get("/", authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const today = new Date().toISOString().slice(0, 10);
  const DAILY_COUNT = 3;

  try {
    // 1️⃣ Check existing goals
    const existingResult = await db.query(
      `
      SELECT 
        dg.id AS "dailyGoalId",
        pb.id,
        pb.platform,
        pb.title,
        pb.difficulty,
        pb.url,
        dg.completed
      FROM daily_goals dg
      JOIN problem_bank pb ON pb.id = dg.problem_id
      WHERE dg.user_id = $1 AND dg.goal_date = $2
      `,
      [userId, today]
    );

    if (existingResult.rows.length > 0) {
      return res.json(existingResult.rows);
    }

    const newGoals = [];

    // 2️⃣ Random topics
    const topicsResult = await db.query(
      `SELECT id FROM topics ORDER BY RANDOM() LIMIT $1`,
      [DAILY_COUNT]
    );

    for (const topic of topicsResult.rows) {
      const problemResult = await db.query(
        `
        SELECT pb.*
        FROM problem_bank pb
        LEFT JOIN solved_problems sp
          ON pb.id = sp.problem_id AND sp.user_id = $1
        WHERE pb.topic_id = $2
          AND sp.id IS NULL
        ORDER BY RANDOM()
        LIMIT 1
        `,
        [userId, topic.id]
      );

      if (problemResult.rows.length === 0) continue;

      const problem = problemResult.rows[0];

      await db.query(
        `
        INSERT INTO daily_goals (user_id, problem_id, goal_date)
        VALUES ($1, $2, $3)
        ON CONFLICT DO NOTHING
        `,
        [userId, problem.id, today]
      );

      newGoals.push({
        dailyGoalId: null,
        id: problem.id,
        platform: problem.platform,
        title: problem.title,
        difficulty: problem.difficulty,
        url: problem.url,
        completed: false,
      });
    }

    // 3️⃣ Fallback problems
    if (newGoals.length < DAILY_COUNT) {
      const remaining = DAILY_COUNT - newGoals.length;

      const fallbackResult = await db.query(
        `
        SELECT pb.*
        FROM problem_bank pb
        LEFT JOIN solved_problems sp
          ON pb.id = sp.problem_id AND sp.user_id = $1
        WHERE sp.id IS NULL
          AND pb.id NOT IN (
            SELECT problem_id
            FROM daily_goals
            WHERE user_id = $2 AND goal_date = $3
          )
        ORDER BY RANDOM()
        LIMIT $4
        `,
        [userId, userId, today, remaining]
      );

      for (const p of fallbackResult.rows) {
        await db.query(
          `
          INSERT INTO daily_goals (user_id, problem_id, goal_date)
          VALUES ($1, $2, $3)
          ON CONFLICT DO NOTHING
          `,
          [userId, p.id, today]
        );

        newGoals.push({
          dailyGoalId: null,
          id: p.id,
          platform: p.platform,
          title: p.title,
          difficulty: p.difficulty,
          url: p.url,
          completed: false,
        });
      }
    }

    return res.json(newGoals);
  } catch (err) {
    console.error("Daily goals error:", err);
    return res.status(500).json({ error: "Failed to generate daily goals" });
  }
});

/* ================= COMPLETE DAILY GOAL ================= */

router.post("/:problemId/complete", authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const problemId = req.params.problemId;
  const today = new Date().toISOString().slice(0, 10);

  try {
    const goalResult = await db.query(
      `
      SELECT completed
      FROM daily_goals
      WHERE user_id = $1 AND problem_id = $2 AND goal_date = $3
      `,
      [userId, problemId, today]
    );

    const goal = goalResult.rows[0];

    if (!goal) {
      return res.status(404).json({ error: "Daily goal not found" });
    }

    if (goal.completed) {
      return res.json({ success: true, alreadyCompleted: true });
    }

    await db.query(
      `
      UPDATE daily_goals
      SET completed = TRUE, completed_at = CURRENT_TIMESTAMP
      WHERE user_id = $1 AND problem_id = $2 AND goal_date = $3
      `,
      [userId, problemId, today]
    );

    await db.query(
      `
      INSERT INTO solved_problems (user_id, problem_id, solved_at)
      VALUES ($1, $2, CURRENT_DATE)
      ON CONFLICT (user_id, problem_id) DO NOTHING
      `,
      [userId, problemId]
    );

    const countResult = await db.query(
      `SELECT COUNT(*) AS total FROM solved_problems WHERE user_id = $1`,
      [userId]
    );

    const totalSolved = parseInt(countResult.rows[0].total);

    if (totalSolved >= 1) await unlockAchievement(userId, "solve_1");
    if (totalSolved >= 10) await unlockAchievement(userId, "solve_10");
    if (totalSolved >= 50) await unlockAchievement(userId, "solve_50");
    if (totalSolved >= 100) await unlockAchievement(userId, "solve_100");

    const userResult = await db.query(
      `
      SELECT current_streak, last_solved_date
      FROM users
      WHERE id = $1
      `,
      [userId]
    );

    const user = userResult.rows[0];

    let newStreak = 1;

    if (user.last_solved_date) {
      const last = new Date(user.last_solved_date);
      const diffDays =
        (new Date(today) - last) / (1000 * 60 * 60 * 24);

      if (diffDays === 1) newStreak = user.current_streak + 1;
      else if (diffDays === 0) newStreak = user.current_streak;
    }

    await db.query(
      `
      UPDATE users
      SET current_streak = $1, last_solved_date = $2
      WHERE id = $3
      `,
      [newStreak, today, userId]
    );

    if (newStreak >= 3) await unlockAchievement(userId, "streak_3");
    if (newStreak >= 7) await unlockAchievement(userId, "streak_7");
    if (newStreak >= 30) await unlockAchievement(userId, "streak_30");

    const problemResult = await db.query(
      `SELECT title FROM problem_bank WHERE id = $1`,
      [problemId]
    );

    const problemTitle =
      problemResult.rows[0]?.title || "a problem";

    await logActivity(
      userId,
      "daily_goal",
      `Solved problem: ${problemTitle}`
    );

    return res.json({
      success: true,
      newStreak,
    });
  } catch (err) {
    console.error("Complete daily goal error:", err);
    return res.status(500).json({ error: "Failed to mark solved" });
  }
});

export default router;

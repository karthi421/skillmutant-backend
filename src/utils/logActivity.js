import db from "../config/db.js";

export async function logActivity(userId, type, title, meta = {}) {
  console.log("🔥 LOG ACTIVITY META:", meta);

  await db.query(
    `
    INSERT INTO activity_log (user_id, type, title, meta)
    VALUES ($1, $2, $3, $4)
    `,
    [userId, type, title, JSON.stringify(meta)]
  );
}

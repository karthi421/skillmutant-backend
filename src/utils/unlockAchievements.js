import db from "../config/db.js";

export async function unlockAchievement(userId, code) {
  await db.query(
    `
    INSERT INTO user_achievements (user_id, achievement_id)
    SELECT $1, id FROM achievements WHERE code = $2
    ON CONFLICT (user_id, achievement_id) DO NOTHING
    `,
    [userId, code]
  );
}

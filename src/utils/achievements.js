export const ACHIEVEMENTS = {
  STREAK_3: "3_day_streak",
  STREAK_7: "7_day_streak",
  STREAK_14: "14_day_streak",
  FIRST_AI: "first_ai_use",
  MOCK_5: "mock_master",
};

export function evaluateAchievements({ data, loginStreak }) {
  const unlocked = new Set(data.achievements || []);

  // 🔥 Streak-based
  if (loginStreak >= 3) unlocked.add(ACHIEVEMENTS.STREAK_3);
  if (loginStreak >= 7) unlocked.add(ACHIEVEMENTS.STREAK_7);
  if (loginStreak >= 14) unlocked.add(ACHIEVEMENTS.STREAK_14);

  // 🧠 AI usage
  const aiActivities = (data.activities || []).filter(a =>
    ["resume", "mock", "job", "course"].includes(a.type)
  );

  if (aiActivities.length >= 1) {
    unlocked.add(ACHIEVEMENTS.FIRST_AI);
  }

  // 🎤 Mock interviews
  const mockCount = aiActivities.filter(a => a.type === "mock").length;
  if (mockCount >= 5) {
    unlocked.add(ACHIEVEMENTS.MOCK_5);
  }

  return Array.from(unlocked);
}

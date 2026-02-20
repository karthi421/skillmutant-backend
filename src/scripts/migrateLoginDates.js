import db from "../config/db.js";

(async () => {
  try {
    const result = await db.query(
      "SELECT id, login_dates FROM users"
    );

    const users = result.rows;

    for (const user of users) {
      let data = user.login_dates;

      // CASE 1: already new format → skip
      if (
        data &&
        typeof data === "object" &&
        !Array.isArray(data) &&
        data.logins
      ) {
        continue;
      }

      // CASE 2: old array format
      if (Array.isArray(data)) {
        const migrated = {
          logins: data,
          activities: [],
          achievements: [],
        };

        await db.query(
          "UPDATE users SET login_dates = $1 WHERE id = $2",
          [JSON.stringify(migrated), user.id]
        );

        console.log(`✅ Migrated user ${user.id}`);
      }

      // CASE 3: null / empty
      if (!data) {
        const migrated = {
          logins: [],
          activities: [],
          achievements: [],
        };

        await db.query(
          "UPDATE users SET login_dates = $1 WHERE id = $2",
          [JSON.stringify(migrated), user.id]
        );

        console.log(`✅ Initialized user ${user.id}`);
      }
    }

    console.log("🎉 Migration completed successfully");
    process.exit(0);

  } catch (err) {
    console.error("❌ Migration failed:", err);
    process.exit(1);
  }
})();

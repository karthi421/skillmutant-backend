import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import db from "../config/db.js";
import { evaluateAchievements } from "../utils/achievements.js";

/* ================= LOGIN STREAK HELPER ================= */

const calculateLoginStreak = (user) => {
  const today = new Date().toISOString().slice(0, 10);

  let loginStreak = user.login_streak || 0;
  let maxStreak = user.max_streak || 0;
  const lastLogin = user.last_login;

  if (!lastLogin) {
    loginStreak = 1;
  } else {
    const diff =
      (new Date(today) - new Date(lastLogin)) /
      (1000 * 60 * 60 * 24);

    if (diff === 1) loginStreak += 1;
    else if (diff > 1) loginStreak = 1;
  }

  maxStreak = Math.max(maxStreak, loginStreak);

  return {
    login_streak: loginStreak,
    max_streak: maxStreak,
    last_login: today,
  };
};

/* ================= UPDATE LOGIN DATES + ACTIVITY ================= */

const updateLoginDatesAndActivity = async (userId, loginStreak = null) => {
  const today = new Date().toISOString().slice(0, 10);

  const result = await db.query(
    "SELECT login_dates FROM users WHERE id = $1",
    [userId]
  );

  let data = result.rows[0]?.login_dates;

  if (Array.isArray(data)) {
    data = { logins: data, activities: [], achievements: [] };
  }

  if (!data) {
    data = { logins: [], activities: [], achievements: [] };
  }

  data.logins = data.logins || [];
  data.activities = data.activities || [];
  data.achievements = data.achievements || [];

  if (!data.logins.includes(today)) {
    data.logins.push(today);
  }

  data.activities.push({
    type: "login",
    title: "Logged in to platform",
    date: new Date().toISOString(),
  });

  data.achievements = evaluateAchievements({
    data,
    loginStreak,
  });

  await db.query(
    "UPDATE users SET login_dates = $1 WHERE id = $2",
    [JSON.stringify(data), userId]
  );
};

/* ================= GOOGLE LOGIN ================= */

export const googleLogin = async (req, res) => {
  try {
    const { email, googleId } = req.body;

    const result = await db.query(
      `SELECT id, username, password_hash,
              login_streak, max_streak, last_login
       FROM users WHERE email = $1`,
      [email]
    );

    if (result.rows.length > 0) {
      const user = result.rows[0];

      const streak = calculateLoginStreak(user);

      await db.query(
        `UPDATE users
         SET login_streak = $1,
             max_streak = $2,
             last_login = $3
         WHERE id = $4`,
        [
          streak.login_streak,
          streak.max_streak,
          streak.last_login,
          user.id,
        ]
      );

      await updateLoginDatesAndActivity(user.id, streak.login_streak);

      const token = jwt.sign(
        { id: user.id },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      return res.json({
        existing: !!user.username,
        token,
      });
    }

    const insert = await db.query(
      `INSERT INTO users (email, google_id, role)
       VALUES ($1, $2, 'student')
       RETURNING id`,
      [email, googleId]
    );

    const newUserId = insert.rows[0].id;

    await updateLoginDatesAndActivity(newUserId, 1);

    const token = jwt.sign(
      { id: newUserId },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ existing: false, token });

  } catch (err) {
    console.error("Google login error:", err);
    res.status(500).json({ error: "Google login failed" });
  }
};

/* ================= COMPLETE ACCOUNT ================= */

export const completeAccount = async (req, res) => {
  try {
    const { email, username, password } = req.body;

    if (!email || !username || !password) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const hash = await bcrypt.hash(password, 10);

    await db.query(
      `UPDATE users
       SET username = $1,
           password_hash = $2
       WHERE email = $3`,
      [username, hash, email]
    );

    const result = await db.query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );

    const token = jwt.sign(
      { id: result.rows[0].id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ token });

  } catch (err) {
    console.error("Complete account error:", err);
    res.status(500).json({ error: "Account completion failed" });
  }
};

/* ================= PASSWORD LOGIN ================= */

export const loginPassword = async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await db.query(
      "SELECT * FROM users WHERE email = $1",
      [email]
    );

    if (!result.rows.length) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const user = result.rows[0];

   if (!user.password_hash) {
  return res.status(401).json({ error: "Use Google login for this account" });
}

const valid = await bcrypt.compare(password, user.password_hash);

if (!valid) {
  return res.status(401).json({ error: "Invalid credentials" });
}


    if (!valid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const streak = calculateLoginStreak(user);

    await db.query(
      `UPDATE users
       SET login_streak = $1,
           max_streak = $2,
           last_login = $3
       WHERE id = $4`,
      [
        streak.login_streak,
        streak.max_streak,
        streak.last_login,
        user.id,
      ]
    );

    await updateLoginDatesAndActivity(user.id, streak.login_streak);

    const token = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({ token });

  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
};

/* ================= GET CURRENT USER ================= */

export const getMe = async (req, res) => {
  try {
    const auth = req.headers.authorization;

    if (!auth || !auth.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token" });
    }

    const token = auth.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const result = await db.query(
      `SELECT id, name, username, email,
              college, bio, profile_pic,
              role, login_streak, max_streak,
              last_login, login_dates
       FROM users
       WHERE id = $1`,
      [decoded.id]
    );

    const user = result.rows[0];

    const data = user.login_dates || {
      logins: [],
      activities: [],
      achievements: [],
    };

    res.json({
      ...user,
      login_dates: data.logins || [],
      activities: data.activities || [],
      achievements: data.achievements || [],
    });

  } catch (err) {
    console.error("getMe error:", err);
    res.status(401).json({ error: "Invalid token" });
  }
};

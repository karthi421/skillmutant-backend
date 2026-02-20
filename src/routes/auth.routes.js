import express from "express";
import multer from "multer";
import crypto from "crypto";
import bcrypt from "bcrypt";
import { sendMail } from "../utils/sendMail.js";
import authMiddleware from "../middleware/auth.middleware.js";
import db from "../config/db.js";

const router = express.Router();

import {
  googleLogin,
  completeAccount,
  loginPassword,
  getMe,
} from "../controllers/auth.controller.js";

router.post("/google", googleLogin);
router.post("/complete-account", completeAccount);
router.post("/login", loginPassword);
router.get("/me", authMiddleware, getMe);


/* ================= FORGOT PASSWORD ================= */

router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;

  const result = await db.query(
    "SELECT id FROM users WHERE email = $1",
    [email]
  );

  const user = result.rows[0];

  if (!user) {
    return res.json({ success: true });
  }

  const token = crypto.randomBytes(32).toString("hex");
  const expiry = new Date(Date.now() + 15 * 60 * 1000);

  await db.query(
    `
    UPDATE users
    SET reset_token = $1,
        reset_token_expiry = $2
    WHERE id = $3
    `,
    [token, expiry, user.id]
  );

  const resetLink = `http://localhost:3000/reset-password/${token}`;

  try {
    await sendMail({
      to: email,
      subject: "Reset your SkillMutant password",
      html: `
        <div style="font-family: Arial, sans-serif">
          <h2>Reset your password</h2>
          <p>You requested to reset your password.</p>
          <a href="${resetLink}" style="
            display:inline-block;
            padding:10px 16px;
            background:#22d3ee;
            color:#000;
            text-decoration:none;
            border-radius:6px;
            font-weight:bold;">
            Reset Password
          </a>
          <p>This link expires in 15 minutes.</p>
        </div>
      `,
    });
  } catch (err) {
    console.error("Mail send failed:", err.message);
  }

  res.json({ success: true });
});

/* ================= RESET PASSWORD ================= */

router.post("/reset-password", async (req, res) => {
  const { token, newPassword } = req.body;

  const result = await db.query(
    `
    SELECT id FROM users
    WHERE reset_token = $1
      AND reset_token_expiry > CURRENT_TIMESTAMP
    `,
    [token]
  );

  const user = result.rows[0];

  if (!user) {
    return res.status(400).json({ error: "Invalid or expired token" });
  }

  const hashed = await bcrypt.hash(newPassword, 10);

  await db.query(
    `
    UPDATE users
    SET password = $1,
        reset_token = NULL,
        reset_token_expiry = NULL
    WHERE id = $2
    `,
    [hashed, user.id]
  );

  res.json({ success: true });
});

/* ================= PROFILE UPDATE ================= */

const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });

router.put(
  "/update-profile",
  authMiddleware,
  upload.single("profile_pic"),
  async (req, res) => {
    const { name, college, bio } = req.body;
    const pic = req.file?.filename || null;

    await db.query(
      `
      UPDATE users
      SET
        name = $1,
        college = $2,
        bio = $3,
        profile_pic = COALESCE($4, profile_pic)
      WHERE id = $5
      `,
      [name, college, bio, pic, req.user.id]
    );

    const result = await db.query(
      `
      SELECT id, name, email, college, bio, profile_pic
      FROM users
      WHERE id = $1
      `,
      [req.user.id]
    );

    res.json(result.rows[0]);
  }
);

export default router;

/*import {
  googleLogin,
  completeAccount,
  loginPassword,
  getMe,
} from "../controllers/auth.controller.js";

const router = express.Router();

router.post("/google", googleLogin);
router.post("/complete-account", completeAccount);
router.post("/login", loginPassword);
router.get("/me", getMe);



//image uplaod
const upload = multer({ dest: "uploads/" });

router.put(
  "/update-profile",
  authMiddleware,
  upload.single("profile_pic"),
  async (req, res) => {
    try {
      const { name } = req.body;
      const profilePic = req.file ? req.file.filename : null;

      await req.db.query(
        "UPDATE users SET name=?, profile_pic=? WHERE id=?",
        [name, profilePic, req.user.id]
      );

      const [rows] = await req.db.query(
        "SELECT id, name, email, profile_pic FROM users WHERE id=?",
        [req.user.id]
      );

      res.json(rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Profile update failed" });
    }
  }
);

export default router;




*/
/*
import authMiddleware from "../middleware/auth.middleware.js";
import db from "../config/db.js";

const upload = multer({ dest: "uploads/" });

router.put(
  "/update-profile",
  authMiddleware,
  upload.single("profile_pic"),
  async (req, res) => {
    const { name, bio, college } = req.body;
    const profilePic = req.file ? req.file.filename : null;

    await db.query(
      "UPDATE users SET name=?, bio=?, college=?, profile_pic=? WHERE id=?",
      [name, bio, college, profilePic, req.user.id]
    );

    const [rows] = await db.query(
      "SELECT name, username, email, bio, college, profile_pic FROM users WHERE id=?",
      [req.user.id]
    );

    res.json(rows[0]);
  }
);
 */

/*
router.put(
  "/update-profile",
  authMiddleware,
  upload.single("profile_pic"),
  async (req, res) => {

    console.log("FILE:", req.file); // MUST NOT be undefined

    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    await db.query(
      "UPDATE users SET profile_pic=? WHERE id=?",
      [req.file.filename, req.user.id]
    );

    const [rows] = await db.query(
      "SELECT id, name, username, email, college, bio, profile_pic FROM users WHERE id=?",
      [req.user.id]
    );

    res.json(rows[0]);
  }
);
*/
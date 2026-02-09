const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const pool = require("../db");
const requireAuth = require("../middleware/requireAuth");

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ ok: false, error: "Username and password required" });
    }

    const [rows] = await pool.query("SELECT * FROM users WHERE username=?", [username]);
    if (!rows.length) {
      return res.status(401).json({ ok: false, error: "Invalid credentials" });
    }

    const ok = await bcrypt.compare(password, rows[0].password_hash);
    if (!ok) {
      return res.status(401).json({ ok: false, error: "Invalid credentials" });
    }

    req.session.user = { id: rows[0].id, username: rows[0].username };
    return res.json({ ok: true, user: req.session.user });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
});

// POST /api/auth/logout
router.post("/logout", requireAuth, (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

// GET /api/auth/me
router.get("/me", requireAuth, (req, res) => {
  res.json({ ok: true, user: req.session.user });
});

module.exports = router;

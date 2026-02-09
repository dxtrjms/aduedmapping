require("dotenv").config();
const express = require("express");
const session = require("express-session");
const helmet = require("helmet");
const bcrypt = require("bcrypt");
const pool = require("./db");
const path = require("path");

const app = express();

app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: "200kb" }));
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET || "dev_secret",
  resave: false,
  saveUninitialized: false,
  cookie: { httpOnly: true }
}));

// ===== API routes =====
app.use("/api/data", require("./routes/ingest"));
app.use("/api/auth", require("./routes/auth"));
app.use("/api/nodes", require("./routes/nodes"));
app.use("/api/readings", require("./routes/readings"));
app.use("/api/walls", require("./routes/walls"));
app.use("/api/canvases", require("./routes/canvases"));
app.use("/api", require("./routes/canvas-elements"));

// ===== Serve React SPA =====
app.use(express.static(path.join(__dirname, "client", "dist")));

app.get("{*path}", (req, res) => {
  res.sendFile(path.join(__dirname, "client", "dist", "index.html"));
});

// ===== Bootstrap =====
async function ensureAdmin() {
  const adminUser = process.env.ADMIN_USERNAME;
  const adminPass = process.env.ADMIN_PASSWORD;

  const [rows] = await pool.query("SELECT id FROM users WHERE username=?", [adminUser]);
  if (rows.length) return;

  const hash = await bcrypt.hash(adminPass, 12);
  await pool.query("INSERT INTO users (username, password_hash) VALUES (?,?)", [adminUser, hash]);
  console.log("[INIT] Admin created:", adminUser);
}

(async () => {
  await ensureAdmin();
  const port = Number(process.env.PORT || 3000);
  app.listen(port, "0.0.0.0", () => console.log(`Server running on :${port}`));
})();

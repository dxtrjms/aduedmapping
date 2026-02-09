const express = require("express");
const router = express.Router();
const pool = require("../db");
const requireAuth = require("../middleware/requireAuth");

router.use(requireAuth);

// GET /api/canvases
router.get("/", async (req, res) => {
  try {
    const [canvases] = await pool.query("SELECT * FROM canvases ORDER BY id ASC");
    res.json({ ok: true, canvases });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: "Server error" });
  }
});

// POST /api/canvases
router.post("/", async (req, res) => {
  try {
    const { name, width, height } = req.body;
    if (!name || typeof width !== "number" || typeof height !== "number") {
      return res.status(400).json({ ok: false, error: "name, width, height required" });
    }
    const [result] = await pool.query(
      "INSERT INTO canvases (name, width, height) VALUES (?,?,?)",
      [name, width, height]
    );
    const [rows] = await pool.query("SELECT * FROM canvases WHERE id=?", [result.insertId]);
    res.json({ ok: true, canvas: rows[0] });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: "Server error" });
  }
});

// PUT /api/canvases/:id
router.put("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { name, width, height } = req.body;
    await pool.query(
      "UPDATE canvases SET name=?, width=?, height=? WHERE id=?",
      [name, width, height, id]
    );
    const [rows] = await pool.query("SELECT * FROM canvases WHERE id=?", [id]);
    if (!rows.length) return res.status(404).json({ ok: false, error: "Canvas not found" });
    res.json({ ok: true, canvas: rows[0] });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: "Server error" });
  }
});

// DELETE /api/canvases/:id
router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const [result] = await pool.query("DELETE FROM canvases WHERE id=?", [id]);
    if (!result.affectedRows) return res.status(404).json({ ok: false, error: "Canvas not found" });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: "Server error" });
  }
});

module.exports = router;

const express = require("express");
const router = express.Router();
const pool = require("../db");
const requireAuth = require("../middleware/requireAuth");

router.use(requireAuth);

// GET /api/walls?canvas_id=X
router.get("/", async (req, res) => {
  try {
    const canvasId = req.query.canvas_id ? parseInt(req.query.canvas_id, 10) : null;
    let sql = "SELECT * FROM walls";
    const args = [];
    if (canvasId) {
      sql += " WHERE canvas_id=?";
      args.push(canvasId);
    }
    sql += " ORDER BY id ASC";
    const [walls] = await pool.query(sql, args);
    res.json({ ok: true, walls });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: "Server error" });
  }
});

// POST /api/walls
router.post("/", async (req, res) => {
  try {
    const { x1, y1, x2, y2, canvas_id } = req.body;
    if ([x1, y1, x2, y2].some((v) => typeof v !== "number")) {
      return res.status(400).json({ ok: false, error: "x1, y1, x2, y2 must all be numbers" });
    }
    const cid = canvas_id || 1;
    const [result] = await pool.query(
      "INSERT INTO walls (canvas_id, x1, y1, x2, y2) VALUES (?,?,?,?,?)",
      [cid, x1, y1, x2, y2]
    );
    const [rows] = await pool.query("SELECT * FROM walls WHERE id=?", [result.insertId]);
    res.json({ ok: true, wall: rows[0] });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: "Server error" });
  }
});

// PUT /api/walls/:id
router.put("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { x1, y1, x2, y2 } = req.body;
    if ([x1, y1, x2, y2].some((v) => typeof v !== "number")) {
      return res.status(400).json({ ok: false, error: "x1, y1, x2, y2 must all be numbers" });
    }
    await pool.query("UPDATE walls SET x1=?, y1=?, x2=?, y2=? WHERE id=?", [x1, y1, x2, y2, id]);
    const [rows] = await pool.query("SELECT * FROM walls WHERE id=?", [id]);
    if (!rows.length) return res.status(404).json({ ok: false, error: "Wall not found" });
    res.json({ ok: true, wall: rows[0] });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: "Server error" });
  }
});

// DELETE /api/walls/:id
router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const [result] = await pool.query("DELETE FROM walls WHERE id=?", [id]);
    if (!result.affectedRows) return res.status(404).json({ ok: false, error: "Wall not found" });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: "Server error" });
  }
});

module.exports = router;

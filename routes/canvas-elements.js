const express = require("express");
const router = express.Router();
const pool = require("../db");
const requireAuth = require("../middleware/requireAuth");

router.use(requireAuth);

// GET /api/canvases/:canvasId/elements
router.get("/canvases/:canvasId/elements", async (req, res) => {
  try {
    const canvasId = parseInt(req.params.canvasId, 10);
    const [elements] = await pool.query(
      "SELECT * FROM canvas_elements WHERE canvas_id=? ORDER BY id ASC",
      [canvasId]
    );
    // Parse JSON points field
    for (const el of elements) {
      if (el.points && typeof el.points === "string") {
        try { el.points = JSON.parse(el.points); } catch {}
      }
    }
    res.json({ ok: true, elements });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: "Server error" });
  }
});

// POST /api/canvases/:canvasId/elements
router.post("/canvases/:canvasId/elements", async (req, res) => {
  try {
    const canvasId = parseInt(req.params.canvasId, 10);
    const { type, x, y, width, height, radius, points, text, icon,
            fill_color, stroke_color, stroke_width, font_size, rotation } = req.body;
    if (!type || typeof x !== "number" || typeof y !== "number") {
      return res.status(400).json({ ok: false, error: "type, x, y required" });
    }
    const [result] = await pool.query(
      `INSERT INTO canvas_elements
       (canvas_id, type, x, y, width, height, radius, points, text, icon,
        fill_color, stroke_color, stroke_width, font_size, rotation)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [canvasId, type, x, y, width || null, height || null, radius || null,
       points ? JSON.stringify(points) : null, text || null, icon || null,
       fill_color || "#3b82f6", stroke_color || "#1e3a5f",
       stroke_width ?? 2, font_size ?? 14, rotation ?? 0]
    );
    const [rows] = await pool.query("SELECT * FROM canvas_elements WHERE id=?", [result.insertId]);
    const el = rows[0];
    if (el.points && typeof el.points === "string") {
      try { el.points = JSON.parse(el.points); } catch {}
    }
    res.json({ ok: true, element: el });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: "Server error" });
  }
});

// PUT /api/canvas-elements/:id
router.put("/canvas-elements/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { type, x, y, width, height, radius, points, text, icon,
            fill_color, stroke_color, stroke_width, font_size, rotation } = req.body;
    await pool.query(
      `UPDATE canvas_elements SET
       type=?, x=?, y=?, width=?, height=?, radius=?, points=?, text=?, icon=?,
       fill_color=?, stroke_color=?, stroke_width=?, font_size=?, rotation=?
       WHERE id=?`,
      [type, x, y, width || null, height || null, radius || null,
       points ? JSON.stringify(points) : null, text || null, icon || null,
       fill_color || "#3b82f6", stroke_color || "#1e3a5f",
       stroke_width ?? 2, font_size ?? 14, rotation ?? 0, id]
    );
    const [rows] = await pool.query("SELECT * FROM canvas_elements WHERE id=?", [id]);
    if (!rows.length) return res.status(404).json({ ok: false, error: "Element not found" });
    const el = rows[0];
    if (el.points && typeof el.points === "string") {
      try { el.points = JSON.parse(el.points); } catch {}
    }
    res.json({ ok: true, element: el });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: "Server error" });
  }
});

// DELETE /api/canvas-elements/:id
router.delete("/canvas-elements/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const [result] = await pool.query("DELETE FROM canvas_elements WHERE id=?", [id]);
    if (!result.affectedRows) return res.status(404).json({ ok: false, error: "Element not found" });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: "Server error" });
  }
});

module.exports = router;

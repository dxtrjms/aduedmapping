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

// GET /api/canvases/:id/export
router.get("/:id/export", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const [canvasRows] = await pool.query("SELECT * FROM canvases WHERE id=?", [id]);
    if (!canvasRows.length) return res.status(404).json({ ok: false, error: "Canvas not found" });
    const canvas = canvasRows[0];

    const [elements] = await pool.query(
      "SELECT type, x, y, width, height, radius, points, text, icon, fill_color, stroke_color, stroke_width, font_size, rotation FROM canvas_elements WHERE canvas_id=? ORDER BY id ASC",
      [id]
    );
    // Parse JSON points field
    for (const el of elements) {
      if (el.points && typeof el.points === "string") {
        try { el.points = JSON.parse(el.points); } catch {}
      }
    }

    const [walls] = await pool.query(
      "SELECT x1, y1, x2, y2 FROM walls WHERE canvas_id=? ORDER BY id ASC",
      [id]
    );

    const [nodes] = await pool.query(
      "SELECT device_id, name, x, y, coverage_radius, point_size FROM nodes WHERE canvas_id=? ORDER BY name ASC",
      [id]
    );

    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      canvas: { name: canvas.name, width: canvas.width, height: canvas.height },
      elements,
      walls,
      nodes,
    };

    const filename = canvas.name.replace(/[^a-zA-Z0-9_-]/g, "_") + ".json";
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Type", "application/json");
    res.json(payload);
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: "Server error" });
  }
});

// POST /api/canvases/import
router.post("/import", async (req, res) => {
  let conn;
  try {
    const data = req.body;
    if (!data || data.version !== 1 || !data.canvas) {
      return res.status(400).json({ ok: false, error: "Invalid canvas file format" });
    }
    const { canvas, elements, walls, nodes } = data;
    if (!canvas.name || typeof canvas.width !== "number" || typeof canvas.height !== "number") {
      return res.status(400).json({ ok: false, error: "Canvas must have name, width, height" });
    }

    conn = await pool.getConnection();
    await conn.beginTransaction();

    // Create canvas
    const [canvasResult] = await conn.query(
      "INSERT INTO canvases (name, width, height) VALUES (?,?,?)",
      [canvas.name + " (imported)", canvas.width, canvas.height]
    );
    const canvasId = canvasResult.insertId;

    // Insert elements
    if (Array.isArray(elements)) {
      for (const el of elements) {
        await conn.query(
          `INSERT INTO canvas_elements
           (canvas_id, type, x, y, width, height, radius, points, text, icon,
            fill_color, stroke_color, stroke_width, font_size, rotation)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [canvasId, el.type, el.x, el.y, el.width || null, el.height || null,
           el.radius || null, el.points ? JSON.stringify(el.points) : null,
           el.text || null, el.icon || null,
           el.fill_color || "#3b82f6", el.stroke_color || "#1e3a5f",
           el.stroke_width ?? 2, el.font_size ?? 14, el.rotation ?? 0]
        );
      }
    }

    // Insert walls
    if (Array.isArray(walls)) {
      for (const w of walls) {
        await conn.query(
          "INSERT INTO walls (canvas_id, x1, y1, x2, y2) VALUES (?,?,?,?,?)",
          [canvasId, w.x1, w.y1, w.x2, w.y2]
        );
      }
    }

    // Match nodes by device_id
    const nodesMatched = [];
    const nodesSkipped = [];
    if (Array.isArray(nodes)) {
      for (const n of nodes) {
        const [existing] = await conn.query(
          "SELECT id FROM nodes WHERE device_id=?", [n.device_id]
        );
        if (existing.length > 0) {
          await conn.query(
            "UPDATE nodes SET x=?, y=?, canvas_id=?, coverage_radius=?, point_size=? WHERE id=?",
            [n.x, n.y, canvasId, n.coverage_radius ?? 15.0, n.point_size ?? 6, existing[0].id]
          );
          nodesMatched.push(n.device_id);
        } else {
          nodesSkipped.push(n.device_id);
        }
      }
    }

    await conn.commit();

    const [newCanvas] = await pool.query("SELECT * FROM canvases WHERE id=?", [canvasId]);
    res.json({ ok: true, canvas: newCanvas[0], nodesMatched, nodesSkipped });
  } catch (e) {
    if (conn) await conn.rollback();
    console.error(e);
    res.status(500).json({ ok: false, error: "Server error" });
  } finally {
    if (conn) conn.release();
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

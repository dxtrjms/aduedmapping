const express = require("express");
const router = express.Router();
const pool = require("../db");
const requireAuth = require("../middleware/requireAuth");

router.use(requireAuth);

// GET /api/nodes
router.get("/", async (req, res) => {
  try {
    const [nodes] = await pool.query("SELECT * FROM nodes ORDER BY name ASC");
    res.json({ ok: true, nodes });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: "Server error" });
  }
});

// POST /api/nodes
router.post("/", async (req, res) => {
  try {
    const { device_id, name, location, x, y, coverage_radius, canvas_id, point_size, initial_reading } = req.body;
    if (!device_id || !name) {
      return res.status(400).json({ ok: false, error: "device_id and name are required" });
    }
    const [result] = await pool.query(
      "INSERT INTO nodes (device_id, name, location, x, y, coverage_radius, canvas_id, point_size, is_active) VALUES (?,?,?,?,?,?,?,?,1)",
      [device_id, name, location || null, x || null, y || null, coverage_radius ?? 15.0, canvas_id || null, point_size ?? 6]
    );
    const nodeId = result.insertId;

    // Insert initial reading if provided
    if (initial_reading && typeof initial_reading === "object") {
      const r = initial_reading;
      // Convert ISO string to MySQL datetime format
      let ts = r.ts ? new Date(r.ts) : new Date();
      const tsMysql = ts.getFullYear() + "-" +
        String(ts.getMonth() + 1).padStart(2, "0") + "-" +
        String(ts.getDate()).padStart(2, "0") + " " +
        String(ts.getHours()).padStart(2, "0") + ":" +
        String(ts.getMinutes()).padStart(2, "0") + ":" +
        String(ts.getSeconds()).padStart(2, "0");
      await pool.query(
        `INSERT INTO readings (node_id, ts, temperature_c, humidity_pct, pressure_hpa,
         eco2_ppm, tvoc_ppb, pm25_ugm3, battery_pct, battery_v)
         VALUES (?,?,?,?,?,?,?,?,?,?)`,
        [nodeId, tsMysql, r.temperature_c ?? null, r.humidity_pct ?? null,
         r.pressure_hpa ?? null, r.eco2_ppm ?? null, r.tvoc_ppb ?? null,
         r.pm25_ugm3 ?? null, r.battery_pct ?? null, r.battery_v ?? null]
      );
    }

    const [rows] = await pool.query("SELECT * FROM nodes WHERE id=?", [nodeId]);
    res.json({ ok: true, node: rows[0] });
  } catch (e) {
    console.error(e);
    if (e.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ ok: false, error: "device_id must be unique" });
    }
    res.status(500).json({ ok: false, error: "Server error" });
  }
});

// PUT /api/nodes/:id
router.put("/:id", async (req, res) => {
  try {
    const { name, location, x, y, coverage_radius, is_active, canvas_id, point_size } = req.body;
    const id = parseInt(req.params.id, 10);
    await pool.query(
      "UPDATE nodes SET name=?, location=?, x=?, y=?, coverage_radius=?, canvas_id=?, point_size=?, is_active=? WHERE id=?",
      [name, location || null, x || null, y || null, coverage_radius ?? 15.0, canvas_id || null, point_size ?? 6, is_active ? 1 : 0, id]
    );
    const [rows] = await pool.query("SELECT * FROM nodes WHERE id=?", [id]);
    if (!rows.length) return res.status(404).json({ ok: false, error: "Node not found" });
    res.json({ ok: true, node: rows[0] });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: "Server error" });
  }
});

// DELETE /api/nodes/:id
router.delete("/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const [result] = await pool.query("DELETE FROM nodes WHERE id=?", [id]);
    if (!result.affectedRows) return res.status(404).json({ ok: false, error: "Node not found" });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: "Server error" });
  }
});

module.exports = router;

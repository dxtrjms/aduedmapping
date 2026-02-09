const express = require("express");
const router = express.Router();
const pool = require("../db");
const requireAuth = require("../middleware/requireAuth");

router.use(requireAuth);

// GET /api/readings/latest — most recent reading per active node
router.get("/latest", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT r.node_id, r.ts, r.temperature_c, r.humidity_pct, r.pressure_hpa,
              r.eco2_ppm, r.tvoc_ppb, r.pm25_ugm3, r.battery_pct, r.battery_v
       FROM readings r
       INNER JOIN (
         SELECT node_id, MAX(ts) AS max_ts FROM readings GROUP BY node_id
       ) latest ON r.node_id = latest.node_id AND r.ts = latest.max_ts
       INNER JOIN nodes n ON r.node_id = n.id AND n.is_active = 1
       ORDER BY r.node_id ASC`
    );
    res.json({ ok: true, rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: "Server error" });
  }
});

// GET /api/readings?node_id&from&to
router.get("/", async (req, res) => {
  try {
    const node_id = parseInt(req.query.node_id, 10);
    const from = req.query.from || null;
    const to = req.query.to || null;

    if (!node_id) return res.status(400).json({ ok: false, error: "node_id required" });

    let sql = "SELECT ts, battery_pct, battery_v, temperature_c, humidity_pct, pressure_hpa, eco2_ppm, tvoc_ppb, pm25_ugm3 FROM readings WHERE node_id=?";
    const args = [node_id];

    if (from) { sql += " AND ts >= ?"; args.push(from); }
    if (to) { sql += " AND ts <= ?"; args.push(to); }

    sql += " ORDER BY ts ASC LIMIT 2000";
    const [rows] = await pool.query(sql, args);
    res.json({ ok: true, rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, error: "Server error" });
  }
});

module.exports = router;

const express = require("express");
const router = express.Router();
const pool = require("../db");

// POST /api/data — ESP32 sensor ingestion (no auth)
router.post("/", async (req, res) => {
  try {
    const payload = req.body || {};
    const deviceId = payload.device_id;
    if (!deviceId) return res.status(400).json({ ok: false, error: "device_id required" });

    const [nrows] = await pool.query("SELECT id FROM nodes WHERE device_id=?", [deviceId]);

    let nodeId;
    if (!nrows.length) {
      const [ins] = await pool.query(
        "INSERT INTO nodes (device_id, name, is_active) VALUES (?,?,1)",
        [deviceId, deviceId]
      );
      nodeId = ins.insertId;
    } else {
      nodeId = nrows[0].id;
    }

    await pool.query(
      `INSERT INTO readings
        (node_id, battery_pct, battery_v, temperature_c, humidity_pct, pressure_hpa, eco2_ppm, tvoc_ppb, pm25_ugm3, raw_json)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [
        nodeId,
        payload.battery_pct ?? null,
        payload.battery_v ?? null,
        payload.temperature_c ?? null,
        payload.humidity_pct ?? null,
        payload.pressure_hpa ?? null,
        payload.eco2_ppm ?? null,
        payload.tvoc_ppb ?? null,
        payload.pm25_ugm3 ?? null,
        JSON.stringify(payload)
      ]
    );

    return res.json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, error: "server_error" });
  }
});

module.exports = router;

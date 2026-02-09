/**
 * One-time migration: adds canvases, canvas_elements tables;
 * adds canvas_id + point_size to nodes; adds canvas_id to walls.
 * Run with: node migrate-canvases.js
 */
require("dotenv").config();
const pool = require("./db");

async function migrate() {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Create canvases table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS canvases (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(128) NOT NULL,
        width DOUBLE NOT NULL DEFAULT 170,
        height DOUBLE NOT NULL DEFAULT 220,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("[MIGRATE] canvases table ready");

    // 2. Insert default canvas if none exists
    const [existing] = await conn.query("SELECT id FROM canvases LIMIT 1");
    let defaultId;
    if (existing.length === 0) {
      const [result] = await conn.query(
        "INSERT INTO canvases (name, width, height) VALUES ('Default', 170, 220)"
      );
      defaultId = result.insertId;
      console.log("[MIGRATE] Default canvas created, id =", defaultId);
    } else {
      defaultId = existing[0].id;
      console.log("[MIGRATE] Existing canvas found, id =", defaultId);
    }

    // 3. Add canvas_id + point_size to nodes (if not present)
    const [nodeCols] = await conn.query("SHOW COLUMNS FROM nodes LIKE 'canvas_id'");
    if (nodeCols.length === 0) {
      await conn.query("ALTER TABLE nodes ADD COLUMN canvas_id INT NULL");
      await conn.query(
        "ALTER TABLE nodes ADD CONSTRAINT fk_nodes_canvas FOREIGN KEY (canvas_id) REFERENCES canvases(id) ON DELETE SET NULL"
      );
      // Assign placed nodes to default canvas
      await conn.query("UPDATE nodes SET canvas_id = ? WHERE x IS NOT NULL", [defaultId]);
      console.log("[MIGRATE] nodes.canvas_id added");
    }

    const [psCols] = await conn.query("SHOW COLUMNS FROM nodes LIKE 'point_size'");
    if (psCols.length === 0) {
      await conn.query("ALTER TABLE nodes ADD COLUMN point_size DOUBLE NOT NULL DEFAULT 6");
      console.log("[MIGRATE] nodes.point_size added");
    }

    // 4. Add canvas_id to walls (if not present)
    const [wallCols] = await conn.query("SHOW COLUMNS FROM walls LIKE 'canvas_id'");
    if (wallCols.length === 0) {
      await conn.query("ALTER TABLE walls ADD COLUMN canvas_id INT NOT NULL DEFAULT 1");
      await conn.query("UPDATE walls SET canvas_id = ?", [defaultId]);
      await conn.query(
        "ALTER TABLE walls ADD CONSTRAINT fk_walls_canvas FOREIGN KEY (canvas_id) REFERENCES canvases(id) ON DELETE CASCADE"
      );
      console.log("[MIGRATE] walls.canvas_id added");
    }

    // 5. Create canvas_elements table
    await conn.query(`
      CREATE TABLE IF NOT EXISTS canvas_elements (
        id INT AUTO_INCREMENT PRIMARY KEY,
        canvas_id INT NOT NULL,
        type VARCHAR(32) NOT NULL,
        x DOUBLE NOT NULL,
        y DOUBLE NOT NULL,
        width DOUBLE NULL,
        height DOUBLE NULL,
        radius DOUBLE NULL,
        points JSON NULL,
        text VARCHAR(512) NULL,
        icon VARCHAR(64) NULL,
        fill_color VARCHAR(32) NULL DEFAULT '#3b82f6',
        stroke_color VARCHAR(32) NULL DEFAULT '#1e3a5f',
        stroke_width DOUBLE DEFAULT 2,
        font_size DOUBLE DEFAULT 14,
        rotation DOUBLE DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT fk_elements_canvas FOREIGN KEY (canvas_id) REFERENCES canvases(id) ON DELETE CASCADE
      )
    `);
    console.log("[MIGRATE] canvas_elements table ready");

    await conn.commit();
    console.log("[MIGRATE] All migrations complete!");
  } catch (err) {
    await conn.rollback();
    console.error("[MIGRATE] Error:", err);
    process.exit(1);
  } finally {
    conn.release();
    await pool.end();
  }
}

migrate();

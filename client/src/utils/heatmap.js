// Floor dimensions in meters
export const FLOOR_WIDTH = 170;
export const FLOOR_HEIGHT = 220;

// Sensor metric definitions
export const SENSOR_TYPES = [
  { key: "temperature_c", label: "Temperature", unit: "\u00b0C", min: 20, max: 45 },
  { key: "humidity_pct", label: "Humidity", unit: "%", min: 30, max: 100 },
  { key: "pressure_hpa", label: "Pressure", unit: "hPa", min: 990, max: 1030 },
  { key: "eco2_ppm", label: "eCO\u2082", unit: "ppm", min: 400, max: 5000 },
  { key: "tvoc_ppb", label: "TVOC", unit: "ppb", min: 0, max: 1000 },
  { key: "pm25_ugm3", label: "PM2.5", unit: "\u00b5g/m\u00b3", min: 0, max: 100 },
];

// --- Geometry helpers ---

function cross(ax, ay, bx, by) {
  return ax * by - ay * bx;
}

/** Returns true if line segments (p1->p2) and (p3->p4) intersect */
export function segmentsIntersect(x1, y1, x2, y2, x3, y3, x4, y4) {
  const dx1 = x2 - x1, dy1 = y2 - y1;
  const dx2 = x4 - x3, dy2 = y4 - y3;
  const d = cross(dx1, dy1, dx2, dy2);
  if (Math.abs(d) < 1e-10) return false; // parallel
  const t = cross(x3 - x1, y3 - y1, dx2, dy2) / d;
  const u = cross(x3 - x1, y3 - y1, dx1, dy1) / d;
  return t > 0 && t < 1 && u > 0 && u < 1;
}

/** Returns true if any wall blocks line-of-sight between (ax,ay) and (bx,by) */
export function isOccluded(ax, ay, bx, by, walls) {
  for (let i = 0; i < walls.length; i++) {
    const w = walls[i];
    if (segmentsIntersect(ax, ay, bx, by, w.x1, w.y1, w.x2, w.y2)) return true;
  }
  return false;
}

/**
 * IDW interpolation over the floor grid.
 * sources: [{ x, y, value, radius }]
 * walls: [{ x1, y1, x2, y2 }]
 * Returns Float32Array of W * H (NaN = no coverage)
 */
export function computeHeatmap(sources, walls, floorW = FLOOR_WIDTH, floorH = FLOOR_HEIGHT) {
  const W = floorW;
  const H = floorH;
  const grid = new Float32Array(W * H);
  grid.fill(NaN);

  const validSources = sources.filter((s) => s.value != null && !isNaN(s.value));
  if (validSources.length === 0) return grid;

  const eps = 0.01;

  for (let gy = 0; gy < H; gy++) {
    for (let gx = 0; gx < W; gx++) {
      let weightSum = 0;
      let valueSum = 0;

      for (let i = 0; i < validSources.length; i++) {
        const s = validSources[i];
        const dx = gx - s.x;
        const dy = gy - s.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > s.radius) continue;
        if (isOccluded(gx, gy, s.x, s.y, walls)) continue;

        const w = 1 / (dist * dist + eps);
        weightSum += w;
        valueSum += w * s.value;
      }

      if (weightSum > 0) {
        grid[gy * W + gx] = valueSum / weightSum;
      }
    }
  }

  return grid;
}

/** Normalized value 0-1 → [r, g, b, a] (blue→cyan→green→yellow→red) */
export function valueToColor(t) {
  t = Math.max(0, Math.min(1, t));
  let r, g, b;
  if (t < 0.25) {
    const f = t / 0.25;
    r = 0; g = Math.round(255 * f); b = 255;
  } else if (t < 0.5) {
    const f = (t - 0.25) / 0.25;
    r = 0; g = 255; b = Math.round(255 * (1 - f));
  } else if (t < 0.75) {
    const f = (t - 0.5) / 0.25;
    r = Math.round(255 * f); g = 255; b = 0;
  } else {
    const f = (t - 0.75) / 0.25;
    r = 255; g = Math.round(255 * (1 - f)); b = 0;
  }
  return [r, g, b, 160];
}

/** Converts Float32Array grid to ImageData for canvas rendering */
export function gridToImageData(grid, min, max, floorW = FLOOR_WIDTH, floorH = FLOOR_HEIGHT) {
  const W = floorW;
  const H = floorH;
  const imageData = new ImageData(W, H);
  const data = imageData.data;
  const range = max - min || 1;

  for (let i = 0; i < grid.length; i++) {
    const v = grid[i];
    const off = i * 4;
    if (isNaN(v)) {
      data[off] = 0; data[off + 1] = 0; data[off + 2] = 0; data[off + 3] = 0;
    } else {
      const t = (v - min) / range;
      const [r, g, b, a] = valueToColor(t);
      data[off] = r; data[off + 1] = g; data[off + 2] = b; data[off + 3] = a;
    }
  }

  return imageData;
}

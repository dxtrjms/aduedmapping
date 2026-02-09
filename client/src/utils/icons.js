/**
 * Floor plan icon definitions.
 * Each icon is a function that draws at (0,0) within a unit box of given size.
 * Call with: drawIcon(ctx, iconName, x, y, size, rotation)
 */

const iconDefs = {
  door: (ctx, size) => {
    // Arc representing a door swing
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(size, 0);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, size, 0, -Math.PI / 2, true);
    ctx.stroke();
  },
  window: (ctx, size) => {
    // Double line for window
    const h = size * 0.15;
    ctx.fillRect(0, -h, size, h * 2);
    ctx.strokeRect(0, -h, size, h * 2);
    ctx.beginPath();
    ctx.moveTo(size / 2, -h);
    ctx.lineTo(size / 2, h);
    ctx.stroke();
  },
  desk: (ctx, size) => {
    // Rectangle desk
    ctx.fillRect(0, 0, size, size * 0.6);
    ctx.strokeRect(0, 0, size, size * 0.6);
  },
  chair: (ctx, size) => {
    // Small circle seat + back line
    const r = size * 0.3;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(size * 0.2, size * 0.85);
    ctx.lineTo(size * 0.8, size * 0.85);
    ctx.lineWidth = size * 0.1;
    ctx.stroke();
  },
  stairs: (ctx, size) => {
    // Staircase lines
    const steps = 5;
    const sw = size / steps;
    for (let i = 0; i < steps; i++) {
      ctx.beginPath();
      ctx.moveTo(i * sw, 0);
      ctx.lineTo(i * sw, size);
      ctx.stroke();
    }
    ctx.strokeRect(0, 0, size, size);
  },
  elevator: (ctx, size) => {
    // Box with arrows
    ctx.strokeRect(0, 0, size, size);
    const cx = size / 2;
    // Up arrow
    ctx.beginPath();
    ctx.moveTo(cx - size * 0.15, size * 0.4);
    ctx.lineTo(cx, size * 0.15);
    ctx.lineTo(cx + size * 0.15, size * 0.4);
    ctx.stroke();
    // Down arrow
    ctx.beginPath();
    ctx.moveTo(cx - size * 0.15, size * 0.6);
    ctx.lineTo(cx, size * 0.85);
    ctx.lineTo(cx + size * 0.15, size * 0.6);
    ctx.stroke();
  },
};

export const ICON_NAMES = Object.keys(iconDefs);

export function drawIcon(ctx, iconName, x, y, size, rotation = 0) {
  const fn = iconDefs[iconName];
  if (!fn) return;
  ctx.save();
  ctx.translate(x, y);
  if (rotation) ctx.rotate((rotation * Math.PI) / 180);
  ctx.translate(-size / 2, -size / 2);
  fn(ctx, size);
  ctx.restore();
}

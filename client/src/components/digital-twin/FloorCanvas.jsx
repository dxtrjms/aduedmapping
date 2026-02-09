import { useRef, useEffect, useCallback, useState } from "react";
import {
  SENSOR_TYPES,
  computeHeatmap,
  gridToImageData,
} from "../../utils/heatmap";
import { drawIcon } from "../../utils/icons";
import { useTheme } from "../../hooks/useTheme";

const ROTATE_HANDLE_DIST = 20; // pixels from center

export default function FloorCanvas({
  nodes,
  walls,
  readings,
  sensorKey,
  mode,
  floorWidth = 170,
  floorHeight = 220,
  selectedNodeId,
  onSelectNode,
  selectedWallId,
  onSelectWall,
  selectedElementId,
  onSelectElement,
  placingNodeId,
  onPlaceNode,
  onMoveNode,
  onMoveElement,
  onRotateElement,
  onUpdateWall,
  onCreateWall,
  onCreateElement,
  elements = [],
  fillColor = "#3b82f6",
  strokeColor = "#1e3a5f",
  selectedIcon = "door",
  locked = false,
  zoom: externalZoom,
  panOffset: externalPanOffset,
  onZoomChange,
  onPanOffsetChange,
  showNodeNames = true,
  wallFontSize = 0,
  heatmapConfig = {},
  onInspectResult,
}) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const needsRedrawRef = useRef(true);
  const animFrameRef = useRef(null);

  const { dark } = useTheme();

  // Dark/light color palette
  const colors = dark
    ? {
        bg: "#1f2937", grid: "#374151", gridText: "#6b7280",
        wallDefault: "#d1d5db", wallSelected: "#60a5fa",
        wallLabelBg: "#374151", wallLabelText: "#9ca3af", wallLabelSelected: "#60a5fa",
        nodeDefault: "#60a5fa", nodeSelected: "#3b82f6", nodeRing: "#2563eb",
        nodeText: "#e5e7eb", coverageStroke: "#60a5fa",
        zoomBg: "rgba(31,41,55,0.85)", zoomText: "#d1d5db",
        previewStroke: "#9ca3af",
      }
    : {
        bg: "#fff", grid: "#e5e7eb", gridText: "#9ca3af",
        wallDefault: "#374151", wallSelected: "#2563eb",
        wallLabelBg: "#fff", wallLabelText: "#4b5563", wallLabelSelected: "#2563eb",
        nodeDefault: "#3b82f6", nodeSelected: "#2563eb", nodeRing: "#1d4ed8",
        nodeText: "#111827", coverageStroke: "#3b82f6",
        zoomBg: "rgba(255,255,255,0.85)", zoomText: "#374151",
        previewStroke: "#6b7280",
      };

  const ASPECT = floorWidth / floorHeight;

  // Zoom & pan state (use external if provided, otherwise internal)
  const [internalZoom, setInternalZoom] = useState(1);
  const [internalPanOffset, setInternalPanOffset] = useState({ x: 0, y: 0 });
  const zoom = externalZoom ?? internalZoom;
  const panOffset = externalPanOffset ?? internalPanOffset;
  const setZoom = onZoomChange ?? setInternalZoom;
  const setPanOffset = onPanOffsetChange ?? setInternalPanOffset;

  // Interaction state
  // dragging: { type: "node"|"element"|"rotate"|"rotateWall"|"wall"|"pan", id, startX, startY, startRotation? }
  const [dragging, setDragging] = useState(null);
  const [wallStart, setWallStart] = useState(null);
  const [cursorPos, setCursorPos] = useState(null);
  const [shapeStart, setShapeStart] = useState(null);
  const [triPoints, setTriPoints] = useState([]);

  // Inspect mode state
  const [inspectStart, setInspectStart] = useState(null);
  const [inspectRect, setInspectRect] = useState(null);

  // Heatmap offscreen canvas
  const heatmapCanvasRef = useRef(null);
  const heatmapDirtyRef = useRef(true);
  const heatmapGridRef = useRef(null);

  const canvasToMeters = useCallback((clientX, clientY) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = floorWidth / rect.width;
    const scaleY = floorHeight / rect.height;
    const baseX = (clientX - rect.left) * scaleX;
    const baseY = (clientY - rect.top) * scaleY;
    return {
      x: (baseX - panOffset.x) / zoom,
      y: (baseY - panOffset.y) / zoom,
    };
  }, [floorWidth, floorHeight, zoom, panOffset]);

  // Wheel handler for zoom and pan
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = floorWidth / rect.width;
      const scaleY = floorHeight / rect.height;
      const mouseBaseX = (e.clientX - rect.left) * scaleX;
      const mouseBaseY = (e.clientY - rect.top) * scaleY;
      const mouseMX = (mouseBaseX - panOffset.x) / zoom;
      const mouseMY = (mouseBaseY - panOffset.y) / zoom;

      const delta = -e.deltaY * 0.002;
      const newZoom = Math.max(0.5, Math.min(5, zoom * (1 + delta)));

      const newPanX = mouseBaseX - mouseMX * newZoom;
      const newPanY = mouseBaseY - mouseMY * newZoom;

      setZoom(newZoom);
      setPanOffset({ x: newPanX, y: newPanY });
    } else {
      const newPan = { x: panOffset.x - e.deltaX * 0.5, y: panOffset.y - e.deltaY * 0.5 };
      setPanOffset(newPan);
    }
  }, [zoom, panOffset, floorWidth, floorHeight, setZoom, setPanOffset]);

  const flagRedraw = useCallback(() => { needsRedrawRef.current = true; }, []);

  useEffect(() => { heatmapDirtyRef.current = true; flagRedraw(); }, [nodes, walls, readings, sensorKey, floorWidth, floorHeight, heatmapConfig, flagRedraw]);
  useEffect(() => { flagRedraw(); }, [dragging, wallStart, cursorPos, selectedNodeId, selectedWallId, selectedElementId, shapeStart, triPoints, elements, zoom, panOffset, inspectRect, dark, flagRedraw]);

  // Heatmap computation
  useEffect(() => {
    if (!heatmapDirtyRef.current) return;
    heatmapDirtyRef.current = false;

    const timer = setTimeout(() => {
      const W = Math.round(floorWidth);
      const H = Math.round(floorHeight);
      if (!heatmapCanvasRef.current || heatmapCanvasRef.current.width !== W || heatmapCanvasRef.current.height !== H) {
        heatmapCanvasRef.current = document.createElement("canvas");
        heatmapCanvasRef.current.width = W;
        heatmapCanvasRef.current.height = H;
      }

      const enabled = heatmapConfig.enabled !== false;
      const sensorType = SENSOR_TYPES.find((s) => s.key === sensorKey);
      if (!enabled || !sensorType || !readings.length) {
        const ctx = heatmapCanvasRef.current.getContext("2d");
        ctx.clearRect(0, 0, W, H);
        heatmapGridRef.current = null;
        flagRedraw();
        return;
      }

      const readingMap = {};
      for (const r of readings) readingMap[r.node_id] = r;

      const radiusMul = heatmapConfig.radiusMultiplier || 1;
      const sources = nodes
        .filter((n) => n.x != null && n.y != null && readingMap[n.id])
        .map((n) => ({
          x: n.x, y: n.y,
          value: readingMap[n.id][sensorKey],
          radius: (n.coverage_radius || 15) * radiusMul,
        }));

      const computeOpts = { power: heatmapConfig.power || 2, radiusMultiplier: 1 };
      const grid = computeHeatmap(sources, walls, W, H, computeOpts);
      heatmapGridRef.current = { grid, W, H, min: Number(heatmapConfig.minOverride) || sensorType.min, max: Number(heatmapConfig.maxOverride) || sensorType.max };

      const gridOpts = {
        colorStops: heatmapConfig.colorStops?.length >= 2 ? heatmapConfig.colorStops : null,
        opacity: heatmapConfig.opacity ?? 160,
      };
      const imageData = gridToImageData(grid, heatmapGridRef.current.min, heatmapGridRef.current.max, W, H, gridOpts);
      const ctx = heatmapCanvasRef.current.getContext("2d");
      ctx.putImageData(imageData, 0, 0);
      flagRedraw();
    }, 0);

    return () => clearTimeout(timer);
  }, [nodes, walls, readings, sensorKey, floorWidth, floorHeight, heatmapConfig, flagRedraw]);

  // Resize canvas
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const observer = new ResizeObserver(() => {
      const w = container.clientWidth;
      const h = w / ASPECT;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + "px";
      canvas.style.height = h + "px";
      flagRedraw();
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, [ASPECT, flagRedraw]);

  // Render loop
  useEffect(() => {
    const draw = () => {
      animFrameRef.current = requestAnimationFrame(draw);
      if (!needsRedrawRef.current) return;
      needsRedrawRef.current = false;

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      const w = canvas.width;
      const h = canvas.height;
      const baseSx = w / floorWidth;
      const baseSy = h / floorHeight;
      const sx = baseSx * zoom;
      const sy = baseSy * zoom;
      const ox = panOffset.x * baseSx;
      const oy = panOffset.y * baseSy;

      // Effective wall font size
      const fontScale = sx > 2 ? 1 : sx / 2 + 0.5;
      const effectiveWallFont = wallFontSize > 0 ? wallFontSize : Math.max(9, 3 * fontScale);

      // 1. Background
      ctx.fillStyle = colors.bg;
      ctx.fillRect(0, 0, w, h);

      // Apply zoom/pan transform for all content
      ctx.save();
      ctx.translate(ox, oy);

      // 2. Grid
      ctx.strokeStyle = colors.grid;
      ctx.lineWidth = 1;
      ctx.font = `${10 * fontScale}px sans-serif`;
      ctx.fillStyle = colors.gridText;
      const gridStep = Math.max(10, Math.round(floorWidth / 17 / 10) * 10) || 10;
      for (let mx = 0; mx <= floorWidth; mx += gridStep) {
        const px = mx * sx;
        ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, h); ctx.stroke();
        if (mx % (gridStep * 2) === 0) ctx.fillText(mx + "m", px + 2, 12 * fontScale);
      }
      for (let my = 0; my <= floorHeight; my += gridStep) {
        const py = my * sy;
        ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(w, py); ctx.stroke();
        if (my % (gridStep * 2) === 0) ctx.fillText(my + "m", 2, py - 3);
      }

      // 3. Heatmap (scaled by zoom)
      if (heatmapCanvasRef.current && sensorKey && heatmapConfig.enabled !== false) {
        ctx.save();
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(heatmapCanvasRef.current, 0, 0, floorWidth * sx, floorHeight * sy);
        ctx.restore();
      }

      // 4. Canvas elements (shapes, text, icons)
      for (const el of elements) {
        const isSelected = el.id === selectedElementId;
        ctx.save();
        const ex = el.x * sx;
        const ey = el.y * sy;

        if (el.type === "rect") {
          const ew = (el.width || 10) * sx;
          const eh = (el.height || 10) * sy;
          ctx.translate(ex, ey);
          if (el.rotation) ctx.rotate((el.rotation * Math.PI) / 180);
          ctx.fillStyle = el.fill_color || "#3b82f6";
          ctx.globalAlpha = 0.4;
          ctx.fillRect(-ew / 2, -eh / 2, ew, eh);
          ctx.globalAlpha = 1;
          ctx.strokeStyle = el.stroke_color || "#1e3a5f";
          ctx.lineWidth = (el.stroke_width || 2) * (sx > 2 ? 1 : sx / 2 + 0.5);
          ctx.strokeRect(-ew / 2, -eh / 2, ew, eh);
          if (isSelected) {
            ctx.strokeStyle = "#2563eb"; ctx.lineWidth = 2; ctx.setLineDash([4, 4]);
            ctx.strokeRect(-ew / 2 - 3, -eh / 2 - 3, ew + 6, eh + 6);
            ctx.setLineDash([]);
            drawRotateHandle(ctx, 0, -eh / 2 - ROTATE_HANDLE_DIST);
          }
        } else if (el.type === "circle") {
          const er = (el.radius || 5) * sx;
          ctx.translate(ex, ey);
          ctx.fillStyle = el.fill_color || "#3b82f6";
          ctx.globalAlpha = 0.4;
          ctx.beginPath(); ctx.arc(0, 0, er, 0, Math.PI * 2); ctx.fill();
          ctx.globalAlpha = 1;
          ctx.strokeStyle = el.stroke_color || "#1e3a5f";
          ctx.lineWidth = (el.stroke_width || 2) * (sx > 2 ? 1 : sx / 2 + 0.5);
          ctx.beginPath(); ctx.arc(0, 0, er, 0, Math.PI * 2); ctx.stroke();
          if (isSelected) {
            ctx.strokeStyle = "#2563eb"; ctx.lineWidth = 2; ctx.setLineDash([4, 4]);
            ctx.beginPath(); ctx.arc(0, 0, er + 3, 0, Math.PI * 2); ctx.stroke();
            ctx.setLineDash([]);
          }
        } else if (el.type === "triangle") {
          const pts = el.points || [];
          if (pts.length >= 3) {
            ctx.fillStyle = el.fill_color || "#3b82f6";
            ctx.globalAlpha = 0.4;
            ctx.beginPath();
            ctx.moveTo(pts[0].x * sx, pts[0].y * sy);
            ctx.lineTo(pts[1].x * sx, pts[1].y * sy);
            ctx.lineTo(pts[2].x * sx, pts[2].y * sy);
            ctx.closePath(); ctx.fill();
            ctx.globalAlpha = 1;
            ctx.strokeStyle = el.stroke_color || "#1e3a5f";
            ctx.lineWidth = (el.stroke_width || 2) * (sx > 2 ? 1 : sx / 2 + 0.5);
            ctx.beginPath();
            ctx.moveTo(pts[0].x * sx, pts[0].y * sy);
            ctx.lineTo(pts[1].x * sx, pts[1].y * sy);
            ctx.lineTo(pts[2].x * sx, pts[2].y * sy);
            ctx.closePath(); ctx.stroke();
            if (isSelected) {
              ctx.strokeStyle = "#2563eb"; ctx.lineWidth = 2; ctx.setLineDash([4, 4]);
              ctx.beginPath();
              ctx.moveTo(pts[0].x * sx, pts[0].y * sy);
              ctx.lineTo(pts[1].x * sx, pts[1].y * sy);
              ctx.lineTo(pts[2].x * sx, pts[2].y * sy);
              ctx.closePath(); ctx.stroke();
              ctx.setLineDash([]);
            }
          }
        } else if (el.type === "text") {
          const fs = (el.font_size || 14) * fontScale;
          ctx.font = `${fs}px sans-serif`;
          ctx.fillStyle = el.fill_color || (dark ? "#e5e7eb" : "#111827");
          ctx.textAlign = "left";
          if (el.rotation) {
            ctx.translate(ex, ey);
            ctx.rotate((el.rotation * Math.PI) / 180);
            ctx.fillText(el.text || "", 0, 0);
          } else {
            ctx.fillText(el.text || "", ex, ey);
          }
          if (isSelected) {
            const tm = ctx.measureText(el.text || "");
            const tx = el.rotation ? 0 : ex;
            const ty = el.rotation ? 0 : ey;
            ctx.strokeStyle = "#2563eb"; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
            ctx.strokeRect(tx - 2, ty - fs, tm.width + 4, fs + 4);
            ctx.setLineDash([]);
            drawRotateHandle(ctx, tx + tm.width / 2, ty - fs - ROTATE_HANDLE_DIST);
          }
        } else if (el.type === "icon") {
          const iconSize = Math.max((el.width || 10) * sx, 10);
          ctx.strokeStyle = el.stroke_color || "#1e3a5f";
          ctx.fillStyle = el.fill_color || "#3b82f6";
          ctx.lineWidth = (el.stroke_width || 2) * (sx > 2 ? 1 : sx / 2 + 0.5);
          ctx.globalAlpha = 0.8;
          drawIcon(ctx, el.icon || "door", ex, ey, iconSize, el.rotation || 0);
          ctx.globalAlpha = 1;
          if (isSelected) {
            ctx.strokeStyle = "#2563eb"; ctx.lineWidth = 2; ctx.setLineDash([4, 4]);
            ctx.strokeRect(ex - iconSize / 2 - 3, ey - iconSize / 2 - 3, iconSize + 6, iconSize + 6);
            ctx.setLineDash([]);
            drawRotateHandle(ctx, ex, ey - iconSize / 2 - ROTATE_HANDLE_DIST);
          }
        }
        ctx.restore();
      }

      // 5. Walls + measurements
      for (const wall of walls) {
        const isSelected = wall.id === selectedWallId;
        ctx.strokeStyle = isSelected ? colors.wallSelected : colors.wallDefault;
        ctx.lineWidth = isSelected ? 4 : 3;
        ctx.beginPath();
        ctx.moveTo(wall.x1 * sx, wall.y1 * sy);
        ctx.lineTo(wall.x2 * sx, wall.y2 * sy);
        ctx.stroke();

        // Wall length label at midpoint
        const dx = wall.x2 - wall.x1;
        const dy = wall.y2 - wall.y1;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len > 0.5) {
          const wmx = ((wall.x1 + wall.x2) / 2) * sx;
          const wmy = ((wall.y1 + wall.y2) / 2) * sy;
          const label = len.toFixed(1) + "m";
          ctx.save();
          ctx.font = `${effectiveWallFont}px sans-serif`;
          ctx.fillStyle = colors.wallLabelBg;
          const tm = ctx.measureText(label);
          ctx.fillRect(wmx - tm.width / 2 - 2, wmy - 6, tm.width + 4, 12);
          ctx.fillStyle = isSelected ? colors.wallLabelSelected : colors.wallLabelText;
          ctx.textAlign = "center";
          ctx.fillText(label, wmx, wmy + 4);
          ctx.textAlign = "start";
          ctx.restore();
        }

        // Rotation handle at endpoint 2 when selected
        if (isSelected) {
          ctx.save();
          const hx = wall.x2 * sx;
          const hy = wall.y2 * sy;
          drawRotateHandle(ctx, hx, hy);
          ctx.restore();
        }
      }

      // 6. Wall preview
      if (wallStart && cursorPos) {
        ctx.strokeStyle = colors.previewStroke; ctx.lineWidth = 2; ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(wallStart.x * sx, wallStart.y * sy);
        ctx.lineTo(cursorPos.x * sx, cursorPos.y * sy);
        ctx.stroke(); ctx.setLineDash([]);
        const pdx = cursorPos.x - wallStart.x;
        const pdy = cursorPos.y - wallStart.y;
        const plen = Math.sqrt(pdx * pdx + pdy * pdy);
        if (plen > 1) {
          const pmx = ((wallStart.x + cursorPos.x) / 2) * sx;
          const pmy = ((wallStart.y + cursorPos.y) / 2) * sy;
          ctx.font = `${effectiveWallFont}px sans-serif`;
          ctx.fillStyle = colors.previewStroke; ctx.textAlign = "center";
          ctx.fillText(plen.toFixed(1) + "m", pmx, pmy - 6);
          ctx.textAlign = "start";
        }
      }

      // Shape preview (rect/circle)
      if (shapeStart && cursorPos && (mode === "rect" || mode === "circle")) {
        ctx.save();
        if (mode === "rect") {
          const rx = Math.min(shapeStart.x, cursorPos.x) * sx;
          const ry = Math.min(shapeStart.y, cursorPos.y) * sy;
          const rw = Math.abs(cursorPos.x - shapeStart.x) * sx;
          const rh = Math.abs(cursorPos.y - shapeStart.y) * sy;
          ctx.fillStyle = fillColor; ctx.globalAlpha = 0.3; ctx.fillRect(rx, ry, rw, rh);
          ctx.globalAlpha = 1; ctx.strokeStyle = strokeColor; ctx.lineWidth = 2;
          ctx.setLineDash([4, 4]); ctx.strokeRect(rx, ry, rw, rh); ctx.setLineDash([]);
        } else {
          const cdx = cursorPos.x - shapeStart.x;
          const cdy = cursorPos.y - shapeStart.y;
          const cr = Math.sqrt(cdx * cdx + cdy * cdy) * sx;
          ctx.fillStyle = fillColor; ctx.globalAlpha = 0.3;
          ctx.beginPath(); ctx.arc(shapeStart.x * sx, shapeStart.y * sy, cr, 0, Math.PI * 2); ctx.fill();
          ctx.globalAlpha = 1; ctx.strokeStyle = strokeColor; ctx.lineWidth = 2;
          ctx.setLineDash([4, 4]);
          ctx.beginPath(); ctx.arc(shapeStart.x * sx, shapeStart.y * sy, cr, 0, Math.PI * 2); ctx.stroke();
          ctx.setLineDash([]);
        }
        ctx.restore();
      }

      // Triangle preview
      if (triPoints.length > 0 && mode === "triangle") {
        ctx.save();
        ctx.fillStyle = fillColor; ctx.strokeStyle = strokeColor;
        for (const tp of triPoints) {
          ctx.beginPath(); ctx.arc(tp.x * sx, tp.y * sy, 4, 0, Math.PI * 2); ctx.fill();
        }
        if (triPoints.length === 2 && cursorPos) {
          ctx.globalAlpha = 0.3;
          ctx.beginPath();
          ctx.moveTo(triPoints[0].x * sx, triPoints[0].y * sy);
          ctx.lineTo(triPoints[1].x * sx, triPoints[1].y * sy);
          ctx.lineTo(cursorPos.x * sx, cursorPos.y * sy);
          ctx.closePath(); ctx.fill();
          ctx.globalAlpha = 1; ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(triPoints[0].x * sx, triPoints[0].y * sy);
          ctx.lineTo(triPoints[1].x * sx, triPoints[1].y * sy);
          ctx.lineTo(cursorPos.x * sx, cursorPos.y * sy);
          ctx.closePath(); ctx.stroke(); ctx.setLineDash([]);
        }
        ctx.restore();
      }

      // 7. Nodes
      for (const node of nodes) {
        if (node.x == null || node.y == null) continue;
        const nx = node.x * sx;
        const ny = node.y * sy;
        const isSelected = node.id === selectedNodeId;
        const nodeRadius = Math.max(node.point_size || 6, 3) * (sx > 2 ? 1 : sx / 2 + 0.5);

        if (isSelected) {
          const cr = (node.coverage_radius || 15) * sx;
          ctx.strokeStyle = colors.coverageStroke; ctx.lineWidth = 1.5; ctx.setLineDash([5, 5]);
          ctx.beginPath(); ctx.arc(nx, ny, cr, 0, Math.PI * 2); ctx.stroke();
          ctx.setLineDash([]);
        }

        ctx.fillStyle = isSelected ? colors.nodeSelected : colors.nodeDefault;
        ctx.beginPath(); ctx.arc(nx, ny, nodeRadius, 0, Math.PI * 2); ctx.fill();

        if (isSelected) {
          ctx.strokeStyle = colors.nodeRing; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(nx, ny, nodeRadius + 3, 0, Math.PI * 2); ctx.stroke();
        }

        if (showNodeNames !== false) {
          ctx.fillStyle = colors.nodeText;
          ctx.font = `bold ${Math.max(10, 3.5 * sx)}px sans-serif`;
          ctx.textAlign = "center";
          ctx.fillText(node.name, nx, ny - nodeRadius - 4);
          ctx.textAlign = "start";
        }
      }

      // 8. Ghost node
      if (mode === "place" && placingNodeId && cursorPos) {
        const gx = cursorPos.x * sx;
        const gy = cursorPos.y * sy;
        ctx.globalAlpha = 0.5; ctx.fillStyle = colors.nodeDefault;
        ctx.beginPath(); ctx.arc(gx, gy, Math.max(6, 4 * sx), 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      }

      // 9. Inspect rectangle overlay
      if (inspectRect) {
        ctx.save();
        const irx = Math.min(inspectRect.x1, inspectRect.x2) * sx;
        const iry = Math.min(inspectRect.y1, inspectRect.y2) * sy;
        const irw = Math.abs(inspectRect.x2 - inspectRect.x1) * sx;
        const irh = Math.abs(inspectRect.y2 - inspectRect.y1) * sy;
        ctx.strokeStyle = "#3b82f6";
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.strokeRect(irx, iry, irw, irh);
        ctx.setLineDash([]);
        ctx.fillStyle = "rgba(59,130,246,0.1)";
        ctx.fillRect(irx, iry, irw, irh);
        ctx.restore();
      }

      // End zoom/pan transform
      ctx.restore();

      // 10. Zoom level indicator (drawn outside transform)
      if (zoom !== 1) {
        ctx.save();
        const zoomLabel = `${Math.round(zoom * 100)}%`;
        ctx.font = "bold 12px sans-serif";
        const tm = ctx.measureText(zoomLabel);
        const zx = w - tm.width - 16;
        const zy = h - 12;
        ctx.fillStyle = colors.zoomBg;
        ctx.fillRect(zx - 4, zy - 12, tm.width + 8, 16);
        ctx.fillStyle = colors.zoomText;
        ctx.fillText(zoomLabel, zx, zy);
        ctx.restore();
      }
    };

    animFrameRef.current = requestAnimationFrame(draw);
    return () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current); };
  }, [nodes, walls, sensorKey, selectedNodeId, selectedWallId, selectedElementId, mode, placingNodeId, dragging, wallStart, cursorPos, shapeStart, triPoints, elements, floorWidth, floorHeight, fillColor, strokeColor, zoom, panOffset, showNodeNames, wallFontSize, heatmapConfig, inspectRect, colors, dark]);

  // --- Hit detection ---

  const findNodeAt = useCallback((mx, my) => {
    const hitRadius = 6;
    let closest = null, closestDist = Infinity;
    for (const n of nodes) {
      if (n.x == null || n.y == null) continue;
      const d = Math.sqrt((n.x - mx) ** 2 + (n.y - my) ** 2);
      if (d < hitRadius && d < closestDist) { closest = n; closestDist = d; }
    }
    return closest;
  }, [nodes]);

  const findWallAt = useCallback((mx, my) => {
    const hitDist = 4;
    let closest = null, closestDist = Infinity;
    for (const w of walls) {
      const dx = w.x2 - w.x1, dy = w.y2 - w.y1;
      const len2 = dx * dx + dy * dy;
      if (len2 === 0) continue;
      let t = ((mx - w.x1) * dx + (my - w.y1) * dy) / len2;
      t = Math.max(0, Math.min(1, t));
      const px = w.x1 + t * dx, py = w.y1 + t * dy;
      const d = Math.sqrt((mx - px) ** 2 + (my - py) ** 2);
      if (d < hitDist && d < closestDist) { closest = w; closestDist = d; }
    }
    return closest;
  }, [walls]);

  const findElementAt = useCallback((mx, my) => {
    const hitDist = 6;
    for (let i = elements.length - 1; i >= 0; i--) {
      const el = elements[i];
      if (el.type === "rect" || el.type === "icon") {
        const hw = (el.width || 10) / 2;
        const hh = (el.height || 10) / 2;
        if (Math.abs(mx - el.x) < hw + hitDist && Math.abs(my - el.y) < hh + hitDist) return el;
      } else if (el.type === "circle") {
        const d = Math.sqrt((mx - el.x) ** 2 + (my - el.y) ** 2);
        if (d < (el.radius || 5) + hitDist) return el;
      } else if (el.type === "triangle" && el.points?.length >= 3) {
        const xs = el.points.map((p) => p.x);
        const ys = el.points.map((p) => p.y);
        const minX = Math.min(...xs) - hitDist, maxX = Math.max(...xs) + hitDist;
        const minY = Math.min(...ys) - hitDist, maxY = Math.max(...ys) + hitDist;
        if (mx >= minX && mx <= maxX && my >= minY && my <= maxY) return el;
      } else if (el.type === "text") {
        if (Math.abs(mx - el.x) < 20 && Math.abs(my - el.y) < 10) return el;
      }
    }
    return null;
  }, [elements]);

  // Check if click is on rotation handle of the currently selected element
  const isOnRotateHandle = useCallback((clientX, clientY) => {
    if (!selectedElementId) return false;
    const el = elements.find((e) => e.id === selectedElementId);
    if (!el) return false;
    const canvas = canvasRef.current;
    if (!canvas) return false;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const cpx = (clientX - rect.left) * dpr;
    const cpy = (clientY - rect.top) * dpr;
    const baseSx = canvas.width / floorWidth;
    const baseSy = canvas.height / floorHeight;
    const sx = baseSx * zoom;
    const sy = baseSy * zoom;
    const ox = panOffset.x * baseSx;
    const oy = panOffset.y * baseSy;
    const ex = el.x * sx + ox;
    const ey = el.y * sy + oy;

    let hx = ex, hy = ey;
    if (el.type === "rect") {
      const eh = (el.height || 10) * sy;
      const rot = (el.rotation || 0) * Math.PI / 180;
      hx = ex + Math.sin(-rot) * (eh / 2 + ROTATE_HANDLE_DIST);
      hy = ey - Math.cos(-rot) * (eh / 2 + ROTATE_HANDLE_DIST);
    } else if (el.type === "icon") {
      const iconSize = Math.max((el.width || 10) * sx, 10);
      hx = ex;
      hy = ey - iconSize / 2 - ROTATE_HANDLE_DIST;
    } else if (el.type === "text") {
      const fs = (el.font_size || 14) * (sx > 2 ? 1 : sx / 2 + 0.5);
      hx = ex;
      hy = ey - fs - ROTATE_HANDLE_DIST;
    } else {
      return false;
    }

    const d = Math.sqrt((cpx - hx) ** 2 + (cpy - hy) ** 2);
    return d < 12;
  }, [selectedElementId, elements, floorWidth, floorHeight, zoom, panOffset]);

  // Check if click is on wall rotation handle (at endpoint 2)
  const isOnWallRotateHandle = useCallback((clientX, clientY) => {
    if (!selectedWallId) return false;
    const wall = walls.find((w) => w.id === selectedWallId);
    if (!wall) return false;
    const canvas = canvasRef.current;
    if (!canvas) return false;
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const cpx = (clientX - rect.left) * dpr;
    const cpy = (clientY - rect.top) * dpr;
    const baseSx = canvas.width / floorWidth;
    const baseSy = canvas.height / floorHeight;
    const zsx = baseSx * zoom;
    const zsy = baseSy * zoom;
    const oxx = panOffset.x * baseSx;
    const oyy = panOffset.y * baseSy;
    const hx = wall.x2 * zsx + oxx;
    const hy = wall.y2 * zsy + oyy;
    const d = Math.sqrt((cpx - hx) ** 2 + (cpy - hy) ** 2);
    return d < 14;
  }, [selectedWallId, walls, floorWidth, floorHeight, zoom, panOffset]);

  // --- Mouse handlers ---

  const handleMouseDown = useCallback((e) => {
    const pt = canvasToMeters(e.clientX, e.clientY);
    if (!pt) return;

    // Inspect mode
    if (mode === "inspect") {
      setInspectStart({ x: pt.x, y: pt.y });
      setInspectRect({ x1: pt.x, y1: pt.y, x2: pt.x, y2: pt.y });
      return;
    }

    if (mode === "select") {
      // When locked, only allow selection (no dragging, rotating)
      if (locked) {
        const node = findNodeAt(pt.x, pt.y);
        if (node) { onSelectNode(node.id); onSelectWall(null); onSelectElement(null); return; }
        const el = findElementAt(pt.x, pt.y);
        if (el) { onSelectElement(el.id); onSelectNode(null); onSelectWall(null); return; }
        const wall = findWallAt(pt.x, pt.y);
        if (wall) { onSelectWall(wall.id); onSelectNode(null); onSelectElement(null); return; }
        onSelectNode(null); onSelectWall(null); onSelectElement(null);
        return;
      }

      // Check rotation handle first (before element body)
      if (selectedElementId && isOnRotateHandle(e.clientX, e.clientY)) {
        const el = elements.find((el) => el.id === selectedElementId);
        if (el) {
          setDragging({ type: "rotate", id: el.id, centerX: el.x, centerY: el.y, startRotation: el.rotation || 0 });
          return;
        }
      }

      // Check wall rotation handle
      if (selectedWallId && isOnWallRotateHandle(e.clientX, e.clientY)) {
        const wall = walls.find((w) => w.id === selectedWallId);
        if (wall) {
          const midX = (wall.x1 + wall.x2) / 2;
          const midY = (wall.y1 + wall.y2) / 2;
          const dx = wall.x2 - wall.x1;
          const dy = wall.y2 - wall.y1;
          const halfLen = Math.sqrt(dx * dx + dy * dy) / 2;
          setDragging({ type: "rotateWall", id: wall.id, midX, midY, halfLen });
          return;
        }
      }

      const node = findNodeAt(pt.x, pt.y);
      if (node) {
        onSelectNode(node.id); onSelectWall(null); onSelectElement(null);
        setDragging({ type: "node", id: node.id, startX: node.x, startY: node.y });
        return;
      }
      const el = findElementAt(pt.x, pt.y);
      if (el) {
        onSelectElement(el.id); onSelectNode(null); onSelectWall(null);
        setDragging({ type: "element", id: el.id, startX: el.x, startY: el.y, offsetX: pt.x - el.x, offsetY: pt.y - el.y });
        return;
      }
      const wall = findWallAt(pt.x, pt.y);
      if (wall) {
        onSelectWall(wall.id); onSelectNode(null); onSelectElement(null);
        // Start wall drag
        setDragging({
          type: "wall", id: wall.id,
          startMouseX: pt.x, startMouseY: pt.y,
          origX1: wall.x1, origY1: wall.y1,
          origX2: wall.x2, origY2: wall.y2,
        });
        return;
      }
      onSelectNode(null); onSelectWall(null); onSelectElement(null);
    } else if (locked) {
      return;
    } else if (mode === "wall") {
      if (!wallStart) {
        setWallStart({ x: pt.x, y: pt.y });
      } else {
        onCreateWall({ x1: wallStart.x, y1: wallStart.y, x2: pt.x, y2: pt.y });
        setWallStart(null);
      }
    } else if (mode === "place" && placingNodeId) {
      onPlaceNode(placingNodeId, pt.x, pt.y);
    } else if (mode === "rect" || mode === "circle") {
      setShapeStart({ x: pt.x, y: pt.y });
    } else if (mode === "triangle") {
      const newPts = [...triPoints, { x: pt.x, y: pt.y }];
      if (newPts.length >= 3) {
        onCreateElement({
          type: "triangle", x: newPts[0].x, y: newPts[0].y,
          points: newPts, fill_color: fillColor, stroke_color: strokeColor,
        });
        setTriPoints([]);
      } else {
        setTriPoints(newPts);
      }
    } else if (mode === "text") {
      const text = prompt("Enter text:");
      if (text) {
        onCreateElement({
          type: "text", x: pt.x, y: pt.y, text,
          fill_color: fillColor, font_size: 14,
        });
      }
    } else if (mode === "icon") {
      onCreateElement({
        type: "icon", x: pt.x, y: pt.y,
        icon: selectedIcon, width: 10, height: 10,
        fill_color: fillColor, stroke_color: strokeColor,
      });
    }
  }, [mode, canvasToMeters, findNodeAt, findWallAt, findElementAt, isOnRotateHandle, isOnWallRotateHandle, onSelectNode, onSelectWall, onSelectElement, wallStart, onCreateWall, placingNodeId, onPlaceNode, triPoints, onCreateElement, fillColor, strokeColor, selectedIcon, selectedElementId, selectedWallId, elements, walls, locked]);

  const handleMouseMove = useCallback((e) => {
    const pt = canvasToMeters(e.clientX, e.clientY);
    if (!pt) return;
    setCursorPos(pt);

    // Inspect drag
    if (mode === "inspect" && inspectStart) {
      setInspectRect({ x1: inspectStart.x, y1: inspectStart.y, x2: pt.x, y2: pt.y });
      return;
    }

    if (!dragging) return;

    if (dragging.type === "node") {
      const node = nodes.find((n) => n.id === dragging.id);
      if (node) {
        node.x = Math.max(0, Math.min(floorWidth, pt.x));
        node.y = Math.max(0, Math.min(floorHeight, pt.y));
        flagRedraw();
      }
    } else if (dragging.type === "element") {
      const el = elements.find((e) => e.id === dragging.id);
      if (el) {
        const newX = Math.max(0, Math.min(floorWidth, pt.x - dragging.offsetX));
        const newY = Math.max(0, Math.min(floorHeight, pt.y - dragging.offsetY));
        el.x = newX;
        el.y = newY;
        if (el.type === "triangle" && el.points?.length >= 3 && dragging.startX != null) {
          const dx = newX - dragging.startX;
          const dy = newY - dragging.startY;
          if (!dragging._origPts) {
            dragging._origPts = el.points.map((p) => ({ x: p.x, y: p.y }));
          }
          el.points = dragging._origPts.map((p) => ({ x: p.x + dx, y: p.y + dy }));
        }
        flagRedraw();
      }
    } else if (dragging.type === "wall") {
      const wall = walls.find((w) => w.id === dragging.id);
      if (wall) {
        const dx = pt.x - dragging.startMouseX;
        const dy = pt.y - dragging.startMouseY;
        wall.x1 = dragging.origX1 + dx;
        wall.y1 = dragging.origY1 + dy;
        wall.x2 = dragging.origX2 + dx;
        wall.y2 = dragging.origY2 + dy;
        flagRedraw();
      }
    } else if (dragging.type === "rotate") {
      const angle = Math.atan2(pt.y - dragging.centerY, pt.x - dragging.centerX);
      let deg = (angle * 180 / Math.PI) + 90;
      const snapped = Math.round(deg / 15) * 15;
      if (Math.abs(deg - snapped) < 3) deg = snapped;
      deg = ((deg % 360) + 360) % 360;
      const el = elements.find((e) => e.id === dragging.id);
      if (el) {
        el.rotation = deg;
        flagRedraw();
      }
    } else if (dragging.type === "rotateWall") {
      const angle = Math.atan2(pt.y - dragging.midY, pt.x - dragging.midX);
      let snapped = Math.round(angle / (Math.PI / 12)) * (Math.PI / 12);
      if (Math.abs(angle - snapped) < 0.05) snapped = snapped;
      else snapped = angle;
      const wall = walls.find((w) => w.id === dragging.id);
      if (wall) {
        wall.x1 = dragging.midX - Math.cos(snapped) * dragging.halfLen;
        wall.y1 = dragging.midY - Math.sin(snapped) * dragging.halfLen;
        wall.x2 = dragging.midX + Math.cos(snapped) * dragging.halfLen;
        wall.y2 = dragging.midY + Math.sin(snapped) * dragging.halfLen;
        flagRedraw();
      }
    }
  }, [canvasToMeters, dragging, nodes, elements, walls, floorWidth, floorHeight, flagRedraw, mode, inspectStart]);

  const handleMouseUp = useCallback(() => {
    // Inspect mode: sample the heatmap grid
    if (mode === "inspect" && inspectStart && inspectRect) {
      const gridData = heatmapGridRef.current;
      if (gridData) {
        const x1 = Math.max(0, Math.min(Math.floor(Math.min(inspectRect.x1, inspectRect.x2)), gridData.W - 1));
        const y1 = Math.max(0, Math.min(Math.floor(Math.min(inspectRect.y1, inspectRect.y2)), gridData.H - 1));
        const x2 = Math.max(0, Math.min(Math.floor(Math.max(inspectRect.x1, inspectRect.x2)), gridData.W - 1));
        const y2 = Math.max(0, Math.min(Math.floor(Math.max(inspectRect.y1, inspectRect.y2)), gridData.H - 1));

        let sum = 0, count = 0;
        for (let gy = y1; gy <= y2; gy++) {
          for (let gx = x1; gx <= x2; gx++) {
            const v = gridData.grid[gy * gridData.W + gx];
            if (!isNaN(v)) {
              sum += v;
              count++;
            }
          }
        }

        if (count > 0 && onInspectResult) {
          const sensorType = SENSOR_TYPES.find((s) => s.key === sensorKey);
          onInspectResult({
            avg: sum / count,
            samples: count,
            unit: sensorType?.unit || "",
          });
        }
      }
      setInspectStart(null);
      // Keep inspectRect visible for reference
      return;
    }

    if (dragging) {
      if (dragging.type === "node") {
        const node = nodes.find((n) => n.id === dragging.id);
        if (node && (node.x !== dragging.startX || node.y !== dragging.startY)) {
          onMoveNode(dragging.id, node.x, node.y);
        }
      } else if (dragging.type === "element") {
        const el = elements.find((e) => e.id === dragging.id);
        if (el && onMoveElement) {
          onMoveElement(el.id, el.x, el.y, el.type === "triangle" ? el.points : undefined);
        }
      } else if (dragging.type === "wall") {
        const wall = walls.find((w) => w.id === dragging.id);
        if (wall && onUpdateWall) {
          const moved = wall.x1 !== dragging.origX1 || wall.y1 !== dragging.origY1 ||
                        wall.x2 !== dragging.origX2 || wall.y2 !== dragging.origY2;
          if (moved) {
            onUpdateWall(wall.id, { x1: wall.x1, y1: wall.y1, x2: wall.x2, y2: wall.y2 });
          }
        }
      } else if (dragging.type === "rotate") {
        const el = elements.find((e) => e.id === dragging.id);
        if (el && onRotateElement) {
          onRotateElement(el.id, el.rotation);
        }
      } else if (dragging.type === "rotateWall") {
        const wall = walls.find((w) => w.id === dragging.id);
        if (wall && onUpdateWall) {
          onUpdateWall(wall.id, { x1: wall.x1, y1: wall.y1, x2: wall.x2, y2: wall.y2 });
        }
      }
      setDragging(null);
    }
    // Finish shape drawing
    if (shapeStart && cursorPos && (mode === "rect" || mode === "circle")) {
      if (mode === "rect") {
        const rw = Math.abs(cursorPos.x - shapeStart.x);
        const rh = Math.abs(cursorPos.y - shapeStart.y);
        if (rw > 1 && rh > 1) {
          onCreateElement({
            type: "rect", x: (shapeStart.x + cursorPos.x) / 2, y: (shapeStart.y + cursorPos.y) / 2,
            width: rw, height: rh,
            fill_color: fillColor, stroke_color: strokeColor,
          });
        }
      } else {
        const dx = cursorPos.x - shapeStart.x;
        const dy = cursorPos.y - shapeStart.y;
        const r = Math.sqrt(dx * dx + dy * dy);
        if (r > 1) {
          onCreateElement({
            type: "circle", x: shapeStart.x, y: shapeStart.y, radius: r,
            fill_color: fillColor, stroke_color: strokeColor,
          });
        }
      }
      setShapeStart(null);
    }
  }, [dragging, nodes, elements, walls, onMoveNode, onMoveElement, onRotateElement, onUpdateWall, shapeStart, cursorPos, mode, onCreateElement, fillColor, strokeColor, inspectStart, inspectRect, sensorKey, onInspectResult]);

  // Escape to cancel
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") {
        setWallStart(null); setShapeStart(null); setTriPoints([]);
        setInspectStart(null); setInspectRect(null);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  // Attach wheel listener with passive: false for preventDefault
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.addEventListener("wheel", handleWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  return (
    <div ref={containerRef} className="w-full">
      <canvas
        ref={canvasRef}
        className={`rounded-lg border border-gray-200 dark:border-gray-700 ${locked ? "cursor-default" : "cursor-crosshair"}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          setCursorPos(null);
          if (dragging) handleMouseUp();
        }}
      />
    </div>
  );
}

/** Draw a small rotation handle circle with a curved arrow icon */
function drawRotateHandle(ctx, x, y) {
  ctx.save();
  ctx.strokeStyle = "#2563eb";
  ctx.lineWidth = 1;
  ctx.setLineDash([2, 2]);
  ctx.beginPath();
  ctx.moveTo(0, y + ROTATE_HANDLE_DIST > 0 ? 0 : y + ROTATE_HANDLE_DIST);
  ctx.lineTo(x, y);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = "#fff";
  ctx.strokeStyle = "#2563eb";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = "#2563eb";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x, y, 3, -Math.PI * 0.8, Math.PI * 0.5);
  ctx.stroke();
  const ax = x + 3 * Math.cos(Math.PI * 0.5);
  const ay = y + 3 * Math.sin(Math.PI * 0.5);
  ctx.beginPath();
  ctx.moveTo(ax - 2, ay - 2);
  ctx.lineTo(ax, ay);
  ctx.lineTo(ax + 2, ay - 2);
  ctx.stroke();

  ctx.restore();
}

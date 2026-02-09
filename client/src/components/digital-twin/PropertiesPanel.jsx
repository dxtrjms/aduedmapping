import { useState, useEffect } from "react";
import { TrashIcon, ArrowUturnLeftIcon } from "@heroicons/react/24/outline";
import { SENSOR_TYPES } from "../../utils/heatmap";
import { ICON_NAMES } from "../../utils/icons";

export default function PropertiesPanel({
  selectedNode, readingForSelectedNode, onUpdateNode, onDeleteNode, onUnplaceNode,
  selectedWall, onUpdateWall, onDeleteWall,
  selectedElement, onUpdateElement, onDeleteElement,
  locked,
}) {
  // --- Wall measurement editing ---
  const [wallLength, setWallLength] = useState("");
  const [wallAngle, setWallAngle] = useState("");
  const [wallX1, setWallX1] = useState("");
  const [wallY1, setWallY1] = useState("");
  const [wallX2, setWallX2] = useState("");
  const [wallY2, setWallY2] = useState("");

  useEffect(() => {
    if (selectedWall) {
      const dx = selectedWall.x2 - selectedWall.x1;
      const dy = selectedWall.y2 - selectedWall.y1;
      setWallLength(Math.sqrt(dx * dx + dy * dy).toFixed(2));
      const angle = ((Math.atan2(dy, dx) * 180 / Math.PI) + 360) % 360;
      setWallAngle(angle.toFixed(1));
      setWallX1(selectedWall.x1?.toFixed(1) ?? "");
      setWallY1(selectedWall.y1?.toFixed(1) ?? "");
      setWallX2(selectedWall.x2?.toFixed(1) ?? "");
      setWallY2(selectedWall.y2?.toFixed(1) ?? "");
    }
  }, [selectedWall]);

  const handleWallLengthChange = async () => {
    if (!selectedWall) return;
    const newLen = parseFloat(wallLength);
    if (isNaN(newLen) || newLen <= 0) return;
    const dx = selectedWall.x2 - selectedWall.x1;
    const dy = selectedWall.y2 - selectedWall.y1;
    const curLen = Math.sqrt(dx * dx + dy * dy);
    if (curLen === 0) return;
    const scale = newLen / curLen;
    await onUpdateWall(selectedWall.id, {
      x1: selectedWall.x1,
      y1: selectedWall.y1,
      x2: selectedWall.x1 + dx * scale,
      y2: selectedWall.y1 + dy * scale,
    });
  };

  const handleWallAngleChange = async () => {
    if (!selectedWall) return;
    const newAngle = parseFloat(wallAngle);
    if (isNaN(newAngle)) return;
    const dx = selectedWall.x2 - selectedWall.x1;
    const dy = selectedWall.y2 - selectedWall.y1;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) return;
    const midX = (selectedWall.x1 + selectedWall.x2) / 2;
    const midY = (selectedWall.y1 + selectedWall.y2) / 2;
    const rad = (newAngle * Math.PI) / 180;
    const halfLen = len / 2;
    await onUpdateWall(selectedWall.id, {
      x1: midX - Math.cos(rad) * halfLen,
      y1: midY - Math.sin(rad) * halfLen,
      x2: midX + Math.cos(rad) * halfLen,
      y2: midY + Math.sin(rad) * halfLen,
    });
  };

  const handleWallCoordsChange = async () => {
    if (!selectedWall) return;
    const x1 = parseFloat(wallX1), y1 = parseFloat(wallY1);
    const x2 = parseFloat(wallX2), y2 = parseFloat(wallY2);
    if ([x1, y1, x2, y2].some(isNaN)) return;
    await onUpdateWall(selectedWall.id, { x1, y1, x2, y2 });
  };

  // --- Element editing ---
  const [elemForm, setElemForm] = useState({});

  useEffect(() => {
    if (selectedElement) {
      setElemForm({
        fill_color: selectedElement.fill_color || "#3b82f6",
        stroke_color: selectedElement.stroke_color || "#1e3a5f",
        stroke_width: selectedElement.stroke_width ?? 2,
        font_size: selectedElement.font_size ?? 14,
        rotation: selectedElement.rotation ?? 0,
        text: selectedElement.text || "",
        width: selectedElement.width || "",
        height: selectedElement.height || "",
        radius: selectedElement.radius || "",
        icon: selectedElement.icon || "",
      });
    }
  }, [selectedElement]);

  const handleElemSave = async (overrides = {}) => {
    if (!selectedElement) return;
    const body = { ...selectedElement, ...elemForm, ...overrides };
    body.stroke_width = Number(body.stroke_width) || 2;
    body.font_size = Number(body.font_size) || 14;
    body.rotation = Number(body.rotation) || 0;
    if (body.width) body.width = Number(body.width);
    if (body.height) body.height = Number(body.height);
    if (body.radius) body.radius = Number(body.radius);
    await onUpdateElement(selectedElement.id, body);
  };

  // --- Node point_size editing ---
  const [nodePointSize, setNodePointSize] = useState("6");

  useEffect(() => {
    if (selectedNode) {
      setNodePointSize(String(selectedNode.point_size ?? 6));
    }
  }, [selectedNode]);

  const handleNodePointSizeBlur = () => {
    if (!selectedNode) return;
    const ps = Number(nodePointSize) || 6;
    if (ps !== (selectedNode.point_size ?? 6)) {
      onUpdateNode(selectedNode.id, {
        name: selectedNode.name, location: selectedNode.location,
        x: selectedNode.x, y: selectedNode.y,
        coverage_radius: selectedNode.coverage_radius,
        is_active: selectedNode.is_active,
        canvas_id: selectedNode.canvas_id,
        point_size: ps,
      });
    }
  };

  const inputCls = "w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500";
  const readOnlyCls = inputCls + (locked ? " bg-gray-50 dark:bg-gray-800" : "");

  // --- Wall panel ---
  if (selectedWall) {
    return (
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Wall</h3>
          {!locked && (
            <button onClick={() => onDeleteWall(selectedWall.id)}
              className="p-1 rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30">
              <TrashIcon className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="text-xs space-y-2 text-gray-600 dark:text-gray-400">
          <div className="grid grid-cols-2 gap-1">
            <div>
              <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">X1</label>
              <input type="number" step="0.1" value={wallX1} readOnly={locked}
                onChange={(e) => setWallX1(e.target.value)}
                onBlur={handleWallCoordsChange}
                onKeyDown={(e) => { if (e.key === "Enter") handleWallCoordsChange(); }}
                className={readOnlyCls} />
            </div>
            <div>
              <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">Y1</label>
              <input type="number" step="0.1" value={wallY1} readOnly={locked}
                onChange={(e) => setWallY1(e.target.value)}
                onBlur={handleWallCoordsChange}
                onKeyDown={(e) => { if (e.key === "Enter") handleWallCoordsChange(); }}
                className={readOnlyCls} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1">
            <div>
              <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">X2</label>
              <input type="number" step="0.1" value={wallX2} readOnly={locked}
                onChange={(e) => setWallX2(e.target.value)}
                onBlur={handleWallCoordsChange}
                onKeyDown={(e) => { if (e.key === "Enter") handleWallCoordsChange(); }}
                className={readOnlyCls} />
            </div>
            <div>
              <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">Y2</label>
              <input type="number" step="0.1" value={wallY2} readOnly={locked}
                onChange={(e) => setWallY2(e.target.value)}
                onBlur={handleWallCoordsChange}
                onKeyDown={(e) => { if (e.key === "Enter") handleWallCoordsChange(); }}
                className={readOnlyCls} />
            </div>
          </div>
          <div>
            <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">Length (m)</label>
            <input type="number" step="0.1" min="0.1" value={wallLength} readOnly={locked}
              onChange={(e) => setWallLength(e.target.value)}
              onBlur={handleWallLengthChange}
              onKeyDown={(e) => { if (e.key === "Enter") handleWallLengthChange(); }}
              className={readOnlyCls} />
          </div>
          <div>
            <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">Angle</label>
            <input type="number" step="15" min="0" max="360" value={wallAngle} readOnly={locked}
              onChange={(e) => setWallAngle(e.target.value)}
              onBlur={handleWallAngleChange}
              onKeyDown={(e) => { if (e.key === "Enter") handleWallAngleChange(); }}
              className={readOnlyCls} />
          </div>
        </div>
      </div>
    );
  }

  // --- Element panel ---
  if (selectedElement) {
    const triSides = [];
    if (selectedElement.type === "triangle" && selectedElement.points?.length >= 3) {
      const pts = selectedElement.points;
      for (let i = 0; i < 3; i++) {
        const j = (i + 1) % 3;
        const dx = pts[j].x - pts[i].x;
        const dy = pts[j].y - pts[i].y;
        triSides.push(Math.sqrt(dx * dx + dy * dy));
      }
    }

    return (
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 capitalize">{selectedElement.type}</h3>
          {!locked && (
            <button onClick={() => onDeleteElement(selectedElement.id)}
              className="p-1 rounded text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30">
              <TrashIcon className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="space-y-2 text-xs">
          {selectedElement.type === "text" && (
            <div>
              <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">Text</label>
              <input value={elemForm.text || ""} readOnly={locked}
                onChange={(e) => setElemForm((f) => ({ ...f, text: e.target.value }))}
                onBlur={() => handleElemSave()}
                className={readOnlyCls}
              />
            </div>
          )}
          {selectedElement.type === "text" && (
            <div>
              <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">Font Size</label>
              <input type="number" step="1" min="8" max="72" readOnly={locked}
                value={elemForm.font_size}
                onChange={(e) => setElemForm((f) => ({ ...f, font_size: e.target.value }))}
                onBlur={() => handleElemSave()}
                className={readOnlyCls}
              />
            </div>
          )}
          {(selectedElement.type === "rect" || selectedElement.type === "icon") && (
            <div className="grid grid-cols-2 gap-1">
              <div>
                <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">Width</label>
                <input type="number" step="1" value={elemForm.width || ""} readOnly={locked}
                  onChange={(e) => setElemForm((f) => ({ ...f, width: e.target.value }))}
                  onBlur={() => handleElemSave()}
                  className={readOnlyCls}
                />
              </div>
              <div>
                <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">Height</label>
                <input type="number" step="1" value={elemForm.height || ""} readOnly={locked}
                  onChange={(e) => setElemForm((f) => ({ ...f, height: e.target.value }))}
                  onBlur={() => handleElemSave()}
                  className={readOnlyCls}
                />
              </div>
            </div>
          )}
          {selectedElement.type === "circle" && (
            <div>
              <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">Radius</label>
              <input type="number" step="1" value={elemForm.radius || ""} readOnly={locked}
                onChange={(e) => setElemForm((f) => ({ ...f, radius: e.target.value }))}
                onBlur={() => handleElemSave()}
                className={readOnlyCls}
              />
            </div>
          )}
          {selectedElement.type === "triangle" && triSides.length === 3 && (
            <div>
              <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">Side Lengths (m)</label>
              <div className="text-gray-500 dark:text-gray-400 space-y-0.5">
                {triSides.map((s, i) => (
                  <div key={i} className="flex justify-between">
                    <span>Side {i + 1}</span>
                    <span>{s.toFixed(1)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {selectedElement.type === "icon" && (
            <div>
              <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">Icon Type</label>
              <select value={elemForm.icon} disabled={locked}
                onChange={(e) => { setElemForm((f) => ({ ...f, icon: e.target.value })); handleElemSave({ icon: e.target.value }); }}
                className={readOnlyCls}>
                {ICON_NAMES.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">Rotation</label>
            <input type="number" step="15" min="0" max="360" readOnly={locked}
              value={elemForm.rotation}
              onChange={(e) => setElemForm((f) => ({ ...f, rotation: e.target.value }))}
              onBlur={() => handleElemSave()}
              className={readOnlyCls}
            />
          </div>
          <div>
            <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">Stroke Width</label>
            <input type="number" step="1" min="0" max="20" readOnly={locked}
              value={elemForm.stroke_width}
              onChange={(e) => setElemForm((f) => ({ ...f, stroke_width: e.target.value }))}
              onBlur={() => handleElemSave()}
              className={readOnlyCls}
            />
          </div>
          {selectedElement.type !== "text" && (
            <div className="grid grid-cols-2 gap-1">
              <div>
                <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">Fill</label>
                <input type="color" value={elemForm.fill_color} disabled={locked}
                  onChange={(e) => { setElemForm((f) => ({ ...f, fill_color: e.target.value })); }}
                  onBlur={() => handleElemSave()}
                  className="w-full h-6 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
                />
              </div>
              <div>
                <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">Stroke</label>
                <input type="color" value={elemForm.stroke_color} disabled={locked}
                  onChange={(e) => { setElemForm((f) => ({ ...f, stroke_color: e.target.value })); }}
                  onBlur={() => handleElemSave()}
                  className="w-full h-6 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
                />
              </div>
            </div>
          )}
          {selectedElement.type === "text" && (
            <div>
              <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">Color</label>
              <input type="color" value={elemForm.fill_color} disabled={locked}
                onChange={(e) => { setElemForm((f) => ({ ...f, fill_color: e.target.value })); }}
                onBlur={() => handleElemSave()}
                className="w-full h-6 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  // --- Node panel ---
  if (selectedNode) {
    return (
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">{selectedNode.name}</h3>
          {!locked && (
            <div className="flex items-center gap-1">
              <button onClick={() => onUnplaceNode(selectedNode.id)}
                title="Remove from canvas"
                className="p-1 rounded text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/30">
                <ArrowUturnLeftIcon className="h-4 w-4" />
              </button>
              <button onClick={() => { if (confirm(`Permanently delete node "${selectedNode.name}"? This cannot be undone.`)) onDeleteNode(selectedNode.id); }}
                title="Delete permanently"
                className="p-1 rounded text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30">
                <TrashIcon className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
        <dl className="text-xs space-y-1 text-gray-600 dark:text-gray-400">
          <div className="flex justify-between">
            <dt>Position</dt>
            <dd>{selectedNode.x?.toFixed(1)}, {selectedNode.y?.toFixed(1)} m</dd>
          </div>
          <div className="flex justify-between">
            <dt>Radius</dt>
            <dd>{selectedNode.coverage_radius || 15} m</dd>
          </div>
          <div className="pt-1">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Point Size</label>
            <input type="number" step="1" min="2" max="30" readOnly={locked}
              value={nodePointSize}
              onChange={(e) => setNodePointSize(e.target.value)}
              onBlur={handleNodePointSizeBlur}
              className={readOnlyCls}
            />
          </div>
          {readingForSelectedNode && (
            <>
              <div className="border-t border-gray-100 dark:border-gray-700 pt-1 mt-1">
                <dt className="font-medium text-gray-700 dark:text-gray-300">Latest Readings</dt>
              </div>
              {SENSOR_TYPES.map((s) => {
                const v = readingForSelectedNode[s.key];
                if (v == null) return null;
                return (
                  <div key={s.key} className="flex justify-between">
                    <dt>{s.label}</dt>
                    <dd>{typeof v === "number" ? v.toFixed(1) : v} {s.unit}</dd>
                  </div>
                );
              })}
            </>
          )}
        </dl>
      </div>
    );
  }

  return null;
}

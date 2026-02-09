import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useNodes } from "../hooks/useNodes";
import { useWalls } from "../hooks/useWalls";
import { useCanvases } from "../hooks/useCanvases";
import { useCanvasElements } from "../hooks/useCanvasElements";
import { useLatestReadings } from "../hooks/useLatestReadings";
import { SENSOR_TYPES } from "../utils/heatmap";
import { ICON_NAMES } from "../utils/icons";
import SensorSelector from "../components/digital-twin/SensorSelector";
import CanvasToolbar from "../components/digital-twin/CanvasToolbar";
import CanvasManager from "../components/digital-twin/CanvasManager";
import FloorCanvas from "../components/digital-twin/FloorCanvas";
import PropertiesPanel from "../components/digital-twin/PropertiesPanel";
import HeatmapSettings from "../components/digital-twin/HeatmapSettings";
import NodeFormModal from "../components/NodeFormModal";

export default function DigitalTwinPage() {
  const { nodes, update: updateNode, create: createNode, remove: removeNode } = useNodes();
  const { canvases, create: createCanvas, update: updateCanvas, remove: removeCanvas } = useCanvases();
  const { readings, refetch: refetchReadings } = useLatestReadings();

  const [activeCanvasId, setActiveCanvasId] = useState(null);

  // Auto-select first canvas when loaded
  const effectiveCanvasId = activeCanvasId || (canvases.length > 0 ? canvases[0].id : null);

  const { walls, create: createWall, update: updateWall, remove: removeWall } = useWalls(effectiveCanvasId);
  const { elements, create: createElement, update: updateElement, remove: removeElement } = useCanvasElements(effectiveCanvasId);

  const activeCanvas = canvases.find((c) => c.id === effectiveCanvasId);

  const [mode, setMode] = useState("select");
  const [sensorKey, setSensorKey] = useState("temperature_c");
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [selectedWallId, setSelectedWallId] = useState(null);
  const [selectedElementId, setSelectedElementId] = useState(null);
  const [placingNodeId, setPlacingNodeId] = useState(null);

  // Drawing colors
  const [fillColor, setFillColor] = useState("#3b82f6");
  const [strokeColor, setStrokeColor] = useState("#1e3a5f");
  const [selectedIcon, setSelectedIcon] = useState(ICON_NAMES[0]);

  // Node form modal (for adding from canvas)
  const [nodeModalOpen, setNodeModalOpen] = useState(false);

  // Zoom & pan
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });

  // Lock per canvas (client-side only)
  const [lockedCanvases, setLockedCanvases] = useState(new Set());
  const isLocked = effectiveCanvasId ? lockedCanvases.has(effectiveCanvasId) : false;
  const handleToggleLock = useCallback(() => {
    if (!effectiveCanvasId) return;
    setLockedCanvases((prev) => {
      const next = new Set(prev);
      if (next.has(effectiveCanvasId)) next.delete(effectiveCanvasId);
      else next.add(effectiveCanvasId);
      return next;
    });
  }, [effectiveCanvasId]);

  // Node label toggle
  const [showNodeNames, setShowNodeNames] = useState(true);

  // Wall font size (0 = auto)
  const [wallFontSize, setWallFontSize] = useState(0);

  // Fullscreen
  const [isFullscreen, setIsFullscreen] = useState(false);
  const fullscreenRef = useRef(null);

  const handleToggleFullscreen = useCallback(() => {
    const el = fullscreenRef.current;
    if (!el) return;
    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
      (el.requestFullscreen || el.webkitRequestFullscreen)?.call(el);
    } else {
      (document.exitFullscreen || document.webkitExitFullscreen)?.call(document);
    }
  }, []);

  useEffect(() => {
    const handler = () => {
      setIsFullscreen(!!(document.fullscreenElement || document.webkitFullscreenElement));
    };
    document.addEventListener("fullscreenchange", handler);
    document.addEventListener("webkitfullscreenchange", handler);
    return () => {
      document.removeEventListener("fullscreenchange", handler);
      document.removeEventListener("webkitfullscreenchange", handler);
    };
  }, []);

  // Fullscreen keyboard shortcut (F key)
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "f" || e.key === "F") {
        const tag = e.target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
        handleToggleFullscreen();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleToggleFullscreen]);

  // Heatmap config
  const defaultHeatmapConfig = {
    enabled: true,
    opacity: 160,
    power: 2,
    radiusMultiplier: 1,
    minOverride: "",
    maxOverride: "",
    colorStops: [],
  };
  const [heatmapConfig, setHeatmapConfig] = useState(defaultHeatmapConfig);

  // Inspect result
  const [inspectResult, setInspectResult] = useState(null);

  // Filter nodes for this canvas
  const canvasNodes = useMemo(() =>
    nodes.filter((n) => n.canvas_id === effectiveCanvasId),
    [nodes, effectiveCanvasId]
  );

  const selectedNode = canvasNodes.find((n) => n.id === selectedNodeId) || null;
  const selectedWall = walls.find((w) => w.id === selectedWallId) || null;
  const selectedElement = elements.find((e) => e.id === selectedElementId) || null;
  const sensorType = SENSOR_TYPES.find((s) => s.key === sensorKey) || null;
  const unplacedNodes = nodes.filter((n) => n.x == null || n.y == null);

  const readingForSelectedNode = selectedNodeId
    ? readings.find((r) => r.node_id === selectedNodeId)
    : null;

  const hasSelection = selectedWallId != null || selectedNodeId != null || selectedElementId != null;

  const handleModeChange = useCallback((m) => {
    setMode(m);
    if (m !== "place") setPlacingNodeId(null);
    if (m !== "select") { setSelectedNodeId(null); setSelectedWallId(null); setSelectedElementId(null); }
    if (m !== "inspect") setInspectResult(null);
  }, []);

  // Unplace a node (remove from canvas but keep in DB)
  const handleUnplaceNode = useCallback(async (id) => {
    if (isLocked) return;
    const node = nodes.find((n) => n.id === id);
    if (!node) return;
    await updateNode(id, {
      name: node.name, location: node.location,
      x: null, y: null,
      coverage_radius: node.coverage_radius, is_active: node.is_active,
      canvas_id: null, point_size: node.point_size,
    });
    setSelectedNodeId(null);
  }, [nodes, updateNode, isLocked]);

  const handleDeleteSelected = useCallback(async () => {
    if (isLocked) return;
    if (selectedWallId != null) { await removeWall(selectedWallId); setSelectedWallId(null); }
    else if (selectedElementId != null) { await removeElement(selectedElementId); setSelectedElementId(null); }
    else if (selectedNodeId != null) {
      await handleUnplaceNode(selectedNodeId);
    }
  }, [selectedWallId, selectedElementId, selectedNodeId, removeWall, removeElement, handleUnplaceNode, isLocked]);

  const handleCreateWall = useCallback(async (coords) => {
    if (isLocked) return;
    await createWall(coords);
  }, [createWall, isLocked]);

  const handleCreateElement = useCallback(async (body) => {
    if (isLocked) return;
    await createElement(body);
  }, [createElement, isLocked]);

  const handlePlaceNode = useCallback(async (nodeId, x, y) => {
    if (isLocked) return;
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;
    await updateNode(nodeId, {
      name: node.name, location: node.location, x, y,
      coverage_radius: node.coverage_radius, is_active: node.is_active,
      canvas_id: effectiveCanvasId, point_size: node.point_size,
    });
    setPlacingNodeId(null);
    setMode("select");
    setSelectedNodeId(nodeId);
  }, [nodes, updateNode, effectiveCanvasId, isLocked]);

  const handleMoveNode = useCallback(async (nodeId, x, y) => {
    if (isLocked) return;
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;
    await updateNode(nodeId, {
      name: node.name, location: node.location, x, y,
      coverage_radius: node.coverage_radius, is_active: node.is_active,
      canvas_id: node.canvas_id, point_size: node.point_size,
    });
  }, [nodes, updateNode, isLocked]);

  // Drag-move an element to new x,y (and optionally new triangle points)
  const handleMoveElement = useCallback(async (id, newX, newY, newPoints) => {
    if (isLocked) return;
    const el = elements.find((e) => e.id === id);
    if (!el) return;
    const body = { ...el, x: newX, y: newY };
    if (newPoints) body.points = newPoints;
    await updateElement(id, body);
  }, [elements, updateElement, isLocked]);

  // Rotate an element to a new rotation value
  const handleRotateElement = useCallback(async (id, newRotation) => {
    if (isLocked) return;
    const el = elements.find((e) => e.id === id);
    if (!el) return;
    await updateElement(id, { ...el, rotation: newRotation });
  }, [elements, updateElement, isLocked]);

  const handleUpdateNode = useCallback(async (id, body) => {
    await updateNode(id, body);
  }, [updateNode]);

  const handleDeleteNode = useCallback(async (id) => {
    await removeNode(id);
    setSelectedNodeId(null);
  }, [removeNode]);

  const handleUpdateWall = useCallback(async (id, body) => {
    await updateWall(id, body);
  }, [updateWall]);

  const handleDeleteWall = useCallback(async (id) => {
    await removeWall(id);
    setSelectedWallId(null);
  }, [removeWall]);

  const handleUpdateElement = useCallback(async (id, body) => {
    await updateElement(id, body);
  }, [updateElement]);

  const handleDeleteElement = useCallback(async (id) => {
    await removeElement(id);
    setSelectedElementId(null);
  }, [removeElement]);

  const startPlacing = useCallback((nodeId) => {
    setMode("place");
    setPlacingNodeId(nodeId);
    setSelectedNodeId(null); setSelectedWallId(null); setSelectedElementId(null);
  }, []);

  const handleCanvasSelect = useCallback((id) => {
    setActiveCanvasId(id);
    setSelectedNodeId(null); setSelectedWallId(null); setSelectedElementId(null);
  }, []);

  // Add node from canvas context
  const handleAddNodeFromCanvas = useCallback(() => {
    setNodeModalOpen(true);
  }, []);

  // After creating a node (with possible initial_reading), refetch readings for heatmap
  const handleNodeFormSubmit = useCallback(async (form) => {
    await createNode(form);
    // If initial_reading was included, refetch readings so heatmap updates
    if (form.initial_reading) {
      setTimeout(() => refetchReadings(), 500);
    }
  }, [createNode, refetchReadings]);

  return (
    <div>
      {/* Header row */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Digital Twin</h2>
        <div className="flex items-center gap-4 flex-wrap">
          <CanvasManager
            canvases={canvases}
            activeCanvasId={effectiveCanvasId}
            onSelect={handleCanvasSelect}
            onCreate={createCanvas}
            onUpdate={updateCanvas}
            onDelete={removeCanvas}
          />
          <SensorSelector selected={sensorKey} onChange={setSensorKey} />
        </div>
      </div>

      {/* Toolbar */}
      <div className="mb-3">
        <CanvasToolbar
          mode={mode}
          onModeChange={handleModeChange}
          onDeleteSelected={handleDeleteSelected}
          hasSelection={hasSelection}
          isNodeSelected={selectedNodeId != null}
          fillColor={fillColor}
          strokeColor={strokeColor}
          onFillColorChange={setFillColor}
          onStrokeColorChange={setStrokeColor}
          selectedIcon={selectedIcon}
          onIconChange={setSelectedIcon}
          locked={isLocked}
          onToggleLock={handleToggleLock}
          showNodeNames={showNodeNames}
          onToggleNodeNames={() => setShowNodeNames((v) => !v)}
          wallFontSize={wallFontSize}
          onWallFontSizeChange={setWallFontSize}
          isFullscreen={isFullscreen}
          onToggleFullscreen={handleToggleFullscreen}
        />
      </div>

      {/* Main area: canvas + sidebar */}
      <div ref={fullscreenRef} className={`flex gap-4 ${isFullscreen ? "fixed inset-0 z-50 bg-white dark:bg-gray-900 p-4" : ""}`}>
        {/* Canvas */}
        <div className="flex-1 min-w-0">
          {isFullscreen && (
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{activeCanvas?.name || "Canvas"}</span>
              <button
                onClick={handleToggleFullscreen}
                className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              >Exit Fullscreen</button>
            </div>
          )}
          <FloorCanvas
            nodes={canvasNodes}
            walls={walls}
            readings={readings}
            sensorKey={sensorKey}
            mode={mode}
            floorWidth={activeCanvas?.width || 170}
            floorHeight={activeCanvas?.height || 220}
            selectedNodeId={selectedNodeId}
            onSelectNode={setSelectedNodeId}
            selectedWallId={selectedWallId}
            onSelectWall={setSelectedWallId}
            selectedElementId={selectedElementId}
            onSelectElement={setSelectedElementId}
            placingNodeId={placingNodeId}
            onPlaceNode={handlePlaceNode}
            onMoveNode={handleMoveNode}
            onMoveElement={handleMoveElement}
            onRotateElement={handleRotateElement}
            onUpdateWall={handleUpdateWall}
            onCreateWall={handleCreateWall}
            onCreateElement={handleCreateElement}
            elements={elements}
            fillColor={fillColor}
            strokeColor={strokeColor}
            selectedIcon={selectedIcon}
            locked={isLocked}
            zoom={zoom}
            panOffset={panOffset}
            onZoomChange={setZoom}
            onPanOffsetChange={setPanOffset}
            showNodeNames={showNodeNames}
            wallFontSize={wallFontSize}
            heatmapConfig={heatmapConfig}
            onInspectResult={setInspectResult}
          />
          {/* Zoom controls */}
          <div className="flex items-center gap-1 mt-1">
            <button
              onClick={() => setZoom((z) => Math.min(5, z * 1.25))}
              className="px-2 py-0.5 rounded border border-gray-300 dark:border-gray-600 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >+</button>
            <button
              onClick={() => setZoom((z) => Math.max(0.5, z / 1.25))}
              className="px-2 py-0.5 rounded border border-gray-300 dark:border-gray-600 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >−</button>
            <button
              onClick={() => { setZoom(1); setPanOffset({ x: 0, y: 0 }); }}
              className="px-2 py-0.5 rounded border border-gray-300 dark:border-gray-600 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >Reset</button>
            <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">{Math.round(zoom * 100)}%</span>
          </div>
        </div>

        {/* Sidebar (hidden in fullscreen) */}
        {!isFullscreen && (
        <div className="w-56 shrink-0 space-y-4">
          {/* Add node button */}
          <button
            onClick={handleAddNodeFromCanvas}
            className="w-full flex items-center justify-center gap-1.5 bg-blue-600 text-white rounded-md px-3 py-1.5 text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Add Node
          </button>

          {/* Unplaced nodes */}
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Unplaced Nodes</h3>
            {unplacedNodes.length === 0 ? (
              <p className="text-xs text-gray-500 dark:text-gray-400">All nodes placed</p>
            ) : (
              <ul className="space-y-1">
                {unplacedNodes.map((n) => (
                  <li key={n.id}>
                    <button
                      onClick={() => startPlacing(n.id)}
                      className={`w-full text-left text-sm px-2 py-1 rounded transition-colors ${
                        placingNodeId === n.id
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                          : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      }`}
                    >
                      {n.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Color legend */}
          {sensorType && (
            <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">
                {sensorType.label} Legend
              </h3>
              <div
                className="h-4 rounded"
                style={{
                  background: heatmapConfig.colorStops?.length >= 2
                    ? `linear-gradient(to right, ${heatmapConfig.colorStops.map((s) => s.color).join(", ")})`
                    : "linear-gradient(to right, #0000ff, #00ffff, #00ff00, #ffff00, #ff0000)",
                }}
              />
              <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mt-1">
                <span>{heatmapConfig.minOverride || sensorType.min}{sensorType.unit}</span>
                <span>{heatmapConfig.maxOverride || sensorType.max}{sensorType.unit}</span>
              </div>
            </div>
          )}

          {/* Heatmap settings */}
          <HeatmapSettings config={heatmapConfig} onChange={setHeatmapConfig} sensorType={sensorType} />

          {/* Inspect result */}
          {inspectResult && (
            <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/50 p-3">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-200">Inspection</h3>
                <button onClick={() => setInspectResult(null)} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">Clear</button>
              </div>
              <p className="text-lg font-bold text-blue-800 dark:text-blue-100">
                {inspectResult.avg.toFixed(1)} {inspectResult.unit}
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400">{inspectResult.samples} sample{inspectResult.samples !== 1 ? "s" : ""} averaged</p>
            </div>
          )}

          {/* Properties panel */}
          <PropertiesPanel
            selectedNode={selectedNode}
            readingForSelectedNode={readingForSelectedNode}
            onUpdateNode={handleUpdateNode}
            onDeleteNode={handleDeleteNode}
            onUnplaceNode={handleUnplaceNode}
            selectedWall={selectedWall}
            onUpdateWall={handleUpdateWall}
            onDeleteWall={handleDeleteWall}
            selectedElement={selectedElement}
            onUpdateElement={handleUpdateElement}
            onDeleteElement={handleDeleteElement}
            locked={isLocked}
          />
        </div>
        )}
      </div>

      {/* Node form modal for adding from canvas */}
      <NodeFormModal
        open={nodeModalOpen}
        onClose={() => setNodeModalOpen(false)}
        onSubmit={handleNodeFormSubmit}
        node={null}
        canvases={canvases}
      />
    </div>
  );
}

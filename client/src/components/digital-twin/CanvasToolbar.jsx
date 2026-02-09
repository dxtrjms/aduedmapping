import {
  CursorArrowRaysIcon,
  PencilIcon,
  MapPinIcon,
  TrashIcon,
  ArrowUturnLeftIcon,
  Square2StackIcon,
  StopIcon,
  LockClosedIcon,
  LockOpenIcon,
  TagIcon,
  MagnifyingGlassIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
} from "@heroicons/react/24/outline";
import { ICON_NAMES } from "../../utils/icons";

const toolGroups = [
  {
    label: "Selection",
    tools: [
      { id: "select", label: "Select", icon: CursorArrowRaysIcon },
    ],
  },
  {
    label: "Lines",
    tools: [
      { id: "wall", label: "Wall", icon: PencilIcon },
    ],
  },
  {
    label: "Shapes",
    tools: [
      { id: "rect", label: "Rect", icon: StopIcon },
      { id: "circle", label: "Circle", icon: () => (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="9" />
        </svg>
      )},
      { id: "triangle", label: "Tri", icon: () => (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 3L22 21H2Z" />
        </svg>
      )},
    ],
  },
  {
    label: "Annotation",
    tools: [
      { id: "text", label: "Text", icon: () => (
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
          <text x="4" y="18" fontSize="16" fontWeight="bold">T</text>
        </svg>
      )},
      { id: "icon", label: "Icon", icon: Square2StackIcon },
    ],
  },
  {
    label: "Nodes",
    tools: [
      { id: "place", label: "Place", icon: MapPinIcon },
    ],
  },
  {
    label: "Inspect",
    tools: [
      { id: "inspect", label: "Inspect", icon: MagnifyingGlassIcon },
    ],
  },
];

export default function CanvasToolbar({
  mode, onModeChange, onDeleteSelected, hasSelection, isNodeSelected,
  fillColor, strokeColor, onFillColorChange, onStrokeColorChange,
  selectedIcon, onIconChange,
  locked, onToggleLock,
  showNodeNames, onToggleNodeNames,
  wallFontSize, onWallFontSizeChange,
  isFullscreen, onToggleFullscreen,
}) {
  const showColorPickers = ["rect", "circle", "triangle", "text", "icon"].includes(mode);
  const showIconPicker = mode === "icon";

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {/* Lock toggle */}
      <button
        onClick={onToggleLock}
        title={locked ? "Unlock canvas" : "Lock canvas"}
        className={`flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
          locked ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
        }`}
      >
        {locked ? <LockClosedIcon className="h-4 w-4" /> : <LockOpenIcon className="h-4 w-4" />}
        {locked ? "Locked" : "Lock"}
      </button>
      <div className="w-px h-5 bg-gray-200 dark:bg-gray-600 mx-0.5" />

      {toolGroups.map((group) => (
        <div key={group.label} className="flex items-center gap-0.5">
          {group.tools.map((t) => {
            const Icon = t.icon;
            const active = mode === t.id;
            const disabled = locked && t.id !== "select" && t.id !== "inspect";
            return (
              <button
                key={t.id}
                onClick={() => !disabled && onModeChange(t.id)}
                title={t.label}
                disabled={disabled}
                className={`flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  disabled ? "text-gray-300 dark:text-gray-600 cursor-not-allowed" :
                  active ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                <Icon className="h-4 w-4" />
                {t.label}
              </button>
            );
          })}
          <div className="w-px h-5 bg-gray-200 dark:bg-gray-600 mx-0.5" />
        </div>
      ))}

      {/* Labels toggle */}
      <button
        onClick={onToggleNodeNames}
        title={showNodeNames ? "Hide node labels" : "Show node labels"}
        className={`flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
          showNodeNames ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
        }`}
      >
        <TagIcon className="h-4 w-4" />
        Labels
      </button>

      {/* Wall Font Size */}
      <div className="flex items-center gap-1 ml-1">
        <label className="text-xs text-gray-500 dark:text-gray-400">Wall Font</label>
        <input
          type="number"
          min="0"
          max="30"
          step="1"
          value={wallFontSize}
          onChange={(e) => onWallFontSizeChange(Number(e.target.value) || 0)}
          title="Wall font size (0 = auto)"
          className="w-12 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 rounded px-1 py-0.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
      <div className="w-px h-5 bg-gray-200 dark:bg-gray-600 mx-0.5" />

      {/* Fullscreen toggle */}
      <button
        onClick={onToggleFullscreen}
        title={isFullscreen ? "Exit fullscreen (F)" : "Fullscreen (F)"}
        className="flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      >
        {isFullscreen ? <ArrowsPointingInIcon className="h-4 w-4" /> : <ArrowsPointingOutIcon className="h-4 w-4" />}
      </button>

      {/* Color pickers */}
      {showColorPickers && (
        <div className="flex items-center gap-1 ml-1">
          <label className="text-xs text-gray-500 dark:text-gray-400">Fill</label>
          <input type="color" value={fillColor}
            onChange={(e) => onFillColorChange(e.target.value)}
            className="w-6 h-6 rounded border border-gray-300 dark:border-gray-600 cursor-pointer" />
          {mode !== "text" && (
            <>
              <label className="text-xs text-gray-500 dark:text-gray-400 ml-1">Stroke</label>
              <input type="color" value={strokeColor}
                onChange={(e) => onStrokeColorChange(e.target.value)}
                className="w-6 h-6 rounded border border-gray-300 dark:border-gray-600 cursor-pointer" />
            </>
          )}
        </div>
      )}

      {/* Icon picker */}
      {showIconPicker && (
        <select value={selectedIcon} onChange={(e) => onIconChange(e.target.value)}
          className="ml-1 border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500">
          {ICON_NAMES.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
      )}

      {/* Delete/Remove selected */}
      {hasSelection && !locked && (
        <button
          onClick={onDeleteSelected}
          className={`ml-2 flex items-center gap-1 px-2 py-1.5 rounded-md text-xs font-medium transition-colors ${
            isNodeSelected ? "text-orange-600 hover:bg-orange-50 dark:text-orange-400 dark:hover:bg-orange-900/30" : "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30"
          }`}
        >
          {isNodeSelected ? <ArrowUturnLeftIcon className="h-4 w-4" /> : <TrashIcon className="h-4 w-4" />}
          {isNodeSelected ? "Remove" : "Delete"}
        </button>
      )}
    </div>
  );
}

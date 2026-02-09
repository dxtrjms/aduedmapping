import { useCallback } from "react";

export default function HeatmapSettings({ config, onChange, sensorType }) {
  const set = useCallback((key, value) => {
    onChange((prev) => ({ ...prev, [key]: value }));
  }, [onChange]);

  if (!sensorType) return null;

  const inputCls =
    "w-full border border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500";

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">Heatmap Settings</h3>
      <div className="space-y-2 text-xs">
        {/* Enable/disable toggle */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={config.enabled !== false}
            onChange={(e) => set("enabled", e.target.checked)}
            className="rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-gray-700 dark:text-gray-300 font-medium">Show Heatmap</span>
        </label>

        {/* Opacity */}
        <div>
          <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">
            Opacity ({Math.round((config.opacity ?? 160) / 255 * 100)}%)
          </label>
          <input
            type="range"
            min="0"
            max="255"
            step="5"
            value={config.opacity ?? 160}
            onChange={(e) => set("opacity", Number(e.target.value))}
            className="w-full h-1.5 bg-gray-200 dark:bg-gray-600 rounded-lg cursor-pointer accent-blue-600"
          />
        </div>

        {/* IDW Power */}
        <div>
          <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">
            IDW Power ({config.power ?? 2})
          </label>
          <input
            type="range"
            min="1"
            max="6"
            step="0.5"
            value={config.power ?? 2}
            onChange={(e) => set("power", Number(e.target.value))}
            className="w-full h-1.5 bg-gray-200 dark:bg-gray-600 rounded-lg cursor-pointer accent-blue-600"
          />
        </div>

        {/* Radius Multiplier */}
        <div>
          <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">
            Radius &times; {config.radiusMultiplier ?? 1}
          </label>
          <input
            type="range"
            min="0.25"
            max="3"
            step="0.25"
            value={config.radiusMultiplier ?? 1}
            onChange={(e) => set("radiusMultiplier", Number(e.target.value))}
            className="w-full h-1.5 bg-gray-200 dark:bg-gray-600 rounded-lg cursor-pointer accent-blue-600"
          />
        </div>

        {/* Min/Max overrides */}
        <div className="grid grid-cols-2 gap-1">
          <div>
            <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">Min</label>
            <input
              type="number"
              step="any"
              placeholder={String(sensorType.min)}
              value={config.minOverride ?? ""}
              onChange={(e) => set("minOverride", e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className="block font-medium text-gray-700 dark:text-gray-300 mb-1">Max</label>
            <input
              type="number"
              step="any"
              placeholder={String(sensorType.max)}
              value={config.maxOverride ?? ""}
              onChange={(e) => set("maxOverride", e.target.value)}
              className={inputCls}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

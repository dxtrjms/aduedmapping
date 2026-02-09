import { SENSOR_TYPES } from "../../utils/heatmap";

export default function SensorSelector({ selected, onChange }) {
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="sensor-select" className="text-sm font-medium text-gray-700">
        Sensor:
      </label>
      <select
        id="sensor-select"
        value={selected}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-gray-300 bg-white py-1.5 pl-3 pr-8 text-sm text-gray-900 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
      >
        <option value="">None (no heatmap)</option>
        {SENSOR_TYPES.map((s) => (
          <option key={s.key} value={s.key}>
            {s.label} ({s.unit})
          </option>
        ))}
      </select>
    </div>
  );
}

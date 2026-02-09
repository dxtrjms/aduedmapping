import { useState, useEffect } from "react";
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import { XMarkIcon, ChevronDownIcon, ChevronRightIcon } from "@heroicons/react/24/outline";

const SENSOR_FIELDS = [
  { key: "temperature_c", label: "Temperature (C)", type: "number", step: "0.1" },
  { key: "humidity_pct", label: "Humidity (%)", type: "number", step: "0.1" },
  { key: "pressure_hpa", label: "Pressure (hPa)", type: "number", step: "0.1" },
  { key: "eco2_ppm", label: "eCO2 (ppm)", type: "number", step: "1" },
  { key: "tvoc_ppb", label: "TVOC (ppb)", type: "number", step: "1" },
  { key: "pm25_ugm3", label: "PM2.5 (ug/m3)", type: "number", step: "0.1" },
  { key: "battery_pct", label: "Battery (%)", type: "number", step: "1" },
  { key: "battery_v", label: "Battery (V)", type: "number", step: "0.01" },
];

const emptyForm = { device_id: "", name: "", location: "", x: "", y: "", coverage_radius: "15", point_size: "6", canvas_id: "", is_active: true };

export default function NodeFormModal({ open, onClose, onSubmit, node, canvases = [] }) {
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const isEdit = !!node;

  // Sensor reading state
  const [showSensors, setShowSensors] = useState(false);
  const [enabledSensors, setEnabledSensors] = useState({});
  const [sensorValues, setSensorValues] = useState({});
  const [readingTs, setReadingTs] = useState("");

  useEffect(() => {
    if (node) {
      setForm({
        device_id: node.device_id || "",
        name: node.name || "",
        location: node.location || "",
        x: node.x ?? "",
        y: node.y ?? "",
        coverage_radius: node.coverage_radius ?? "15",
        point_size: node.point_size ?? "6",
        canvas_id: node.canvas_id ?? "",
        is_active: !!node.is_active,
      });
    } else {
      setForm(emptyForm);
    }
    setError("");
    setShowSensors(false);
    setEnabledSensors({});
    setSensorValues({});
    // Default timestamp to now
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    setReadingTs(now.toISOString().slice(0, 16));
  }, [node, open]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const toggleSensor = (key) => {
    setEnabledSensors((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const body = {
        ...form,
        x: form.x === "" ? null : Number(form.x),
        y: form.y === "" ? null : Number(form.y),
        coverage_radius: Number(form.coverage_radius) || 15,
        point_size: Number(form.point_size) || 6,
        canvas_id: form.canvas_id ? Number(form.canvas_id) : null,
      };

      // Build initial_reading if any sensor enabled (create only)
      if (!isEdit && showSensors) {
        const reading = {};
        let hasAny = false;
        for (const sf of SENSOR_FIELDS) {
          if (enabledSensors[sf.key] && sensorValues[sf.key] !== undefined && sensorValues[sf.key] !== "") {
            reading[sf.key] = Number(sensorValues[sf.key]);
            hasAny = true;
          }
        }
        if (hasAny) {
          reading.ts = readingTs ? new Date(readingTs).toISOString() : new Date().toISOString();
          body.initial_reading = reading;
        }
      }

      await onSubmit(body);
      onClose();
    } catch (err) {
      setError(err.message || "Failed to save");
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = "w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="bg-white rounded-lg shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <DialogTitle className="text-lg font-semibold text-gray-900">
              {isEdit ? "Edit Node" : "Add Node"}
            </DialogTitle>
            <button onClick={onClose} className="p-1 rounded hover:bg-gray-100">
              <XMarkIcon className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 text-sm rounded px-3 py-2 mb-4">{error}</div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Device ID</label>
              <input value={form.device_id} onChange={(e) => handleChange("device_id", e.target.value)}
                required disabled={isEdit} className={inputCls + (isEdit ? " bg-gray-100" : "")} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input value={form.name} onChange={(e) => handleChange("name", e.target.value)}
                required className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <input value={form.location} onChange={(e) => handleChange("location", e.target.value)}
                className={inputCls} />
            </div>

            {/* Canvas assignment */}
            {canvases.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Canvas</label>
                <select value={form.canvas_id} onChange={(e) => handleChange("canvas_id", e.target.value)}
                  className={inputCls}>
                  <option value="">None</option>
                  {canvases.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">X (meters)</label>
                <input type="number" step="any" value={form.x}
                  onChange={(e) => handleChange("x", e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Y (meters)</label>
                <input type="number" step="any" value={form.y}
                  onChange={(e) => handleChange("y", e.target.value)} className={inputCls} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Coverage Radius (m)</label>
                <input type="number" step="0.5" min="1" max="50" value={form.coverage_radius}
                  onChange={(e) => handleChange("coverage_radius", e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Point Size</label>
                <input type="number" step="1" min="2" max="30" value={form.point_size}
                  onChange={(e) => handleChange("point_size", e.target.value)} className={inputCls} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={form.is_active}
                onChange={(e) => handleChange("is_active", e.target.checked)}
                id="is_active" className="rounded border-gray-300" />
              <label htmlFor="is_active" className="text-sm text-gray-700">Active</label>
            </div>

            {/* Initial Sensor Reading (create only) */}
            {!isEdit && (
              <div className="border border-gray-200 rounded-md">
                <button type="button" onClick={() => setShowSensors(!showSensors)}
                  className="flex items-center gap-1 w-full px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                  {showSensors ? <ChevronDownIcon className="h-4 w-4" /> : <ChevronRightIcon className="h-4 w-4" />}
                  Initial Sensor Reading
                </button>
                {showSensors && (
                  <div className="px-3 pb-3 space-y-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Timestamp</label>
                      <input type="datetime-local" value={readingTs}
                        onChange={(e) => setReadingTs(e.target.value)}
                        className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    </div>
                    {SENSOR_FIELDS.map((sf) => (
                      <div key={sf.key} className="flex items-center gap-2">
                        <input type="checkbox" checked={!!enabledSensors[sf.key]}
                          onChange={() => toggleSensor(sf.key)}
                          className="rounded border-gray-300" />
                        <label className="text-xs text-gray-600 w-28">{sf.label}</label>
                        {enabledSensors[sf.key] && (
                          <input type={sf.type} step={sf.step}
                            value={sensorValues[sf.key] ?? ""}
                            onChange={(e) => setSensorValues((prev) => ({ ...prev, [sf.key]: e.target.value }))}
                            className="flex-1 border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={onClose}
                className="px-4 py-1.5 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100">
                Cancel
              </button>
              <button type="submit" disabled={submitting}
                className="px-4 py-1.5 text-sm rounded-md bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50">
                {submitting ? "Saving..." : isEdit ? "Update" : "Create"}
              </button>
            </div>
          </form>
        </DialogPanel>
      </div>
    </Dialog>
  );
}

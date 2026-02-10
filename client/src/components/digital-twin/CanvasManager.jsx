import { useState, useRef } from "react";
import { PlusIcon, PencilSquareIcon, TrashIcon, ArrowDownTrayIcon, ArrowUpTrayIcon } from "@heroicons/react/24/outline";
import CanvasFormModal from "./CanvasFormModal";

export default function CanvasManager({ canvases, activeCanvasId, onSelect, onCreate, onUpdate, onDelete, onExport, onImport }) {
  const [showForm, setShowForm] = useState(false);
  const [editCanvas, setEditCanvas] = useState(null);
  const fileInputRef = useRef(null);

  const activeCanvas = canvases.find((c) => c.id === activeCanvasId);

  const handleCreate = async (body) => {
    const canvas = await onCreate(body);
    onSelect(canvas.id);
  };

  const handleEdit = async (body) => {
    await onUpdate(editCanvas.id, body);
    setEditCanvas(null);
  };

  const handleDelete = async () => {
    if (!activeCanvas) return;
    if (!confirm(`Delete canvas "${activeCanvas.name}"? All walls and elements on it will be deleted.`)) return;
    await onDelete(activeCanvas.id);
    const remaining = canvases.filter((c) => c.id !== activeCanvas.id);
    if (remaining.length > 0) onSelect(remaining[0].id);
  };

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        <label className="text-sm font-medium text-gray-700">Canvas:</label>
        <select
          value={activeCanvasId || ""}
          onChange={(e) => onSelect(Number(e.target.value))}
          className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {canvases.map((c) => (
            <option key={c.id} value={c.id}>{c.name} ({c.width}x{c.height}m)</option>
          ))}
        </select>

        <button
          onClick={() => { setEditCanvas(null); setShowForm(true); }}
          title="New Canvas"
          className="p-1.5 rounded-md text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <PlusIcon className="h-4 w-4" />
        </button>

        {activeCanvas && (
          <>
            <button
              onClick={() => { setEditCanvas(activeCanvas); setShowForm(true); }}
              title="Edit Canvas"
              className="p-1.5 rounded-md text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <PencilSquareIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => onExport?.(activeCanvas.id)}
              title="Download Canvas"
              className="p-1.5 rounded-md text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <ArrowDownTrayIcon className="h-4 w-4" />
            </button>
            {canvases.length > 1 && (
              <button
                onClick={handleDelete}
                title="Delete Canvas"
                className="p-1.5 rounded-md text-red-600 hover:bg-red-50 transition-colors"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            )}
          </>
        )}

        <button
          onClick={() => fileInputRef.current?.click()}
          title="Upload Canvas"
          className="p-1.5 rounded-md text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <ArrowUpTrayIcon className="h-4 w-4" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => {
              try {
                const data = JSON.parse(reader.result);
                onImport?.(data);
              } catch {
                alert("Invalid JSON file");
              }
            };
            reader.readAsText(file);
            e.target.value = "";
          }}
        />
      </div>

      <CanvasFormModal
        open={showForm}
        onClose={() => { setShowForm(false); setEditCanvas(null); }}
        onSubmit={editCanvas ? handleEdit : handleCreate}
        canvas={editCanvas}
      />
    </>
  );
}

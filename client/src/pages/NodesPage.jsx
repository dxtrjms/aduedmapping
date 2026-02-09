import { useState } from "react";
import { useNodes } from "../hooks/useNodes";
import { useCanvases } from "../hooks/useCanvases";
import NodeFormModal from "../components/NodeFormModal";
import {
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  MapPinIcon,
} from "@heroicons/react/24/outline";

export default function NodesPage() {
  const { nodes, loading, error, create, update, remove } = useNodes();
  const { canvases } = useCanvases();
  const [modalOpen, setModalOpen] = useState(false);
  const [editNode, setEditNode] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const openAdd = () => { setEditNode(null); setModalOpen(true); };
  const openEdit = (node) => { setEditNode(node); setModalOpen(true); };

  const handleSubmit = async (form) => {
    if (editNode) {
      await update(editNode.id, form);
    } else {
      await create(form);
    }
  };

  const handleDelete = async (id) => {
    await remove(id);
    setDeleteConfirm(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">Nodes</h2>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 bg-blue-600 text-white rounded-md px-3 py-1.5 text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <PlusIcon className="h-4 w-4" />
          Add Node
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 text-sm rounded px-3 py-2 mb-4">{error}</div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : nodes.length === 0 ? (
        <div className="text-center py-12 text-gray-400">No nodes yet. Add one to get started.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {nodes.map((node) => (
            <div
              key={node.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 flex flex-col"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-semibold text-gray-900">{node.name}</h3>
                  <p className="text-xs text-gray-500 font-mono">{node.device_id}</p>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    node.is_active
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {node.is_active ? "Active" : "Inactive"}
                </span>
              </div>

              {node.location && (
                <div className="flex items-center gap-1 text-sm text-gray-600 mb-1">
                  <MapPinIcon className="h-3.5 w-3.5 shrink-0" />
                  {node.location}
                </div>
              )}

              {(node.x !== null || node.y !== null) && (
                <p className="text-xs text-gray-400 mb-2">
                  X: {node.x ?? "—"}, Y: {node.y ?? "—"}
                </p>
              )}

              <div className="mt-auto pt-3 flex gap-2 border-t border-gray-100">
                <button
                  onClick={() => openEdit(node)}
                  className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
                >
                  <PencilSquareIcon className="h-4 w-4" />
                  Edit
                </button>
                {deleteConfirm === node.id ? (
                  <div className="flex items-center gap-1 ml-auto">
                    <span className="text-xs text-red-600">Delete?</span>
                    <button
                      onClick={() => handleDelete(node.id)}
                      className="text-xs text-white bg-red-600 rounded px-2 py-0.5 hover:bg-red-700"
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(null)}
                      className="text-xs text-gray-600 border rounded px-2 py-0.5 hover:bg-gray-100"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeleteConfirm(node.id)}
                    className="flex items-center gap-1 text-sm text-red-600 hover:text-red-800 ml-auto"
                  >
                    <TrashIcon className="h-4 w-4" />
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <NodeFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        node={editNode}
        canvases={canvases}
      />
    </div>
  );
}

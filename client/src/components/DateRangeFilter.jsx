import { useState, useEffect } from "react";
import { useNodes } from "../hooks/useNodes";

export default function DateRangeFilter({ onFilter, loading }) {
  const { nodes, loading: nodesLoading } = useNodes();
  const [nodeId, setNodeId] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  // Auto-select first node
  useEffect(() => {
    if (!nodeId && nodes.length > 0) {
      setNodeId(String(nodes[0].id));
    }
  }, [nodes, nodeId]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!nodeId) return;
    onFilter({ node_id: nodeId, from, to });
  };

  // Auto-load on first node selection
  useEffect(() => {
    if (nodeId) {
      onFilter({ node_id: nodeId, from, to });
    }
    // Only run on initial nodeId set
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeId]);

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[160px] flex-1">
          <label className="block text-xs font-medium text-gray-600 mb-1">Node</label>
          <select
            value={nodeId}
            onChange={(e) => setNodeId(e.target.value)}
            disabled={nodesLoading}
            className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {nodesLoading && <option>Loading...</option>}
            {nodes.map((n) => (
              <option key={n.id} value={n.id}>
                {n.name} ({n.device_id})
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-[160px]">
          <label className="block text-xs font-medium text-gray-600 mb-1">From</label>
          <input
            type="datetime-local"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="min-w-[160px]">
          <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
          <input
            type="datetime-local"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !nodeId}
          className="bg-blue-600 text-white rounded-md px-4 py-1.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loading ? "Loading..." : "Load"}
        </button>
      </div>
    </form>
  );
}

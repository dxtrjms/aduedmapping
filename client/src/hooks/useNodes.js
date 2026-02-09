import { useState, useEffect, useCallback } from "react";
import { api } from "../api/client";

export function useNodes() {
  const [nodes, setNodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get("/api/nodes");
      setNodes(data.nodes);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  const create = async (body) => {
    const data = await api.post("/api/nodes", body);
    setNodes((prev) => [...prev, data.node]);
    return data.node;
  };

  const update = async (id, body) => {
    const data = await api.put(`/api/nodes/${id}`, body);
    setNodes((prev) => prev.map((n) => (n.id === id ? data.node : n)));
    return data.node;
  };

  const remove = async (id) => {
    await api.del(`/api/nodes/${id}`);
    setNodes((prev) => prev.filter((n) => n.id !== id));
  };

  return { nodes, loading, error, refetch: fetch_, create, update, remove };
}

import { useState, useEffect, useCallback } from "react";
import { api } from "../api/client";

export function useWalls(canvasId) {
  const [walls, setWalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const q = canvasId ? `?canvas_id=${canvasId}` : "";
      const data = await api.get(`/api/walls${q}`);
      setWalls(data.walls);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [canvasId]);

  useEffect(() => { fetch_(); }, [fetch_]);

  const create = async (body) => {
    const data = await api.post("/api/walls", { ...body, canvas_id: canvasId || 1 });
    setWalls((prev) => [...prev, data.wall]);
    return data.wall;
  };

  const update = async (id, body) => {
    const data = await api.put(`/api/walls/${id}`, body);
    setWalls((prev) => prev.map((w) => (w.id === id ? data.wall : w)));
    return data.wall;
  };

  const remove = async (id) => {
    await api.del(`/api/walls/${id}`);
    setWalls((prev) => prev.filter((w) => w.id !== id));
  };

  return { walls, loading, error, refetch: fetch_, create, update, remove };
}

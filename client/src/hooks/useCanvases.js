import { useState, useEffect, useCallback } from "react";
import { api } from "../api/client";

export function useCanvases() {
  const [canvases, setCanvases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch_ = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get("/api/canvases");
      setCanvases(data.canvases);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch_(); }, [fetch_]);

  const create = async (body) => {
    const data = await api.post("/api/canvases", body);
    setCanvases((prev) => [...prev, data.canvas]);
    return data.canvas;
  };

  const update = async (id, body) => {
    const data = await api.put(`/api/canvases/${id}`, body);
    setCanvases((prev) => prev.map((c) => (c.id === id ? data.canvas : c)));
    return data.canvas;
  };

  const remove = async (id) => {
    await api.del(`/api/canvases/${id}`);
    setCanvases((prev) => prev.filter((c) => c.id !== id));
  };

  return { canvases, loading, error, refetch: fetch_, create, update, remove };
}

import { useState, useEffect, useCallback } from "react";
import { api } from "../api/client";

export function useCanvasElements(canvasId) {
  const [elements, setElements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch_ = useCallback(async () => {
    if (!canvasId) { setElements([]); setLoading(false); return; }
    setLoading(true);
    try {
      const data = await api.get(`/api/canvases/${canvasId}/elements`);
      setElements(data.elements);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [canvasId]);

  useEffect(() => { fetch_(); }, [fetch_]);

  const create = async (body) => {
    const data = await api.post(`/api/canvases/${canvasId}/elements`, body);
    setElements((prev) => [...prev, data.element]);
    return data.element;
  };

  const update = async (id, body) => {
    const data = await api.put(`/api/canvas-elements/${id}`, body);
    setElements((prev) => prev.map((e) => (e.id === id ? data.element : e)));
    return data.element;
  };

  const remove = async (id) => {
    await api.del(`/api/canvas-elements/${id}`);
    setElements((prev) => prev.filter((e) => e.id !== id));
  };

  return { elements, loading, error, refetch: fetch_, create, update, remove };
}

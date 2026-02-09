import { useState, useCallback } from "react";
import { api } from "../api/client";

export function useReadings() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetch_ = useCallback(async ({ node_id, from, to }) => {
    if (!node_id) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ node_id: String(node_id) });
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      const data = await api.get(`/api/readings?${params}`);
      setRows(data.rows);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  return { rows, loading, error, fetchReadings: fetch_ };
}

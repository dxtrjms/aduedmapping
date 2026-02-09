import { useState, useEffect, useCallback } from "react";
import { api } from "../api/client";

export function useLatestReadings() {
  const [readings, setReadings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetch_ = useCallback(async () => {
    try {
      const data = await api.get("/api/readings/latest");
      setReadings(data.rows);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch_();
    const interval = setInterval(fetch_, 30000);
    return () => clearInterval(interval);
  }, [fetch_]);

  return { readings, loading, error, refetch: fetch_ };
}

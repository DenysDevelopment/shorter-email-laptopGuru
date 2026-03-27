"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface UseFetchOptions {
  refreshInterval?: number;
}

export function useFetch<T>(url: string, options?: UseFetchOptions) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) throw new Error("Fetch failed");
      const json = await res.json();
      if (!controller.signal.aborted) {
        setData(json);
        setError(null);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      if (!controller.signal.aborted) {
        setError("Ошибка загрузки");
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [url]);

  useEffect(() => {
    void fetchData();
    let interval: ReturnType<typeof setInterval> | undefined;
    if (options?.refreshInterval) {
      interval = setInterval(() => void fetchData(), options.refreshInterval);
    }
    return () => {
      abortControllerRef.current?.abort();
      if (interval) clearInterval(interval);
    };
  }, [fetchData, options?.refreshInterval]);

  return { data, loading, error, refetch: fetchData };
}

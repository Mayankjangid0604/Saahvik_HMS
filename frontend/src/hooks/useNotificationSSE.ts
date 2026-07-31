import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { TOKEN_KEY } from "@/api/client";

const BASE_URL = import.meta.env.VITE_API_URL ?? "/api";

export function useNotificationSSE() {
  const queryClient = useQueryClient();
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const token = sessionStorage.getItem(TOKEN_KEY);
    if (!token) return;

    const url = `${BASE_URL}/notifications/stream?token=${encodeURIComponent(token)}`;
    const es = new EventSource(url);
    esRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "notification") {
          queryClient.invalidateQueries({ queryKey: ["notifications"] });
        }
      } catch {}
    };

    es.onerror = () => {
      // EventSource auto-reconnects; no action needed
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [queryClient]);
}

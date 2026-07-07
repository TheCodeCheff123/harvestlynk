"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { getStoredAccessToken, notificationsApi, type NotificationItem } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export function useNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchAll = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [notifs, { count }] = await Promise.all([
        notificationsApi.getAll(),
        notificationsApi.getUnreadCount(),
      ]);
      setNotifications(notifs);
      setUnreadCount(count);
    } catch {
      // silently fail — stale state is acceptable
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    queueMicrotask(() => { void fetchAll(); });

    // Re-fetch when window gains focus so the topbar badge stays in sync
    // after the user marks all as read on the notifications page
    function onFocus() { void fetchAll(); }
    // Re-fetch immediately when any instance marks all as read
    function onReadAll() { void fetchAll(); }
    window.addEventListener("focus", onFocus);
    window.addEventListener("hl:notifications:read-all", onReadAll);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("hl:notifications:read-all", onReadAll);
    };
  }, [fetchAll]);

  // WebSocket connection for real-time notification push
  useEffect(() => {
    if (!user || typeof window === "undefined") return;

    const base = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:4000";
    const wsUrl = base.replace(/^https/, "wss").replace(/^http/, "ws") + "/ws";

    function connect() {
      const token = getStoredAccessToken();
      if (!token) return;

      const ws = new WebSocket(`${wsUrl}?token=${encodeURIComponent(token)}`);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data as string) as { type: string; notification?: NotificationItem };
          if (msg.type === "notification" && msg.notification) {
            setNotifications((prev) => [msg.notification!, ...prev]);
            setUnreadCount((c) => c + 1);
          }
        } catch {
          // ignore malformed messages
        }
      };

      ws.onclose = () => {
        // Reconnect after 4s unless component is unmounted
        reconnectRef.current = setTimeout(connect, 4000);
      };

      ws.onerror = () => {
        ws.close();
      };
    }

    connect();

    return () => {
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      wsRef.current?.close();
    };
  }, [user]);

  const markRead = useCallback(async (id: string) => {
    try {
      await notificationsApi.markRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.notification_id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      // silently fail
    }
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await notificationsApi.markAllRead();
      // Optimistic update in this instance
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
      // Broadcast to all other hook instances (e.g. Topbar) so they refetch immediately
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("hl:notifications:read-all"));
      }
    } catch {
      // silently fail
    }
  }, []);

  return { notifications, unreadCount, loading, markRead, markAllRead, refetch: fetchAll };
}

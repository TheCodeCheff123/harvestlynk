"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { chatApi, getStoredAccessToken, type ChatMessage, type Conversation } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export function useChat(conversationId: string | null) {
  const { user } = useAuth();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchConversation = useCallback(async () => {
    if (!conversationId) return;
    setLoading(true);
    setError(null);
    try {
      const { conversation: conv, messages: msgs } = await chatApi.getConversation(conversationId);
      setConversation(conv);
      setMessages(msgs);
      // Mark all as read
      chatApi.markRead(conversationId).catch(() => {});
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load conversation");
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  useEffect(() => {
    if (conversationId) void fetchConversation();
  }, [fetchConversation, conversationId]);

  // WebSocket for real-time messages — reuse the same WS pattern as useNotifications
  useEffect(() => {
    if (!user || !conversationId || typeof window === "undefined") return;

    const base = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:4000";
    const wsUrl = base.replace(/^https/, "wss").replace(/^http/, "ws") + "/ws";

    function connect() {
      const token = getStoredAccessToken();
      if (!token) return;

      const ws = new WebSocket(`${wsUrl}?token=${encodeURIComponent(token)}`);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data as string) as {
            type: string;
            conversation_id?: string;
            message?: ChatMessage;
          };
          if (
            msg.type === "chat_message" &&
            msg.conversation_id === conversationId &&
            msg.message
          ) {
            setMessages((prev) => [...prev, msg.message!]);
            // Mark the incoming message as read since user is viewing this conversation
            chatApi.markRead(conversationId).catch(() => {});
          }
        } catch {
          // ignore malformed messages
        }
      };

      ws.onclose = () => {
        reconnectRef.current = setTimeout(connect, 4000);
      };
      ws.onerror = () => { ws.close(); };
    }

    connect();

    return () => {
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      wsRef.current?.close();
    };
  }, [user, conversationId]);

  const sendMessage = useCallback(async (data: Parameters<typeof chatApi.sendMessage>[1]) => {
    if (!conversationId) return;
    setSending(true);
    setError(null);
    // Optimistic: add a placeholder immediately
    const optimisticId = `optimistic_${Date.now()}`;
    const optimistic: ChatMessage = {
      message_id: optimisticId,
      conversation_id: conversationId,
      sender_id: user?.id ?? "",
      content: data.content,
      type: data.type ?? "text",
      offer_price_kobo: data.offer_price_kobo ?? null,
      offer_quantity: data.offer_quantity ?? null,
      offer_unit: data.offer_unit ?? null,
      offer_expires_at: data.offer_expires_hours
        ? new Date(Date.now() + data.offer_expires_hours * 3600_000).toISOString()
        : null,
      is_read: false,
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 3 * 24 * 3600_000).toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    try {
      const saved = await chatApi.sendMessage(conversationId, data);
      // Replace optimistic with real
      setMessages((prev) => prev.map((m) => m.message_id === optimisticId ? saved : m));
    } catch (e) {
      // Revert optimistic on error
      setMessages((prev) => prev.filter((m) => m.message_id !== optimisticId));
      setError(e instanceof Error ? e.message : "Failed to send message");
    } finally {
      setSending(false);
    }
  }, [conversationId, user?.id]);

  const markRead = useCallback(() => {
    if (!conversationId) return;
    chatApi.markRead(conversationId).catch(() => {});
    setMessages((prev) => prev.map((m) => ({ ...m, is_read: true })));
  }, [conversationId]);

  return { conversation, messages, loading, sending, error, sendMessage, markRead, refetch: fetchConversation };
}

/** Hook for the conversations list + total unread count (used by sidebars). */
export function useChatUnread() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const convs = await chatApi.getConversations();
      setUnreadCount(convs.reduce((s, c) => s + c.unread_count, 0));
    } catch {
      // silently fail
    }
  }, [user]);

  useEffect(() => {
    void refresh();
    function onFocus() { void refresh(); }
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);

  // Listen for incoming chat_message events to bump the count
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
          const msg = JSON.parse(event.data as string) as { type: string };
          if (msg.type === "chat_message") setUnreadCount((c) => c + 1);
        } catch { /* ignore */ }
      };
      ws.onclose = () => { reconnectRef.current = setTimeout(connect, 4000); };
      ws.onerror = () => { ws.close(); };
    }
    connect();
    return () => {
      if (reconnectRef.current) clearTimeout(reconnectRef.current);
      wsRef.current?.close();
    };
  }, [user]);

  return { unreadCount, refresh };
}

"use client";
import { useState, useEffect } from "react";
import { z } from "zod";
import { toast } from "sonner";
import {
  answerSchema,
  streamEventSchema,
  type AgentAnswer,
} from "@/lib/ai/contracts";
import type { Language } from "@/lib/i18n";
const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().max(12000),
  timestamp: z.string().optional(),
  answer: answerSchema.optional(),
  engine: z.string().optional(),
});
const conversationSchema = z.object({
  id: z.uuid(),
  title: z.string().max(120),
  messages: z.array(messageSchema).max(48),
});
export type ChatMessage = z.infer<typeof messageSchema>;
export type Conversation = z.infer<typeof conversationSchema>;
const activityLabels: Record<string, string> = {
  search_trades: "Searching stored trades",
  get_trade_details: "Retrieving source record",
  get_market_overview: "Calculating market overview",
  get_top_commodities: "Ranking commodities",
  compare_trading_periods: "Comparing periods",
  get_transaction_trends: "Calculating trading trends",
  explain_exchange_term: "Checking approved sources",
};
export function useAgentChat(language: Language) {
  const [conversations, setConversations] = useState<Conversation[]>([]),
    [active, setActive] = useState(""),
    [messages, setMessages] = useState<ChatMessage[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [activity, setActivity] = useState(""),
    [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      const raw = JSON.parse(
        localStorage.getItem("uzex-chats-v2") ??
          localStorage.getItem("uzex-chats-v1") ??
          "[]",
      );
      const parsed = z.array(conversationSchema).max(30).safeParse(raw);
      if (parsed.success) setConversations(parsed.data.slice(0, 10));
    } catch {}
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready)
      try {
        localStorage.setItem(
          "uzex-chats-v2",
          JSON.stringify(conversations.slice(0, 10)),
        );
      } catch {
        toast.error("Conversation could not be saved locally");
      }
  }, [conversations, ready]);
  function save(id: string, list: ChatMessage[]) {
    setConversations((prev) =>
      [
        {
          id,
          title:
            list.find((m) => m.role === "user")?.content.slice(0, 60) ??
            "Conversation",
          messages: list
            .slice(-16)
            .map((m, i, a) =>
              i < a.length - 4 ? { ...m, answer: undefined } : m,
            ),
        },
        ...prev.filter((c) => c.id !== id),
      ].slice(0, 10),
    );
  }
  function newChat() {
    setActive("");
    setMessages([]);
    setError("");
  }
  async function clearConversation(all = false) {
    try {
      const response = await fetch(
        "/api/chat" +
          (!all && active ? "?id=" + encodeURIComponent(active) : ""),
        { method: "DELETE" },
      );
      if (!response.ok) throw new Error();
      setConversations((prev) =>
        all ? [] : prev.filter((c) => c.id !== active),
      );
      newChat();
      toast.success(all ? "History cleared" : "Conversation cleared");
    } catch {
      toast.error("Could not clear the conversation. Try again.");
    }
  }
  function select(chat: Conversation) {
    setActive(chat.id);
    setMessages(chat.messages);
    setError("");
  }
  async function send(
    text: string,
    mode: "new" | "retry" | "regenerate" = "new",
  ) {
    if (!text.trim() || busy) return;
    const id = active || crypto.randomUUID();
    setActive(id);
    let next =
      mode === "new"
        ? [
            ...messages,
            {
              role: "user" as const,
              content: text.trim(),
              timestamp: new Date().toISOString(),
            },
          ]
        : mode === "regenerate"
          ? messages.slice(0, -1)
          : messages;
    next = next.slice(-23);
    setMessages(next);
    setBusy(true);
    setError("");
    setActivity("Planning analysis");
    let result: AgentAnswer | undefined;
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/x-ndjson",
        },
        body: JSON.stringify({
          conversationId: id,
          stateToken: [...messages].reverse().find((m) => m.answer?.stateToken)
            ?.answer?.stateToken,
          message: text.trim(),
          language,
          regenerate: mode === "regenerate",
          messages: next.slice(-9).map(({ role, content }) => ({
            role,
            content: content.slice(0, 1000),
          })),
        }),
        signal: AbortSignal.timeout(55000),
      });
      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error ?? "Request failed");
      }
      const reader = response.body?.getReader();
      if (!reader) throw new Error("Response unavailable");
      const decoder = new TextDecoder();
      let buffer = "";
      try {
        for (;;) {
          const { value, done } = await reader.read();
          buffer += decoder.decode(value, { stream: !done });
          let index: number;
          while ((index = buffer.indexOf("\n")) >= 0) {
            const line = buffer.slice(0, index);
            buffer = buffer.slice(index + 1);
            if (!line) continue;
            const event = streamEventSchema.parse(JSON.parse(line));
            if (event.type === "error") throw new Error(event.error);
            if (event.type === "activity")
              setActivity(
                event.tool
                  ? (activityLabels[event.tool] ?? "Checking source data")
                  : "Planning analysis",
              );
            if (event.type === "answer") result = event.answer;
          }
          if (done) break;
        }
      } finally {
        reader.releaseLock();
      }
      if (!result) throw new Error("Analysis ended without a verified answer");
      const list = [
        ...next,
        {
          role: "assistant" as const,
          content: result.text,
          timestamp: result.timestamp,
          engine: result.engine,
          answer: result,
        },
      ];
      setMessages(list);
      save(id, list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
      save(id, next);
    } finally {
      setBusy(false);
      setActivity("");
    }
  }
  const regenerate = () => {
    const question = [...messages]
      .reverse()
      .find((m) => m.role === "user")?.content;
    if (question) void send(question, "regenerate");
  };
  return {
    conversations,
    active,
    messages,
    busy,
    error,
    activity,
    newChat,
    select,
    send,
    regenerate,
    clearConversation,
  };
}

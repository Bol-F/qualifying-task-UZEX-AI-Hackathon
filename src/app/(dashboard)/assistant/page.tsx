"use client";
import { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  Plus,
  ArrowUp,
  ArrowUpRight,
  MessageSquare,
  Trash2,
  Database,
  LoaderCircle,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button } from "@/components/ui/button";
import { copy, type Language } from "@/lib/i18n";
import { useAgentChat } from "@/hooks/use-agent-chat";
import { useResource } from "@/hooks/use-resource";
import { EvidenceResponse } from "@/components/assistant/evidence-response";
export default function Assistant() {
  const [language, setLanguage] = useState<Language>("uz"),
    [input, setInput] = useState("");
  const {
    conversations,
    active,
    messages,
    busy,
    error,
    activity,
    newChat: startNew,
    select,
    send: sendAgent,
    regenerate,
    clearConversation,
  } = useAgentChat(language);
  const readiness = useResource<{ aiConfigured: boolean; aiMode?: string }>(
    "/api/health",
  );
  const bottom = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const question = new URLSearchParams(window.location.search).get(
      "question",
    );
    if (question) setInput(question);
  }, []);
  const c = copy[language];
  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, busy]);
  function newChat() {
    startNew();
    setInput("");
  }
  function send(text: string, retry = false) {
    setInput("");
    return sendAgent(text, retry ? "retry" : "new");
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>
            AI Assistant
            <span className="ai-chip heading-chip">INSIGHT ENGINE</span>
          </h1>
          <p>Your market questions. Answers backed by evidence.</p>
        </div>
        <div
          className="language-switch"
          role="group"
          aria-label="Assistant language"
        >
          <button
            className={language === "uz" ? "selected" : ""}
            onClick={() => setLanguage("uz")}
          >
            O‘zbekcha
          </button>
          <button
            className={language === "ru" ? "selected" : ""}
            onClick={() => setLanguage("ru")}
          >
            Русский
          </button>
        </div>
      </div>
      <div className="assistant-layout">
        <aside className="chat-history">
          <Button
            variant="outline"
            className="w-full"
            disabled={busy}
            onClick={newChat}
          >
            <Plus />
            New conversation
          </Button>
          <div className="nav-caption">RECENT CONVERSATIONS</div>
          <div className="history-items">
            {conversations.length === 0 ? (
              <p className="history-empty">
                Your conversations will appear here.
              </p>
            ) : (
              conversations.map((chat) => (
                <button
                  disabled={busy}
                  key={chat.id}
                  className={active === chat.id ? "selected" : ""}
                  onClick={() => {
                    select(chat);
                  }}
                >
                  <MessageSquare size={15} />
                  <span>{chat.title}</span>
                </button>
              ))
            )}
          </div>
          <div className="history-footer">
            <ShieldCheck size={16} />
            <p>History is saved in this browser only.</p>
            <button
              aria-label="Clear chat history"
              disabled={busy}
              onClick={() => {
                void clearConversation(true);
              }}
            >
              <Trash2 size={14} />
            </button>
          </div>
        </aside>
        <section className="chat-main" lang={language}>
          <div className="chat-top">
            <button
              className="icon-button"
              aria-label="Clear conversation"
              disabled={busy || !active}
              onClick={() => clearConversation()}
            >
              <Trash2 size={14} />
            </button>
            <span>
              <span className="status-dot" />
              UZEX Insight
            </span>
            <small>
              <Database size={12} />7 read-only tools · Evidence mode
            </small>
          </div>
          {readiness.data && !readiness.data.aiConfigured && (
            <div className="assistant-readiness" role="status">
              {readiness.data.aiMode === "local"
                ? "Local tool mode is active. Gemini interpretation is not active."
                : "Gemini is not configured. Local data tools are available; model-generated interpretation is unavailable."}
            </div>
          )}
          <div className="conversation" aria-live="polite">
            {messages.length === 0 ? (
              <div className="chat-welcome">
                <div className="assistant-symbol">
                  <Sparkles size={32} />
                </div>
                <span className="welcome-caption">
                  YOUR MARKET INTELLIGENCE PARTNER
                </span>
                <h2>{c.hello}</h2>
                <p>{c.sub}</p>
                <div className="suggestions">
                  {c.questions.map((q, i) => (
                    <button key={q} onClick={() => send(q)}>
                      <span className="suggestion-category">
                        {
                          [
                            "MARKET ACTIVITY",
                            "COMMODITY SEARCH",
                            "DAILY SUMMARY",
                            "DATE COMPARISON",
                          ][i]
                        }
                      </span>
                      <span>{q}</span>
                      <ArrowUpRight size={16} />
                    </button>
                  ))}
                </div>
                <div className="grounding-note">
                  <ShieldCheck size={14} />
                  Database grounded · Uzbek & Russian · No arbitrary SQL
                </div>
              </div>
            ) : (
              messages.map((m, i) => (
                <div
                  key={i}
                  className={`message ${m.role}`}
                  lang={m.answer?.language}
                >
                  <div className="message-avatar">
                    {m.role === "assistant" ? <Sparkles size={16} /> : "UZ"}
                  </div>
                  <div className="message-body">
                    <div className="message-label">
                      {m.role === "assistant" ? "UZEX Insight" : "You"}
                      <small>{m.engine}</small>
                    </div>
                    <div className="markdown">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        disallowedElements={["img"]}
                        components={{
                          a: ({ children, ...props }) => (
                            <a
                              {...props}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {children}
                            </a>
                          ),
                        }}
                      >
                        {m.content}
                      </ReactMarkdown>
                    </div>
                    {m.timestamp && (
                      <time className="message-time" dateTime={m.timestamp}>
                        {new Date(m.timestamp).toLocaleTimeString(
                          language === "ru" ? "ru-RU" : "uz-UZ",
                          {
                            timeZone: "Asia/Tashkent",
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        )}{" "}
                        UZT
                      </time>
                    )}
                    {m.answer && <EvidenceResponse answer={m.answer} />}
                    {m.role === "assistant" && i === messages.length - 1 && (
                      <div className="answer-actions">
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={busy}
                          onClick={regenerate}
                        >
                          <RotateCcw />
                          Regenerate answer
                        </Button>
                        {m.answer?.followUps.map((q) => (
                          <button
                            key={q}
                            disabled={busy}
                            onClick={() => send(q)}
                          >
                            {q}
                            <ArrowUpRight size={12} />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            {busy && (
              <div className="message assistant">
                <div className="message-avatar">
                  <Sparkles size={16} />
                </div>
                <div className="thinking">
                  <LoaderCircle size={16} className="spin" />
                  {activity || "Checking source records…"}
                </div>
              </div>
            )}
            {error && (
              <div className="chat-error" role="alert">
                <span>{error}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => send(messages.at(-1)?.content ?? "", true)}
                >
                  <RotateCcw />
                  Retry
                </Button>
                <Button variant="ghost" size="sm" onClick={newChat}>
                  New conversation
                </Button>
              </div>
            )}
            <div ref={bottom} />
          </div>
          <div className="composer-wrap">
            <form
              className="composer"
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
            >
              <textarea
                aria-label="Message to assistant"
                placeholder={c.placeholder}
                value={input}
                maxLength={6000}
                disabled={busy}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send(input);
                  }
                }}
                rows={2}
              />
              <div className="composer-bottom">
                <span>
                  <Sparkles size={12} />
                  Ask in your language
                </span>
                <Button
                  type="submit"
                  size="icon"
                  aria-label="Send message"
                  disabled={!input.trim() || busy}
                >
                  <ArrowUp />
                </Button>
              </div>
            </form>
            <p>
              Answers reflect the available dataset. Synthetic records are
              always labeled. Verify source records before acting.
            </p>
          </div>
        </section>
      </div>
    </>
  );
}

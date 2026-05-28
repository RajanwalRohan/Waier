"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ConversationSummary {
  id: string;
  title: string | null;
  updatedAt: string;
  _count?: { messages: number };
}

const SUGGESTED_PROMPTS = [
  "How can I improve my sleep?",
  "Suggest a workout for today",
  "Am I on track with my goals?",
  "What should I eat post-workout?",
];

export default function CoachPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loadingConv, setLoadingConv] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  const loadConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/conversations?limit=50", {
        headers: { "X-Requested-With": "XMLHttpRequest" },
      });
      if (!res.ok) return;
      const json = await res.json();
      setConversations(json.conversations ?? []);
    } catch {
      /* ignore — network hiccup, user can retry by toggling sidebar */
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  function toggleListening() {
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = true;
    recognition.continuous = true;
    recognitionRef.current = recognition;

    let finalTranscript = input;

    recognition.onresult = (e: SpeechRecognitionEvent) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const transcript = e.results[i][0].transcript;
        if (e.results[i].isFinal) {
          finalTranscript += (finalTranscript ? " " : "") + transcript;
        } else {
          interim += transcript;
        }
      }
      setInput(finalTranscript + (interim ? (finalTranscript ? " " : "") + interim : ""));
    };

    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);

    recognition.start();
    setListening(true);
  }

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function ensureConversation(): Promise<string | null> {
    if (activeId) return activeId;
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        body: JSON.stringify({}),
      });
      if (!res.ok) return null;
      const json = await res.json();
      const id = json.conversation?.id as string | undefined;
      if (!id) return null;
      setActiveId(id);
      setConversations((prev) => [
        {
          id,
          title: json.conversation.title ?? "New conversation",
          updatedAt: json.conversation.updatedAt ?? new Date().toISOString(),
          _count: { messages: 0 },
        },
        ...prev,
      ]);
      return id;
    } catch {
      return null;
    }
  }

  async function startNewChat() {
    setActiveId(null);
    setMessages([]);
    setInput("");
    setSidebarOpen(false);
  }

  async function openConversation(id: string) {
    if (id === activeId) {
      setSidebarOpen(false);
      return;
    }
    setLoadingConv(true);
    setSidebarOpen(false);
    try {
      const res = await fetch(`/api/conversations/${id}`, {
        headers: { "X-Requested-With": "XMLHttpRequest" },
      });
      if (!res.ok) return;
      const json = await res.json();
      const msgs = (json.conversation?.messages ?? []) as Array<{ role: string; content: string }>;
      setActiveId(id);
      setMessages(
        msgs
          .filter((m) => m.role === "user" || m.role === "assistant")
          .map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
      );
    } finally {
      setLoadingConv(false);
    }
  }

  async function deleteConversation(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    const prev = conversations;
    setConversations((cs) => cs.filter((c) => c.id !== id));
    if (id === activeId) {
      setActiveId(null);
      setMessages([]);
    }
    try {
      const res = await fetch(`/api/conversations/${id}`, {
        method: "DELETE",
        headers: { "X-Requested-With": "XMLHttpRequest" },
      });
      if (!res.ok) throw new Error("delete failed");
    } catch {
      setConversations(prev);
    }
  }

  async function sendMessage(text?: string) {
    const msg = text ?? input;
    if (!msg.trim() || loading) return;

    const userMsg: Message = { role: "user", content: msg.trim() };
    const priorMessages = messages;
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    const conversationId = await ensureConversation();

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        body: JSON.stringify({
          message: userMsg.content,
          history: priorMessages.slice(-20),
          ...(conversationId ? { conversationId } : {}),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to get response");
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder();
      let assistantContent = "";

      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (line.startsWith("0:")) {
            try {
              const text = JSON.parse(line.slice(2));
              assistantContent += text;
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  role: "assistant",
                  content: assistantContent,
                };
                return updated;
              });
            } catch {
              // Skip non-text chunks
            }
          }
        }
      }

      // Refresh the sidebar so titles/ordering reflect this exchange.
      loadConversations();
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I couldn't process that. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-black/5 dark:border-white/[0.06] bg-white/60 dark:bg-white/[0.04] backdrop-blur-xl px-5 py-4">
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open conversations"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/70 dark:bg-white/[0.08] border border-black/5 dark:border-white/[0.10] text-slate-600 dark:text-slate-300 shadow-glass-sm dark:shadow-glass-dark-sm transition-all active:scale-95"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <div className="min-w-0">
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">Wynn</h1>
          <p className="truncate text-xs text-slate-400">Your personal health & fitness coach — powered by Waer</p>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-5 py-6">
        {loadingConv ? (
          <div className="flex h-full items-center justify-center">
            <span className="flex gap-1">
              <span className="h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-600 animate-bounce [animation-delay:-0.3s]" />
              <span className="h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-600 animate-bounce [animation-delay:-0.15s]" />
              <span className="h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-600 animate-bounce" />
            </span>
          </div>
        ) : (
          <>
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-50 dark:bg-accent-900/30">
                  <svg className="h-8 w-8 text-accent-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" />
                  </svg>
                </div>
                <p className="mt-4 text-sm font-medium text-slate-700 dark:text-slate-300">Hey, I&apos;m Wynn</p>
                <p className="mt-1 text-xs text-slate-400">Ask me about health, fitness, or nutrition</p>
                <div className="mt-8 grid grid-cols-1 gap-2 w-full max-w-sm">
                  {SUGGESTED_PROMPTS.map((prompt) => (
                    <button
                      key={prompt}
                      onClick={() => sendMessage(prompt)}
                      className="card px-4 py-3 text-left text-sm text-slate-600 dark:text-slate-300 transition-all hover:shadow-glass-lg active:scale-[0.99]"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-4">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                      msg.role === "user"
                        ? "bg-accent-500 text-white shadow-lg shadow-accent-500/20"
                        : "bg-white/70 dark:bg-white/[0.06] backdrop-blur-sm border border-black/5 dark:border-white/[0.08] text-slate-700 dark:text-slate-300 shadow-glass-sm dark:shadow-glass-dark-sm"
                    }`}
                  >
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  </div>
                </div>
              ))}
              {loading && messages[messages.length - 1]?.role !== "assistant" && (
                <div className="flex justify-start">
                  <div className="rounded-2xl bg-white/70 dark:bg-white/[0.06] backdrop-blur-sm border border-black/5 dark:border-white/[0.08] px-4 py-3 shadow-glass-sm dark:shadow-glass-dark-sm">
                    <span className="flex gap-1">
                      <span className="h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-600 animate-bounce [animation-delay:-0.3s]" />
                      <span className="h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-600 animate-bounce [animation-delay:-0.15s]" />
                      <span className="h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-600 animate-bounce" />
                    </span>
                  </div>
                </div>
              )}
            </div>
            <div ref={scrollRef} />
          </>
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-black/5 dark:border-white/[0.06] bg-white/60 dark:bg-white/[0.04] backdrop-blur-xl px-5 py-3 pb-20">
        <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="flex items-center gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Wynn..."
            maxLength={4000}
            className="flex-1 rounded-2xl bg-white/70 dark:bg-white/[0.08] border border-black/5 dark:border-white/[0.10] px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-accent-400/20 transition-all"
            disabled={loading}
          />
          <button
            type="button"
            onClick={toggleListening}
            disabled={loading}
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all active:scale-95 ${
              listening
                ? "bg-red-500 text-white shadow-lg shadow-red-500/25 animate-pulse"
                : "bg-white/70 dark:bg-white/[0.08] border border-black/5 dark:border-white/[0.10] text-slate-500 dark:text-slate-400"
            } disabled:opacity-40`}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="1" width="6" height="12" rx="3" />
              <path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" />
            </svg>
          </button>
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-500 text-white shadow-lg shadow-accent-500/25 transition-all hover:bg-accent-600 disabled:opacity-40 disabled:shadow-none active:scale-95"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </button>
        </form>
      </div>

      {/* Sidebar drawer + backdrop */}
      <ConversationSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        conversations={conversations}
        activeId={activeId}
        onNewChat={startNewChat}
        onOpen={openConversation}
        onDelete={deleteConversation}
      />
    </div>
  );
}

function ConversationSidebar({
  open,
  onClose,
  conversations,
  activeId,
  onNewChat,
  onOpen,
  onDelete,
}: {
  open: boolean;
  onClose: () => void;
  conversations: ConversationSummary[];
  activeId: string | null;
  onNewChat: () => void;
  onOpen: (id: string) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
}) {
  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity duration-200 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      {/* Drawer */}
      <aside
        className={`fixed left-0 top-0 bottom-0 z-50 flex w-[84%] max-w-sm flex-col border-r border-black/5 dark:border-white/[0.08] bg-white/85 dark:bg-[#0b0b0f]/90 backdrop-blur-xl shadow-2xl transition-transform duration-300 ease-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-black/5 dark:border-white/[0.06] px-4 py-4">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Your chats</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close conversations"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 transition-all active:scale-95"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-3 pt-3">
          <button
            type="button"
            onClick={onNewChat}
            className="flex w-full items-center gap-2 rounded-xl bg-accent-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-accent-500/25 transition-all hover:bg-accent-600 active:scale-[0.98]"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            New chat
          </button>
        </div>

        <div className="mt-3 flex-1 overflow-y-auto px-2 pb-4">
          {conversations.length === 0 ? (
            <p className="px-3 py-8 text-center text-xs text-slate-400">
              No chats yet — start one above.
            </p>
          ) : (
            <ul className="space-y-1">
              {conversations.map((c) => {
                const isActive = c.id === activeId;
                const title = c.title && c.title.trim() ? c.title : "New conversation";
                return (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => onOpen(c.id)}
                      className={`group flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left transition-all ${
                        isActive
                          ? "bg-accent-500/10 dark:bg-accent-500/15 border border-accent-500/30"
                          : "hover:bg-black/[0.03] dark:hover:bg-white/[0.04] border border-transparent"
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className={`truncate text-sm ${isActive ? "font-semibold text-slate-900 dark:text-white" : "text-slate-700 dark:text-slate-300"}`}>
                          {title}
                        </p>
                        <p className="truncate text-[11px] text-slate-400">
                          {formatRelative(c.updatedAt)}
                        </p>
                      </div>
                      <span
                        role="button"
                        aria-label="Delete conversation"
                        onClick={(e) => onDelete(c.id, e)}
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 opacity-0 transition-all hover:text-rose-500 group-hover:opacity-100 active:scale-90"
                      >
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                        </svg>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>
    </>
  );
}

function formatRelative(iso: string): string {
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

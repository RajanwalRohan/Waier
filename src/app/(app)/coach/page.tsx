"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
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
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(text?: string) {
    const msg = text ?? input;
    if (!msg.trim() || loading) return;

    const userMsg: Message = { role: "user", content: msg.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
        body: JSON.stringify({
          message: userMsg.content,
          history: messages.slice(-20),
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to get response");
      }

      // Handle streaming response
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder();
      let assistantContent = "";

      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        // Parse SSE data lines from the Vercel AI SDK stream
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
    } catch (err) {
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
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white px-4 py-3">
        <h1 className="text-lg font-bold text-gray-900">AI Coach</h1>
        <p className="text-xs text-gray-500">Your personal health & fitness assistant</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12">
            <p className="mb-6 text-center text-sm text-gray-500">
              Ask me anything about your health, fitness, or nutrition.
            </p>
            <div className="grid grid-cols-1 gap-2 w-full max-w-sm">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => sendMessage(prompt)}
                  className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                  msg.role === "user"
                    ? "bg-brand-600 text-white"
                    : "bg-white text-gray-800 shadow-sm border border-gray-100"
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}
          {loading && messages[messages.length - 1]?.role !== "assistant" && (
            <div className="flex justify-start">
              <div className="rounded-2xl bg-white px-4 py-2.5 text-sm text-gray-400 shadow-sm border border-gray-100">
                Thinking...
              </div>
            </div>
          )}
        </div>
        <div ref={scrollRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 bg-white px-4 py-3 pb-24">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask your coach..."
            maxLength={4000}
            className="input-field flex-1"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="btn-primary"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}

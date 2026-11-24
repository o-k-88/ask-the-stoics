"use client";

import { useEffect, useRef, useState } from "react";
import { MAX_HISTORY_MESSAGES, MAX_QUESTION_LENGTH, type ChatMessage } from "../config";
import { defaultPhilosopher, philosophers } from "../philosophers";

type Conversations = Record<string, ChatMessage[]>;

const accentClasses: Record<
  string,
  { ring: string; selected: string; unselected: string; quote: string; button: string }
> = {
  amber: {
    ring: "focus:border-amber-600 focus:ring-amber-600/30",
    selected: "border-amber-700 bg-amber-700 text-white",
    unselected:
      "border-zinc-300 bg-white text-zinc-700 hover:border-amber-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300",
    quote: "border-amber-700",
    button: "bg-amber-700 hover:bg-amber-800",
  },
  emerald: {
    ring: "focus:border-emerald-600 focus:ring-emerald-600/30",
    selected: "border-emerald-700 bg-emerald-700 text-white",
    unselected:
      "border-zinc-300 bg-white text-zinc-700 hover:border-emerald-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300",
    quote: "border-emerald-700",
    button: "bg-emerald-700 hover:bg-emerald-800",
  },
  sky: {
    ring: "focus:border-sky-600 focus:ring-sky-600/30",
    selected: "border-sky-700 bg-sky-700 text-white",
    unselected:
      "border-zinc-300 bg-white text-zinc-700 hover:border-sky-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300",
    quote: "border-sky-700",
    button: "bg-sky-700 hover:bg-sky-800",
  },
};

export default function AskForm() {
  const [philosopherId, setPhilosopherId] = useState(defaultPhilosopher.id);
  const [conversations, setConversations] = useState<Conversations>({});
  const [question, setQuestion] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const philosopher = philosophers.find((p) => p.id === philosopherId) ?? defaultPhilosopher;
  const accent = accentClasses[philosopher.accent];
  const messages = conversations[philosopherId] ?? [];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [conversations, philosopherId]);

  function updateConversation(id: string, update: (msgs: ChatMessage[]) => ChatMessage[]) {
    setConversations((prev) => ({ ...prev, [id]: update(prev[id] ?? []) }));
  }

  async function ask() {
    const text = question.trim();
    if (!text || pending) return;

    const id = philosopherId;
    const history: ChatMessage[] = [...messages, { role: "user", text }];

    setPending(true);
    setError("");
    setQuestion("");
    // Show the question plus an empty answer that fills in as it streams.
    updateConversation(id, () => [...history, { role: "model", text: "" }]);

    const appendToAnswer = (chunk: string) =>
      updateConversation(id, (msgs) => {
        const last = msgs.at(-1);
        if (!last || last.role !== "model") return msgs;
        return [...msgs.slice(0, -1), { ...last, text: last.text + chunk }];
      });

    const failed = (message: string) => {
      // Remove the unanswered question and put it back in the box so it can be retried.
      updateConversation(id, (msgs) => msgs.slice(0, history.length - 1));
      setQuestion(text);
      setError(message);
    };

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          philosopherId: id,
          messages: history.slice(-MAX_HISTORY_MESSAGES),
        }),
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => null);
        failed(data?.error ?? "Something went wrong. Try again.");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let received = false;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        if (chunk) {
          received = true;
          appendToAnswer(chunk);
        }
      }
      if (!received) appendToAnswer("The oracle is silent.");
    } catch {
      failed("Could not reach the server. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  function startOver() {
    updateConversation(philosopherId, () => []);
    setError("");
  }

  return (
    <div className="w-full max-w-xl">
      <div className="mb-4 flex flex-wrap items-center gap-2" role="group" aria-label="Choose a philosopher">
        {philosophers.map((p) => {
          const isSelected = p.id === philosopherId;
          const classes = accentClasses[p.accent];
          return (
            <button
              key={p.id}
              type="button"
              aria-pressed={isSelected}
              disabled={pending}
              onClick={() => {
                setPhilosopherId(p.id);
                setError("");
              }}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
                isSelected ? classes.selected : classes.unselected
              }`}
            >
              {p.name}
            </button>
          );
        })}
        {messages.length > 0 && (
          <button
            type="button"
            onClick={startOver}
            disabled={pending}
            className="ml-auto text-sm text-zinc-500 underline-offset-4 hover:underline disabled:opacity-60 dark:text-zinc-400"
          >
            New conversation
          </button>
        )}
      </div>

      {messages.length > 0 && (
        <div className="mb-6 flex flex-col gap-4" aria-live="polite">
          {messages.map((m, i) =>
            m.role === "user" ? (
              <p
                key={i}
                className="self-end max-w-[85%] whitespace-pre-wrap rounded-xl bg-zinc-200 px-4 py-2.5 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
              >
                {m.text}
              </p>
            ) : (
              <blockquote
                key={i}
                className={`whitespace-pre-wrap rounded-xl border-l-4 bg-zinc-50 p-5 italic leading-relaxed text-zinc-800 shadow-sm dark:bg-zinc-900 dark:text-zinc-200 ${accent.quote}`}
              >
                {m.text || <span className="text-zinc-400">Contemplating...</span>}
                <footer className="mt-3 text-sm font-medium not-italic text-zinc-500 dark:text-zinc-400">
                  — {philosopher.name}
                </footer>
              </blockquote>
            ),
          )}
          <div ref={bottomRef} />
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask();
        }}
        className="flex flex-col gap-4"
      >
        <textarea
          name="question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={
            messages.length > 0
              ? `Ask ${philosopher.name} a follow-up...`
              : `Ask ${philosopher.name} a question...`
          }
          aria-label={`Your question for ${philosopher.name}`}
          rows={4}
          required
          maxLength={MAX_QUESTION_LENGTH}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              ask();
            }
          }}
          className={`w-full resize-none rounded-xl border border-zinc-300 bg-white p-4 text-base shadow-sm outline-none transition placeholder:text-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:placeholder:text-zinc-500 ${accent.ring}`}
        />
        {error && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={pending || !question.trim()}
          className={`self-end rounded-xl px-6 py-2.5 font-medium text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${accent.button}`}
        >
          {pending ? "Contemplating..." : "Ask"}
        </button>
      </form>
    </div>
  );
}

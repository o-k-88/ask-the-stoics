"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { ASK_EVENT, type AskEventDetail } from "../ask-event";
import {
  MAX_HISTORY_MESSAGES,
  MAX_QUESTION_LENGTH,
  RESET_ANSWER,
  type ChatMessage,
} from "../config";
import { defaultPhilosopher, philosophers } from "../philosophers";

type Conversations = Record<string, ChatMessage[]>;

const STORAGE_KEY = "ask-the-stoics:chat";
// Most messages kept per philosopher in browser storage.
const MAX_STORED_MESSAGES = 50;

const STARTER_QUESTIONS = [
  "How do I handle criticism?",
  "I'm anxious about my future. What should I do?",
  "How can I stop procrastinating?",
  "How do I deal with a difficult coworker?",
];

type SavedChat = { philosopherId: string; conversations: Conversations };

function loadChat(): SavedChat | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as Partial<SavedChat>;
    const conversations: Conversations = {};
    for (const p of philosophers) {
      const msgs = saved.conversations?.[p.id];
      if (!Array.isArray(msgs)) continue;
      conversations[p.id] = msgs.filter(
        (m): m is ChatMessage =>
          (m?.role === "user" || m?.role === "model") && typeof m.text === "string" && m.text !== "",
      );
    }
    const philosopherId = philosophers.some((p) => p.id === saved.philosopherId)
      ? saved.philosopherId!
      : defaultPhilosopher.id;
    return { philosopherId, conversations };
  } catch {
    return null;
  }
}

function saveChat(chat: SavedChat) {
  try {
    const trimmed: Conversations = {};
    for (const [id, msgs] of Object.entries(chat.conversations)) {
      // Skip an empty answer that is still streaming.
      trimmed[id] = msgs.filter((m) => m.text !== "").slice(-MAX_STORED_MESSAGES);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...chat, conversations: trimmed }));
  } catch {
    // Storage can be full or blocked (e.g. private browsing); the chat still works without it.
  }
}

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
  const [loaded, setLoaded] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const philosopher = philosophers.find((p) => p.id === philosopherId) ?? defaultPhilosopher;
  const accent = accentClasses[philosopher.accent];
  const messages = conversations[philosopherId] ?? [];

  // Restore the saved chat after the first render (browser storage isn't available on the server).
  useEffect(() => {
    const saved = loadChat();
    if (saved) {
      // Reading during render would make the server and browser HTML differ (hydration error),
      // so the saved chat is applied once, right after mounting.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setConversations(saved.conversations);
      setPhilosopherId(saved.philosopherId);
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) saveChat({ philosopherId, conversations });
  }, [loaded, philosopherId, conversations]);

  // Follow the answer while it streams in.
  useEffect(() => {
    if (pending) bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [conversations, pending]);

  // Questions sent from elsewhere on the page, like "Ask about this" on a practice.
  const onAskEvent = useEffectEvent((detail: AskEventDetail) => {
    if (pending) return;
    setPhilosopherId(detail.philosopherId);
    containerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    ask(detail.question, detail.philosopherId);
  });

  useEffect(() => {
    const listener = (e: Event) => onAskEvent((e as CustomEvent<AskEventDetail>).detail);
    window.addEventListener(ASK_EVENT, listener);
    return () => window.removeEventListener(ASK_EVENT, listener);
  }, []);

  function updateConversation(id: string, update: (msgs: ChatMessage[]) => ChatMessage[]) {
    setConversations((prev) => ({ ...prev, [id]: update(prev[id] ?? []) }));
  }

  async function ask(questionText: string = question, id: string = philosopherId) {
    const text = questionText.trim();
    if (!text || pending) return;

    const history: ChatMessage[] = [...(conversations[id] ?? []), { role: "user", text }];

    setPending(true);
    setError("");
    setQuestion("");
    // Show the question plus an empty answer that fills in as it streams.
    updateConversation(id, () => [...history, { role: "model", text: "" }]);

    const appendToAnswer = (chunk: string) =>
      updateConversation(id, (msgs) => {
        const last = msgs.at(-1);
        if (!last || last.role !== "model") return msgs;
        // A reset marker means the server restarted the answer; keep only what follows it.
        const resetAt = chunk.lastIndexOf(RESET_ANSWER);
        const text = resetAt === -1 ? last.text + chunk : chunk.slice(resetAt + 1);
        return [...msgs.slice(0, -1), { ...last, text }];
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
          received = !chunk.endsWith(RESET_ANSWER);
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
    <div ref={containerRef} className="w-full scroll-mt-8">
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

      {loaded && messages.length === 0 && (
        <div className="mb-4">
          <p className="mb-2 text-sm text-zinc-500 dark:text-zinc-400">Try asking:</p>
          <div className="flex flex-wrap gap-2">
            {STARTER_QUESTIONS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => ask(q)}
                disabled={pending}
                className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-left text-sm text-zinc-700 transition hover:border-zinc-400 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:border-zinc-500"
              >
                {q}
              </button>
            ))}
          </div>
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

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

// Each philosopher's color appears only as the thin line beside their answers.
const answerBorder: Record<string, string> = {
  amber: "border-amber-600",
  emerald: "border-emerald-600",
  sky: "border-sky-600",
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
      <div
        role="group"
        aria-label="Choose a philosopher"
        className="grid grid-cols-3 gap-1 rounded-2xl bg-zinc-200/60 p-1 dark:bg-zinc-800/60"
      >
        {philosophers.map((p) => {
          const isSelected = p.id === philosopherId;
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
              className={`rounded-xl px-2 py-2.5 text-center transition disabled:cursor-not-allowed ${
                isSelected
                  ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-zinc-50"
                  : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
              }`}
            >
              <span className="block text-sm font-medium sm:text-base">{p.name}</span>
              <span className="block text-xs text-zinc-500 dark:text-zinc-500">{p.role}</span>
            </button>
          );
        })}
      </div>

      {messages.length > 0 && (
        <div className="mt-8 flex flex-col gap-6" aria-live="polite">
          {messages.map((m, i) =>
            m.role === "user" ? (
              <p
                key={i}
                className="max-w-[85%] self-end whitespace-pre-wrap rounded-2xl bg-zinc-200/70 px-4 py-2.5 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
              >
                {m.text}
              </p>
            ) : (
              <div
                key={i}
                className={`border-l-2 pl-5 ${answerBorder[philosopher.accent]}`}
              >
                <p className="whitespace-pre-wrap text-[17px] leading-8 text-zinc-800 dark:text-zinc-200">
                  {m.text || <span className="text-zinc-400">Contemplating…</span>}
                </p>
                <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">— {philosopher.name}</p>
              </div>
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
        className="mt-6 rounded-2xl border border-zinc-300 bg-white shadow-sm transition focus-within:border-amber-600 focus-within:ring-2 focus-within:ring-amber-600/20 dark:border-zinc-700 dark:bg-zinc-900"
      >
        <textarea
          name="question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={
            messages.length > 0
              ? `Ask ${philosopher.name} a follow-up…`
              : `Ask ${philosopher.name} a question…`
          }
          aria-label={`Your question for ${philosopher.name}`}
          rows={3}
          required
          maxLength={MAX_QUESTION_LENGTH}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              ask();
            }
          }}
          className="block w-full resize-none rounded-t-2xl bg-transparent px-4 pt-4 text-base text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-zinc-100 dark:placeholder:text-zinc-500"
        />
        <div className="flex items-center justify-between gap-3 px-3 pb-3">
          {messages.length > 0 ? (
            <button
              type="button"
              onClick={startOver}
              disabled={pending}
              className="px-1 text-sm text-zinc-500 underline-offset-4 hover:text-zinc-800 hover:underline disabled:opacity-60 dark:text-zinc-400 dark:hover:text-zinc-200"
            >
              New conversation
            </button>
          ) : (
            <span />
          )}
          <button
            type="submit"
            disabled={pending || !question.trim()}
            className="rounded-xl bg-amber-700 px-5 py-2 text-sm font-medium text-white transition hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "Contemplating…" : "Ask"}
          </button>
        </div>
      </form>

      {error && (
        <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {loaded && messages.length === 0 && (
        <p className="mt-4 text-sm leading-7 text-zinc-500 dark:text-zinc-400">
          <span className="mr-1">Try:</span>
          {STARTER_QUESTIONS.map((q, i) => (
            <span key={q}>
              {i > 0 && <span aria-hidden="true" className="mx-2 text-zinc-300 dark:text-zinc-600">·</span>}
              <button
                type="button"
                onClick={() => ask(q)}
                disabled={pending}
                className="text-zinc-700 underline decoration-zinc-300 underline-offset-4 hover:text-amber-800 hover:decoration-amber-600 disabled:opacity-60 dark:text-zinc-300 dark:decoration-zinc-600 dark:hover:text-amber-400"
              >
                {q}
              </button>
            </span>
          ))}
        </p>
      )}
    </div>
  );
}

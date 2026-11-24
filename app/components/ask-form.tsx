"use client";

import { useActionState, useState } from "react";
import { generateText } from "../actions";
import { MAX_QUESTION_LENGTH } from "../config";
import { defaultPhilosopher, philosophers } from "../philosophers";

type ReplyState = { text: string; philosopherName: string; accent: string };

const initialState: ReplyState = {
  text: "",
  philosopherName: defaultPhilosopher.name,
  accent: defaultPhilosopher.accent,
};

const accentClasses: Record<
  string,
  { ring: string; selected: string; unselected: string; quote: string }
> = {
  amber: {
    ring: "focus:border-amber-600 focus:ring-amber-600/30",
    selected: "border-amber-700 bg-amber-700 text-white",
    unselected:
      "border-zinc-300 bg-white text-zinc-700 hover:border-amber-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300",
    quote: "border-amber-700",
  },
  emerald: {
    ring: "focus:border-emerald-600 focus:ring-emerald-600/30",
    selected: "border-emerald-700 bg-emerald-700 text-white",
    unselected:
      "border-zinc-300 bg-white text-zinc-700 hover:border-emerald-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300",
    quote: "border-emerald-700",
  },
  sky: {
    ring: "focus:border-sky-600 focus:ring-sky-600/30",
    selected: "border-sky-700 bg-sky-700 text-white",
    unselected:
      "border-zinc-300 bg-white text-zinc-700 hover:border-sky-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300",
    quote: "border-sky-700",
  },
};

export default function AskForm() {
  const [philosopherId, setPhilosopherId] = useState(defaultPhilosopher.id);
  const philosopher = philosophers.find((p) => p.id === philosopherId) ?? defaultPhilosopher;
  const accent = accentClasses[philosopher.accent];

  async function askAction(_previousReply: ReplyState, formData: FormData): Promise<ReplyState> {
    const question = formData.get("question");
    const selectedId = formData.get("philosopherId");
    const resolvedId = typeof selectedId === "string" ? selectedId : philosopherId;
    const text = await generateText(resolvedId, typeof question === "string" ? question : "");
    const submittedPhilosopher =
      philosophers.find((p) => p.id === resolvedId) ?? defaultPhilosopher;
    return {
      text,
      philosopherName: submittedPhilosopher.name,
      accent: submittedPhilosopher.accent,
    };
  }

  const [reply, formAction, pending] = useActionState(askAction, initialState);
  const replyAccent = accentClasses[reply.accent];

  return (
    <div className="w-full max-w-xl">
      <div className="mb-4 flex flex-wrap gap-2">
        {philosophers.map((p) => {
          const isSelected = p.id === philosopherId;
          const classes = accentClasses[p.accent];
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setPhilosopherId(p.id)}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
                isSelected ? classes.selected : classes.unselected
              }`}
            >
              {p.name}
            </button>
          );
        })}
      </div>

      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="philosopherId" value={philosopherId} />
        <textarea
          name="question"
          placeholder={`Ask ${philosopher.name} a question...`}
          rows={4}
          required
          maxLength={MAX_QUESTION_LENGTH}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (!pending) e.currentTarget.form?.requestSubmit();
            }
          }}
          className={`w-full resize-none rounded-xl border border-zinc-300 bg-white p-4 text-base shadow-sm outline-none transition placeholder:text-zinc-400 focus:ring-2 dark:border-zinc-700 dark:bg-zinc-900 dark:placeholder:text-zinc-500 ${accent.ring}`}
        />
        <button
          type="submit"
          disabled={pending}
          className="self-end rounded-xl bg-amber-700 px-6 py-2.5 font-medium text-white shadow-sm transition hover:bg-amber-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Contemplating..." : "Ask"}
        </button>
      </form>

      {reply.text && (
        <blockquote
          className={`mt-8 whitespace-pre-wrap rounded-xl border-l-4 bg-zinc-50 p-5 italic leading-relaxed text-zinc-800 shadow-sm dark:bg-zinc-900 dark:text-zinc-200 ${replyAccent.quote}`}
        >
          {reply.text}
          <footer className="mt-3 text-sm font-medium not-italic text-zinc-500 dark:text-zinc-400">
            — {reply.philosopherName}
          </footer>
        </blockquote>
      )}
    </div>
  );
}

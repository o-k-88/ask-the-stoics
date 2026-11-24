"use client";

import { askPhilosopher } from "../ask-event";

export default function AskAboutButton({
  philosopherId,
  philosopherName,
  question,
}: {
  philosopherId: string;
  philosopherName: string;
  question: string;
}) {
  return (
    <button
      type="button"
      onClick={() => askPhilosopher(philosopherId, question)}
      className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-zinc-700 underline-offset-4 hover:underline dark:text-zinc-300"
    >
      Ask {philosopherName} about this
      <span aria-hidden="true">→</span>
    </button>
  );
}

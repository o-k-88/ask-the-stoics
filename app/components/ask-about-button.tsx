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
      className="inline-flex items-center gap-1 font-medium text-amber-800 underline-offset-4 hover:underline dark:text-amber-400"
    >
      Ask {philosopherName} about this
      <span aria-hidden="true">→</span>
    </button>
  );
}

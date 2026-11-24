"use client";

import { useSyncExternalStore } from "react";
import AskAboutButton from "./ask-about-button";
import { getPhilosopher } from "../philosophers";
import { practices, type Practice } from "../practices";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Days since 1970 in the visitor's own time zone, so the practice changes at their midnight. */
function localDayNumber(): number {
  const now = new Date();
  return Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / DAY_MS);
}

const subscribe = () => () => {};

/**
 * Returns today's practice in the browser, or null during server rendering.
 * The page is built ahead of time, so the server can't know the visitor's date.
 */
function useTodaysPractice(): Practice | null {
  const day = useSyncExternalStore(subscribe, localDayNumber, () => null);
  return day === null ? null : practices[day % practices.length];
}

function PracticeBody({ practice }: { practice: Practice }) {
  const philosopher = getPhilosopher(practice.philosopherId);
  return (
    <>
      <div className="space-y-2 leading-relaxed text-zinc-600 dark:text-zinc-400">
        <p>{practice.intro}</p>
        {practice.items && (
          <ul className="list-disc space-y-1 pl-5 marker:text-zinc-400">
            {practice.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}
        {practice.outro && <p>{practice.outro}</p>}
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-sm">
        <span className="text-zinc-500">
          — {philosopher.name}
          {practice.source && <cite className="not-italic">, {practice.source}</cite>}
        </span>
        <AskAboutButton
          philosopherId={philosopher.id}
          philosopherName={philosopher.name}
          question={practice.question}
        />
      </div>
    </>
  );
}

export default function DailyPractices() {
  const today = useTodaysPractice();

  return (
    <section aria-labelledby="practice-heading" className="mt-16">
      <div className="min-h-64 rounded-2xl border border-zinc-200 bg-white/70 p-6 dark:border-zinc-800 dark:bg-zinc-900/50">
        <p className="text-xs font-semibold tracking-widest text-amber-700 uppercase dark:text-amber-500">
          Today&apos;s practice
        </p>
        {today && (
          <>
            <h2
              id="practice-heading"
              className="mt-2 mb-3 text-xl font-semibold text-zinc-900 dark:text-zinc-50"
            >
              {today.name}
            </h2>
            <PracticeBody practice={today} />
          </>
        )}
      </div>

      <details className="group mt-4">
        <summary className="inline-flex cursor-pointer list-none items-center gap-1 text-sm text-zinc-600 select-none hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 [&::-webkit-details-marker]:hidden">
          <span className="group-open:hidden">See all {practices.length} practices</span>
          <span className="hidden group-open:inline">Hide practices</span>
          <svg
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
            className="size-4 transition-transform group-open:rotate-180"
          >
            <path
              fillRule="evenodd"
              d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
              clipRule="evenodd"
            />
          </svg>
        </summary>

        <ul className="mt-4 divide-y divide-zinc-200 border-y border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800">
          {practices.map((p) => (
            <li key={p.id} className="py-5">
              <h3 className="mb-2 font-semibold text-zinc-900 dark:text-zinc-50">{p.name}</h3>
              <PracticeBody practice={p} />
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}

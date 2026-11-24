import AskAboutButton from "./ask-about-button";
import { getPhilosopher } from "../philosophers";
import { practices } from "../practices";

// Full class names so Tailwind can find them.
const tagClasses: Record<string, string> = {
  amber: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
  emerald: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300",
  sky: "bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-300",
};

const dotClasses: Record<string, string> = {
  amber: "bg-amber-600",
  emerald: "bg-emerald-600",
  sky: "bg-sky-600",
};

export default function DailyPractices() {
  return (
    <aside
      aria-labelledby="practices-heading"
      className="lg:sticky lg:top-8 lg:max-h-[calc(100vh-4rem)] lg:overflow-y-auto"
    >
      <h2
        id="practices-heading"
        className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50"
      >
        Daily Practices
      </h2>
      <p className="mt-1 mb-4 text-sm text-zinc-600 dark:text-zinc-400">
        Stoicism is meant to be lived, not just read. Try one or two of these each day.
      </p>

      <ul className="flex flex-col gap-2">
        {practices.map((p, i) => {
          const philosopher = getPhilosopher(p.philosopherId);
          return (
            <li key={p.id}>
              <details
                open={i === 0}
                className="group rounded-xl border border-zinc-200 bg-white/70 shadow-sm transition open:bg-white dark:border-zinc-800 dark:bg-zinc-900/60 dark:open:bg-zinc-900"
              >
                <summary className="flex cursor-pointer list-none items-center gap-3 rounded-xl px-4 py-3 font-medium text-zinc-900 select-none hover:bg-zinc-50 dark:text-zinc-100 dark:hover:bg-zinc-800/60 [&::-webkit-details-marker]:hidden">
                  <span
                    className={`size-2 shrink-0 rounded-full ${dotClasses[philosopher.accent]}`}
                    aria-hidden="true"
                  />
                  <span className="flex-1 text-sm">{p.name}</span>
                  <svg
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                    className="size-4 shrink-0 text-zinc-400 transition-transform group-open:rotate-180"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
                      clipRule="evenodd"
                    />
                  </svg>
                </summary>

                <div className="px-4 pb-4 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                  <p>{p.intro}</p>
                  {p.items && (
                    <ul className="mt-2 list-disc space-y-1 pl-5 marker:text-zinc-400">
                      {p.items.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  )}
                  {p.outro && <p className="mt-2">{p.outro}</p>}
                  <p className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                    <span
                      className={`rounded-full px-2.5 py-0.5 font-medium ${tagClasses[philosopher.accent]}`}
                    >
                      {philosopher.name}
                    </span>
                    {p.source && (
                      <cite className="text-zinc-500 not-italic">{p.source}</cite>
                    )}
                  </p>
                  <AskAboutButton
                    philosopherId={philosopher.id}
                    philosopherName={philosopher.name}
                    question={p.question}
                  />
                </div>
              </details>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}

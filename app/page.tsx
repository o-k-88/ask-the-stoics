import AskForm from "./components/ask-form";
import DailyPractices from "./components/daily-practices";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-[88rem] flex-1 px-4 py-12 sm:px-6 sm:py-16 lg:px-10">
      <header className="flex flex-col items-center text-center">
        <span className="mb-3 text-3xl select-none" aria-hidden="true">
          🏛️
        </span>
        <h1 className="text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl dark:text-zinc-50">
          Ask the{" "}
          <span className="bg-linear-to-r from-amber-700 via-amber-600 to-amber-800 bg-clip-text text-transparent dark:from-amber-500 dark:via-amber-400 dark:to-amber-500">
            Stoics
          </span>
        </h1>
        <p className="mt-4 max-w-2xl text-balance text-zinc-600 dark:text-zinc-400">
          Explore Stoic philosophy through intelligent conversations. Gain practical wisdom, reflect
          on everyday challenges, and learn from an AI powered by Gemini 3.5 Flash-Lite.
        </p>
      </header>

      <div className="mt-12 grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_26rem] lg:items-start xl:gap-10">
        <section
          aria-label="Ask a philosopher"
          className="rounded-2xl border border-zinc-200 bg-white/60 p-5 shadow-sm backdrop-blur-sm sm:p-6 dark:border-zinc-800 dark:bg-zinc-900/40"
        >
          <AskForm />
        </section>
        <DailyPractices />
      </div>
    </main>
  );
}

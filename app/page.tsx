import AskForm from "./components/ask-form";
import DailyPractices from "./components/daily-practices";

export default function Home() {
  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-14 sm:py-20">
      <header className="mb-10 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl dark:text-zinc-50">
          Ask the{" "}
          <span className="bg-linear-to-r from-amber-700 via-amber-600 to-amber-800 bg-clip-text text-transparent dark:from-amber-500 dark:via-amber-400 dark:to-amber-500">
            Stoics
          </span>
        </h1>
        <p className="mt-3 text-balance text-zinc-600 dark:text-zinc-400">
          Counsel for everyday life from Marcus Aurelius, Seneca, and Epictetus.
        </p>
      </header>

      <AskForm />
      <DailyPractices />
    </main>
  );
}

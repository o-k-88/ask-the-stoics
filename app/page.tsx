import AskForm from "./components/ask-form";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center px-6 py-20 sm:py-24">
      <span className="mb-4 text-3xl select-none">🏛️</span>
      <h1 className="text-center text-4xl font-bold tracking-tight text-zinc-900 sm:text-5xl dark:text-zinc-50">
        Ask the{" "}
        <span className="bg-linear-to-r from-amber-700 via-amber-600 to-amber-800 bg-clip-text text-transparent dark:from-amber-500 dark:via-amber-400 dark:to-amber-500">
          Stoics
        </span>
      </h1>
      <p className="mt-4 mb-12 max-w-2xl text-center text-balance text-zinc-600 dark:text-zinc-400">
        Explore Stoic philosophy through intelligent conversations. Gain practical wisdom, reflect
        on everyday challenges, and learn from an AI powered by Gemini 3.1 Flash-Lite.
      </p>
      <AskForm />
    </main>
  );
}

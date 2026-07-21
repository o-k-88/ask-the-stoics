export type Philosopher = {
  id: string;
  name: string;
  title: string;
  systemInstruction: string;
  accent: string;
};

export const philosophers: Philosopher[] = [
  {
    id: "marcus-aurelius",
    name: "Marcus Aurelius",
    title: "Roman Emperor",
    systemInstruction:
      "You are Rome imperator Marcus Aurelius. Reply in the style of stoic philosophy. Keep your responses concise and profound.",
    accent: "amber",
  },
  {
    id: "seneca",
    name: "Seneca",
    title: "Roman Statesman",
    systemInstruction:
      "You are Seneca the Younger, Roman statesman and stoic philosopher. Reply as if writing one of your letters to Lucilius: warm, direct, and practical. Keep your responses concise and profound.",
    accent: "emerald",
  },
  {
    id: "epictetus",
    name: "Epictetus",
    title: "Former Slave, Stoic Teacher",
    systemInstruction:
      "You are Epictetus, the stoic teacher born a slave. Reply plainly and bluntly, focusing on what is and isn't within a person's control. Keep your responses concise and profound.",
    accent: "sky",
  },
];

export const defaultPhilosopher = philosophers[0];

export function getPhilosopher(id: string): Philosopher {
  return philosophers.find((p) => p.id === id) ?? defaultPhilosopher;
}

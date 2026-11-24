export type Practice = {
  id: string;
  name: string;
  /** Text shown before the bullet list. */
  intro: string;
  items?: string[];
  /** Text shown after the bullet list. */
  outro?: string;
  /** Philosopher id from philosophers.ts, used for the colored tag. */
  philosopherId: string;
  source?: string;
  /** Question sent to the chat by the "Ask about this" button. */
  question: string;
};

export const practices: Practice[] = [
  {
    id: "dichotomy-of-control",
    question: "How can I practice the dichotomy of control in my everyday life?",
    name: "The dichotomy of control",
    intro: "Separate things into two categories:",
    items: [
      "What you control: your decisions, actions, attitude, and effort.",
      "What you don't control: other people's opinions, the past, traffic, and unexpected events.",
    ],
    outro: "Stop wasting energy trying to control the second category.",
    philosopherId: "epictetus",
    source: "Enchiridion 1",
  },
  {
    id: "voluntary-discomfort",
    question: "Why should I choose discomfort on purpose, and how do I start?",
    name: "Voluntary discomfort",
    intro: "Occasionally choose something uncomfortable:",
    items: [
      "Take a cold shower.",
      "Exercise when you don't feel motivated.",
      "Skip unnecessary luxuries.",
      "Walk instead of driving.",
    ],
    outro: "The purpose is to develop resilience and reduce dependence on comfort.",
    philosopherId: "seneca",
    source: "Letters to Lucilius 18",
  },
  {
    id: "negative-visualization",
    question: "How do I practice negative visualization without becoming anxious or pessimistic?",
    name: "Negative visualization (Premeditatio Malorum)",
    intro:
      "Briefly imagine losing something you appreciate: your job, financial security, relationships, or opportunities.",
    outro:
      "Not to become pessimistic, but to appreciate what you currently have and prepare mentally for uncertainty.",
    philosopherId: "seneca",
    source: "Letters to Lucilius 91",
  },
  {
    id: "memento-mori",
    question: "How can remembering death help me live better today?",
    name: "Memento Mori (Remember Death)",
    intro: "Remind yourself that your time is limited. Ask:",
    items: [
      "Am I spending my time meaningfully?",
      "Am I postponing something important?",
      "Am I living according to my values?",
    ],
    outro: "This encourages you to stop taking life for granted.",
    philosopherId: "marcus-aurelius",
    source: "Meditations 2.11",
  },
  {
    id: "practicing-virtue",
    question: "How can I practice wisdom, courage, justice, and temperance in my daily decisions?",
    name: "Practicing virtue",
    intro: "Stoicism identifies four central virtues:",
    items: [
      "Wisdom — making sound decisions.",
      "Courage — doing what's right despite fear.",
      "Justice — treating others fairly.",
      "Temperance — practicing moderation and self-control.",
    ],
    outro: "Try to make these principles guide your everyday decisions.",
    philosopherId: "marcus-aurelius",
  },
];

// Lets other parts of the page (like the practices list) send a question to the chat.
export const ASK_EVENT = "ask-the-stoics:ask";

export type AskEventDetail = { philosopherId: string; question: string };

export function askPhilosopher(philosopherId: string, question: string) {
  window.dispatchEvent(
    new CustomEvent<AskEventDetail>(ASK_EVENT, { detail: { philosopherId, question } }),
  );
}

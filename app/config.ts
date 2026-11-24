export const MAX_QUESTION_LENGTH = 1000;
// How many earlier messages (questions + answers) are sent along for context.
export const MAX_HISTORY_MESSAGES = 20;
// Longest earlier answer accepted from the client when sending history.
export const MAX_ANSWER_LENGTH = 6000;

export type ChatMessage = { role: "user" | "model"; text: string };

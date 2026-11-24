import { ApiError, GoogleGenAI, type GenerateContentResponse } from "@google/genai";
import {
  MAX_ANSWER_LENGTH,
  MAX_HISTORY_MESSAGES,
  MAX_QUESTION_LENGTH,
  RESET_ANSWER,
  type ChatMessage,
} from "../../config";
import { getPhilosopher } from "../../philosophers";

const MODELS = ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite"];

// Simple in-memory rate limit: RATE_LIMIT requests per RATE_WINDOW_MS per IP.
// Note: this resets on server restart and isn't shared between server instances.
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 60_000;
const requestLog = new Map<string, number[]>();

const apiKey = process.env["GEMINI_API_KEY"];
if (!apiKey) {
  console.error("GEMINI_API_KEY is not set. Add it to your .env file.");
}
const ai = new GoogleGenAI({ apiKey });

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const recent = (requestLog.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_LIMIT) {
    requestLog.set(ip, recent);
    return true;
  }
  recent.push(now);
  requestLog.set(ip, recent);

  // Keep the map from growing forever.
  if (requestLog.size > 10_000) {
    for (const [key, times] of requestLog) {
      if (times.every((t) => now - t >= RATE_WINDOW_MS)) requestLog.delete(key);
    }
  }
  return false;
}

function getClientIp(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

function isOverloaded(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 503 || error.status === 429);
}

function errorResponse(message: string, status: number): Response {
  return Response.json({ error: message }, { status });
}

/** Validates the request body. Returns the cleaned messages, or an error message. */
function parseMessages(body: unknown): ChatMessage[] | string {
  const messages = (body as { messages?: unknown })?.messages;
  if (!Array.isArray(messages) || messages.length === 0) return "No question was sent.";

  const cleaned: ChatMessage[] = [];
  for (const m of messages.slice(-MAX_HISTORY_MESSAGES)) {
    const role = (m as ChatMessage)?.role;
    const text = (m as ChatMessage)?.text;
    if ((role !== "user" && role !== "model") || typeof text !== "string") {
      return "Invalid message format.";
    }
    const limit = role === "user" ? MAX_QUESTION_LENGTH : MAX_ANSWER_LENGTH;
    if (text.length > limit) {
      return `Brevity is a virtue. Please keep your question under ${MAX_QUESTION_LENGTH} characters.`;
    }
    cleaned.push({ role, text });
  }

  // Gemini expects the conversation to start with the user.
  while (cleaned.length > 0 && cleaned[0].role !== "user") cleaned.shift();

  const last = cleaned.at(-1);
  if (!last || last.role !== "user" || !last.text.trim()) {
    return "Ask, and the Stoa shall answer.";
  }
  return cleaned;
}

export async function POST(req: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse("Invalid request.", 400);
  }

  const messages = parseMessages(body);
  if (typeof messages === "string") return errorResponse(messages, 400);

  if (!apiKey) {
    return errorResponse("The oracle is not configured. (Server is missing GEMINI_API_KEY.)", 500);
  }
  if (isRateLimited(getClientIp(req))) {
    return errorResponse(
      "Patience is a virtue. You've asked many questions — please wait a minute and try again.",
      429,
    );
  }

  const philosopherId = (body as { philosopherId?: unknown }).philosopherId;
  const philosopher = getPhilosopher(typeof philosopherId === "string" ? philosopherId : "");
  const contents = messages.map((m) => ({ role: m.role, parts: [{ text: m.text }] }));

  type OpenStream = {
    model: string;
    stream: AsyncGenerator<GenerateContentResponse>;
    first: IteratorResult<GenerateContentResponse>;
  };

  // Opens a stream and waits for the first chunk, so an overload error shows up here
  // (and can trigger the fallback) instead of after the response has started.
  async function openStream(model: string): Promise<OpenStream> {
    const stream = await ai.models.generateContentStream({
      model,
      contents,
      config: { systemInstruction: philosopher.systemInstruction },
    });
    return { model, stream, first: await stream.next() };
  }

  /** Tries each remaining model in order. Returns the first that starts, or the last error. */
  async function openWithFallback(models: string[]): Promise<OpenStream | { error: unknown }> {
    let lastError: unknown;
    for (const model of models) {
      try {
        return await openStream(model);
      } catch (error) {
        lastError = error;
        console.error(`Error communicating with Gemini (${model}):`, error);
        if (!isOverloaded(error)) break;
      }
    }
    return { error: lastError };
  }

  const opened = await openWithFallback(MODELS);
  if ("error" in opened) {
    return isOverloaded(opened.error)
      ? errorResponse("The oracle is busy with many seekers right now. Please try again in a moment.", 503)
      : errorResponse("Something went wrong. Try again.", 500);
  }

  const encoder = new TextEncoder();

  const responseStream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let current = opened;
      try {
        while (true) {
          try {
            if (!current.first.done) {
              if (current.first.value.text) controller.enqueue(encoder.encode(current.first.value.text));
              for await (const chunk of current.stream) {
                if (chunk.text) controller.enqueue(encoder.encode(chunk.text));
              }
            }
            return;
          } catch (error) {
            console.error(`Gemini stream interrupted (${current.model}):`, error);
            // If the model got overloaded mid-answer, start over on the next model.
            const remaining = MODELS.slice(MODELS.indexOf(current.model) + 1);
            const next = isOverloaded(error) ? await openWithFallback(remaining) : null;
            if (!next || "error" in next) {
              controller.enqueue(encoder.encode("\n\n[The answer was cut short. Please try again.]"));
              return;
            }
            // Tell the browser to throw away the partial answer.
            controller.enqueue(encoder.encode(RESET_ANSWER));
            current = next;
          }
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(responseStream, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}

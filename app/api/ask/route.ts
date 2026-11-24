import { ApiError, GoogleGenAI, type GenerateContentResponse } from "@google/genai";
import {
  MAX_ANSWER_LENGTH,
  MAX_HISTORY_MESSAGES,
  MAX_QUESTION_LENGTH,
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

  // Start the stream, falling back to the next model if one is overloaded.
  // We wait for the first chunk so an overload error can still trigger the fallback.
  let stream: AsyncGenerator<GenerateContentResponse> | undefined;
  let first: IteratorResult<GenerateContentResponse> | undefined;
  let lastError: unknown;

  for (const model of MODELS) {
    try {
      stream = await ai.models.generateContentStream({
        model,
        contents,
        config: { systemInstruction: philosopher.systemInstruction },
      });
      first = await stream.next();
      break;
    } catch (error) {
      lastError = error;
      stream = undefined;
      console.error(`Error communicating with Gemini (${model}):`, error);
      if (!isOverloaded(error)) break;
    }
  }

  if (!stream || !first) {
    return isOverloaded(lastError)
      ? errorResponse("The oracle is busy with many seekers right now. Please try again in a moment.", 503)
      : errorResponse("Something went wrong. Try again.", 500);
  }

  const encoder = new TextEncoder();
  const activeStream = stream;
  const firstChunk = first;

  const responseStream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        if (!firstChunk.done && firstChunk.value.text) {
          controller.enqueue(encoder.encode(firstChunk.value.text));
        }
        if (!firstChunk.done) {
          for await (const chunk of activeStream) {
            if (chunk.text) controller.enqueue(encoder.encode(chunk.text));
          }
        }
      } catch (error) {
        console.error("Gemini stream interrupted:", error);
        controller.enqueue(encoder.encode("\n\n[The answer was cut short. Please try again.]"));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(responseStream, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}

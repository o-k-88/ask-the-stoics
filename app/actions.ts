"use server";

import { ApiError, GoogleGenAI } from "@google/genai";
import { headers } from "next/headers";
import { MAX_QUESTION_LENGTH } from "./config";
import { getPhilosopher } from "./philosophers";

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

async function getClientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

function isOverloaded(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 503 || error.status === 429);
}

export async function generateText(philosopherId: string, inputText: string): Promise<string> {
  const question = inputText.trim();
  if (!question) {
    return "Ask, and the Stoa shall answer.";
  }
  if (question.length > MAX_QUESTION_LENGTH) {
    return `Brevity is a virtue. Please keep your question under ${MAX_QUESTION_LENGTH} characters.`;
  }
  if (!apiKey) {
    return "The oracle is not configured. (Server is missing GEMINI_API_KEY.)";
  }
  if (isRateLimited(await getClientIp())) {
    return "Patience is a virtue. You've asked many questions — please wait a minute and try again.";
  }

  const philosopher = getPhilosopher(philosopherId);
  let lastError: unknown;

  // Try the main model, then the fallback, if the model is overloaded.
  for (const model of MODELS) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: question,
        config: {
          systemInstruction: philosopher.systemInstruction,
        },
      });
      return response.text ?? "The oracle is silent.";
    } catch (error) {
      lastError = error;
      console.error(`Error communicating with Gemini (${model}):`, error);
      if (!isOverloaded(error)) break;
    }
  }

  if (isOverloaded(lastError)) {
    return "The oracle is busy with many seekers right now. Please try again in a moment.";
  }
  return "Something went wrong. Try again.";
}

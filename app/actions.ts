"use server";

import { GoogleGenAI } from "@google/genai";
import { getPhilosopher } from "./philosophers";

const ai = new GoogleGenAI({ apiKey: process.env["GEMINI_API_KEY"] });

export async function generateText(philosopherId: string, inputText: string): Promise<string> {
  if (!inputText.trim()) {
    return "Ask, and the Stoa shall answer.";
  }

  const philosopher = getPhilosopher(philosopherId);

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: inputText,
      config: {
        systemInstruction: philosopher.systemInstruction,
      },
    });

    return response.text ?? "The oracle is silent.";
  } catch (error) {
    console.error("Error communicating with Gemini:", error);
    return "Something went wrong. Try again.";
  }
}

# Ask the Stoics

Ask Marcus Aurelius, Seneca, or Epictetus for Stoic counsel. Each philosopher answers in their own voice, powered by Google Gemini. Answers stream in as they're written, and you can ask follow-up questions.

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Get a Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey).

3. Copy `.env.example` to `.env` and add your key:

   ```
   GEMINI_API_KEY=your-key-here
   ```

4. Start the development server:

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## How it works

- `app/components/ask-form.tsx`: the chat UI. Each philosopher has a separate conversation.
- `app/api/ask/route.ts`: sends the conversation to Gemini and streams the answer back.
- `app/philosophers.ts`: the philosophers and the instructions that shape their voices. Add a new philosopher here.
- `app/config.ts`: limits on question length and conversation history.

## Limits and safeguards

- Questions are limited to 1,000 characters.
- Each IP address can ask 10 questions per minute. This limit is kept in server memory, so it resets on restart and isn't shared across multiple server instances.
- If the main model (`gemini-3.5-flash-lite`) is overloaded, the app falls back to `gemini-3.1-flash-lite`.
- Set a spending cap in Google AI Studio before deploying publicly.

## Deploying

Set `GEMINI_API_KEY` as an environment variable in your hosting provider (for example, Vercel's project settings). The `.env` file is not committed to git.

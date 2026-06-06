import OpenAI from "openai";

/**
 * Lazy OpenAI client used by /api/ai/chat and /api/ai/grammar.
 * The API key is server-only — it never appears in any NEXT_PUBLIC_ env or
 * frontend bundle.
 */
let cached: OpenAI | null = null;

export function openai(): OpenAI {
  if (cached) return cached;
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error(
      "OPENAI_API_KEY is missing. Add it to .env.local (no NEXT_PUBLIC_ prefix)."
    );
  }
  cached = new OpenAI({ apiKey: key });
  return cached;
}

/** Model choices. Pro users get higher-quality chat; everyone shares grammar. */
export const MODELS = {
  CHAT_FREE: "gpt-4o-mini",
  CHAT_PRO: "gpt-4o",
  GRAMMAR: "gpt-4o-mini",
} as const;

import { NextRequest, NextResponse } from "next/server";
import { openai, MODELS } from "@/lib/ai/openai-client";
import { checkProStatus } from "@/lib/ai/pro-status";
import { quotaCheck, recordUsage } from "@/lib/ai/quota";
import { AI_DAILY_FREE_LIMIT, AI_DAILY_PRO_LIMIT } from "@/lib/constants";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `You are a strict grammar, spelling, and clarity checker for an article-publishing app.

You receive a passage and return JSON in the exact shape:
{
  "issues": [
    {
      "type": "grammar" | "spelling" | "clarity" | "fact",
      "original": "exact substring with the issue (must be present verbatim in input)",
      "suggestion": "what to replace it with",
      "explanation": "one short sentence explaining why"
    }
  ]
}

Rules:
- "original" must be an EXACT substring of the input (case-sensitive). Never paraphrase.
- Skip trivial style preferences (Oxford comma, sentence-final prepositions, etc.). Only flag real issues.
- "fact" is for clearly wrong technical claims about Sui, Walrus, DeepBook, Tatum, or basic crypto facts. Be conservative — only flag when confident.
- Return an empty array if the passage is clean.
- Max 8 issues per response. Prioritize the most impactful ones.

Return ONLY the JSON object, no commentary.`;

interface GrammarIssue {
  type: "grammar" | "spelling" | "clarity" | "fact";
  original: string;
  suggestion: string;
  explanation: string;
}

export async function POST(req: NextRequest) {
  try {
    const wallet = req.headers.get("x-wallet-address") || "";
    if (!wallet || !wallet.startsWith("0x")) {
      return NextResponse.json({ issues: [] });
    }

    const body = (await req.json()) as { text?: string };
    const text = (body.text || "").trim();
    if (text.length < 20) {
      return NextResponse.json({ issues: [] });
    }
    if (text.length > 4000) {
      return NextResponse.json(
        { error: "Passage too long for grammar check (4000 char max)." },
        { status: 413 }
      );
    }

    const isPro = await checkProStatus(wallet);
    const limit = isPro ? AI_DAILY_PRO_LIMIT : AI_DAILY_FREE_LIMIT;
    const { allowed, used } = quotaCheck(wallet, limit);
    if (!allowed) {
      return NextResponse.json(
        {
          error: `Daily AI limit reached (${limit}). ${
            isPro ? "Resets at UTC midnight." : "Upgrade to Pro for more."
          }`,
          quota: { used, limit, pro: isPro },
        },
        { status: 429 }
      );
    }

    const completion = await openai().chat.completions.create({
      model: MODELS.GRAMMAR,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: text },
      ],
      response_format: { type: "json_object" },
      max_tokens: 800,
      temperature: 0.2,
    });

    recordUsage(wallet, 1);

    const raw = completion.choices[0]?.message?.content || '{"issues":[]}';
    let parsed: { issues?: GrammarIssue[] };
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = { issues: [] };
    }

    // Filter to issues whose `original` is actually present in the input —
    // protects against hallucinated suggestions that can't be applied.
    const issues = (parsed.issues || []).filter((i) =>
      i?.original && text.includes(i.original)
    );

    return NextResponse.json(
      { issues },
      {
        headers: {
          "X-Quota-Used": String(used + 1),
          "X-Quota-Limit": String(limit),
          "X-Pro": isPro ? "1" : "0",
        },
      }
    );
  } catch (err) {
    console.error("ai/grammar error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Grammar check failed" },
      { status: 500 }
    );
  }
}

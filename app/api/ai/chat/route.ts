import { NextRequest, NextResponse } from "next/server";
import { openai, MODELS } from "@/lib/ai/openai-client";
import { checkProStatus } from "@/lib/ai/pro-status";
import { quotaCheck, recordUsage } from "@/lib/ai/quota";
import { AI_DAILY_FREE_LIMIT, AI_DAILY_PRO_LIMIT } from "@/lib/constants";

export const runtime = "nodejs";

interface Msg {
  role: "user" | "assistant" | "system";
  content: string;
}

const SYSTEM_PROMPT = `You are PENSUI Writer, a content-writing agent embedded in a decentralized publishing platform on Sui.

Your job is to PRODUCE PROSE the user can paste straight into their article — not chatty answers about writing.

Core behaviors:

- When the user asks for a section / paragraph / intro / conclusion / outline / title, return the actual text, ready to use. No "Here's a draft:" preambles, no "Hope this helps", no markdown wrappers — just clean prose with paragraph breaks (blank lines).
- When the user shares a SELECTED passage and asks to rewrite / tighten / expand / change tone, return ONLY the revised passage. Do not add commentary unless they explicitly ask for it.
- When the user asks an open question, answer briefly first, then immediately offer a paragraph they can use. Maximum 200 words for explanations.
- Default to a professional, opinionated, declarative voice — short sentences, concrete claims, no hedging filler ("It's worth noting that", "In today's fast-paced world", etc.).
- Use real terms when writing about Sui, Walrus, DeepBook, Tatum, zkLogin, Kiosk, Move, PTBs, objects, slivers, CLOB, etc. If you're not certain about a technical claim, say so in one short line at the end ("Verify the bps figure"), don't fabricate.
- Never use em-dashes (—). Use commas, periods, colons, or parentheses instead.
- Never include lorem ipsum, placeholder names, or "[fill in]" markers — write actual content.

Output format: plain text. Paragraph breaks separated by a single blank line. Headings allowed as a leading line in Title Case followed by a blank line, no "#" or "##".`;

export async function POST(req: NextRequest) {
  try {
    const wallet = req.headers.get("x-wallet-address") || "";
    if (!wallet || !wallet.startsWith("0x")) {
      return NextResponse.json(
        { error: "Connect your wallet to use the AI assistant." },
        { status: 401 }
      );
    }

    const body = (await req.json()) as {
      messages: Msg[];
      selection?: string;
    };
    if (!Array.isArray(body.messages) || body.messages.length === 0) {
      return NextResponse.json(
        { error: "messages array is required" },
        { status: 400 }
      );
    }

    const isPro = await checkProStatus(wallet);
    const limit = isPro ? AI_DAILY_PRO_LIMIT : AI_DAILY_FREE_LIMIT;
    const { allowed, used } = quotaCheck(wallet, limit);
    if (!allowed) {
      return NextResponse.json(
        {
          error: isPro
            ? `Daily Pro limit reached (${limit}). Resets at UTC midnight.`
            : `Daily free limit reached (${limit}). Upgrade to Pro for ${AI_DAILY_PRO_LIMIT}/day.`,
          quota: { used, limit, pro: isPro },
        },
        { status: 429 }
      );
    }

    const model = isPro ? MODELS.CHAT_PRO : MODELS.CHAT_FREE;

    // Inject the user's selected text (if any) as additional context on the
    // last user turn.
    const messages: Msg[] = [{ role: "system", content: SYSTEM_PROMPT }];
    for (let i = 0; i < body.messages.length; i++) {
      const m = body.messages[i];
      if (i === body.messages.length - 1 && m.role === "user" && body.selection) {
        messages.push({
          role: "user",
          content: `[SELECTED TEXT]\n${body.selection.slice(0, 2000)}\n[/SELECTED TEXT]\n\n${m.content}`,
        });
      } else {
        messages.push(m);
      }
    }

    const stream = await openai().chat.completions.create({
      model,
      messages,
      stream: true,
      max_tokens: 600,
      temperature: 0.7,
    });

    recordUsage(wallet, 1);

    // Stream as plain text chunks (no SSE framing — keeps client simple).
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const delta = chunk.choices?.[0]?.delta?.content;
            if (delta) controller.enqueue(encoder.encode(delta));
          }
          controller.close();
        } catch (err) {
          controller.enqueue(
            encoder.encode(
              `\n\n[stream error: ${err instanceof Error ? err.message : String(err)}]`
            )
          );
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-Quota-Used": String(used + 1),
        "X-Quota-Limit": String(limit),
        "X-Pro": isPro ? "1" : "0",
      },
    });
  } catch (err) {
    console.error("ai/chat error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Chat failed" },
      { status: 500 }
    );
  }
}

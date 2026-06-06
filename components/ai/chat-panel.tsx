"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Sparkles, RotateCcw, Copy, Check, PlusCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

interface ChatPanelProps {
  wallet: string | null;
  selection: string;
  onError: (msg: string) => void;
  onInsertToArticle?: (text: string) => void;
}

export function ChatPanel({
  wallet,
  selection,
  onError,
  onInsertToArticle,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, streaming]);

  async function send() {
    const text = input.trim();
    if (!text || streaming) return;
    if (!wallet) {
      onError("Connect your wallet to chat with the AI.");
      return;
    }

    const next: ChatMsg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setStreaming(true);

    // Insert an empty assistant message we'll stream into
    setMessages((m) => [...m, { role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-wallet-address": wallet,
        },
        body: JSON.stringify({
          messages: next,
          selection: selection || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(err.error || `Chat failed (${res.status})`);
      }
      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response body");
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        acc += chunk;
        setMessages((m) => {
          const copy = [...m];
          copy[copy.length - 1] = { role: "assistant", content: acc };
          return copy;
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Chat failed";
      onError(msg);
      setMessages((m) => m.slice(0, -1));
    } finally {
      setStreaming(false);
    }
  }

  function reset() {
    setMessages([]);
    setInput("");
  }

  return (
    <div className="flex flex-col h-full">
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0"
      >
        {messages.length === 0 && (
          <div className="text-center py-12 px-2">
            <div className="w-10 h-10 mx-auto mb-4 rounded-full bg-[color:var(--accent-soft)] border border-[color:var(--accent-border)] flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-[color:var(--accent-hover)]" strokeWidth={1.75} />
            </div>
            <p className="text-[13.5px] text-[color:var(--fg-secondary)] mb-2 font-medium">
              Ask the assistant
            </p>
            <p className="text-[12.5px] text-[color:var(--fg-muted)] leading-relaxed">
              Get help with structure, clarity, titles, fact-checks, or anything writing-related.
              Highlight text in the editor to send it as context.
            </p>
          </div>
        )}

        {messages.map((m, i) => {
          const isLast = i === messages.length - 1;
          const isStreaming = streaming && isLast && m.role === "assistant";
          return (
            <ChatBubble
              key={i}
              role={m.role}
              content={m.content}
              streaming={isStreaming}
              showActions={m.role === "assistant" && !isStreaming && m.content.length > 0}
              onInsert={
                onInsertToArticle
                  ? () => onInsertToArticle(m.content)
                  : undefined
              }
            />
          );
        })}
      </div>

      {selection && (
        <div className="mx-4 mb-2 px-3 py-2 rounded-md border border-[color:var(--accent-border)] bg-[color:var(--accent-soft)]">
          <p className="text-[10.5px] mono uppercase tracking-[0.16em] text-[color:var(--accent-hover)] mb-1">
            attached selection
          </p>
          <p className="text-[12px] text-[color:var(--fg-secondary)] line-clamp-2">
            {selection.length > 200 ? selection.slice(0, 200) + "…" : selection}
          </p>
        </div>
      )}

      <div className="border-t border-[color:var(--border)] p-3 flex items-end gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder={
            wallet ? "Ask anything about your draft…" : "Connect wallet to chat"
          }
          disabled={!wallet || streaming}
          rows={1}
          className="flex-1 resize-none bg-[color:var(--surface)] border border-[color:var(--border)] rounded-md text-[13.5px] leading-relaxed px-3 py-2 outline-none focus:border-[color:var(--accent)] transition-colors max-h-32"
        />
        {messages.length > 0 && (
          <button
            type="button"
            onClick={reset}
            disabled={streaming}
            title="Clear chat"
            className="w-9 h-9 rounded-md border border-[color:var(--border)] text-[color:var(--fg-muted)] hover:text-[color:var(--fg)] hover:border-[color:var(--border-strong)] inline-flex items-center justify-center transition-colors shrink-0 disabled:opacity-50"
          >
            <RotateCcw className="w-3.5 h-3.5" strokeWidth={2} />
          </button>
        )}
        <button
          type="button"
          onClick={send}
          disabled={!input.trim() || streaming || !wallet}
          className={cn(
            "w-9 h-9 rounded-md inline-flex items-center justify-center transition-colors shrink-0",
            input.trim() && wallet && !streaming
              ? "bg-[color:var(--accent)] hover:bg-[color:var(--accent-hover)] text-white"
              : "bg-[color:var(--surface)] text-[color:var(--fg-subtle)] border border-[color:var(--border)] cursor-not-allowed"
          )}
        >
          <Send className="w-3.5 h-3.5" strokeWidth={2} />
        </button>
      </div>
    </div>
  );
}

function ChatBubble({
  role,
  content,
  streaming,
  showActions,
  onInsert,
}: {
  role: "user" | "assistant";
  content: string;
  streaming: boolean;
  showActions?: boolean;
  onInsert?: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      /* ignore */
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className={cn(
        "flex flex-col",
        role === "user" ? "items-end" : "items-start"
      )}
    >
      <div
        className={cn(
          "max-w-[90%] rounded-lg px-3.5 py-2.5 text-[13.5px] leading-relaxed whitespace-pre-wrap break-words",
          role === "user"
            ? "bg-[color:var(--accent)] text-white"
            : "bg-[color:var(--surface)] border border-[color:var(--border)] text-[color:var(--fg)]"
        )}
      >
        {content}
        {streaming && (
          <span className="inline-block w-1.5 h-3.5 ml-0.5 align-middle bg-[color:var(--accent-hover)] animate-pulse" />
        )}
      </div>

      {showActions && (
        <div className="flex items-center gap-1.5 mt-1.5">
          <button
            type="button"
            onClick={copy}
            className="inline-flex items-center gap-1 h-6 px-2 rounded-md text-[11px] mono uppercase tracking-[0.14em] text-[color:var(--fg-muted)] hover:text-[color:var(--fg)] hover:bg-[color:var(--surface)] transition-colors"
            title="Copy to clipboard"
          >
            {copied ? (
              <Check className="w-3 h-3 text-[color:var(--success)]" strokeWidth={2} />
            ) : (
              <Copy className="w-3 h-3" strokeWidth={2} />
            )}
            {copied ? "copied" : "copy"}
          </button>
          {onInsert && (
            <button
              type="button"
              onClick={onInsert}
              className="inline-flex items-center gap-1 h-6 px-2 rounded-md text-[11px] mono uppercase tracking-[0.14em] text-[color:var(--accent-hover)] hover:text-[color:var(--fg)] hover:bg-[color:var(--accent-soft)] transition-colors"
              title="Append to article"
            >
              <PlusCircle className="w-3 h-3" strokeWidth={2} />
              add to article
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
}

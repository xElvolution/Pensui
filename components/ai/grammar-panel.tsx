"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertCircle, RefreshCw, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface GrammarIssue {
  type: "grammar" | "spelling" | "clarity" | "fact";
  original: string;
  suggestion: string;
  explanation: string;
}

interface GrammarPanelProps {
  wallet: string | null;
  plainText: string; // current article body as plain text
  onApply: (original: string, suggestion: string) => void;
  onError: (msg: string) => void;
}

const TYPE_LABELS: Record<GrammarIssue["type"], string> = {
  grammar: "grammar",
  spelling: "spelling",
  clarity: "clarity",
  fact: "fact-check",
};

const TYPE_TONES: Record<GrammarIssue["type"], string> = {
  grammar: "text-[color:var(--accent-hover)]",
  spelling: "text-[color:var(--warning)]",
  clarity: "text-[color:var(--fg-secondary)]",
  fact: "text-[color:var(--error)]",
};

export function GrammarPanel({
  wallet,
  plainText,
  onApply,
  onError,
}: GrammarPanelProps) {
  const [issues, setIssues] = useState<GrammarIssue[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastCheckedText, setLastCheckedText] = useState("");
  const [acceptedKeys, setAcceptedKeys] = useState<Set<string>>(new Set());

  const runCheck = useCallback(
    async (text: string) => {
      if (!wallet) return;
      if (text.trim().length < 20) {
        setIssues([]);
        setLastCheckedText(text);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch("/api/ai/grammar", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-wallet-address": wallet,
          },
          body: JSON.stringify({ text: text.slice(0, 4000) }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
          throw new Error(err.error || `Grammar check failed (${res.status})`);
        }
        const data = (await res.json()) as { issues: GrammarIssue[] };
        setIssues(data.issues || []);
        setLastCheckedText(text);
        setAcceptedKeys(new Set());
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Grammar check failed";
        onError(msg);
      } finally {
        setLoading(false);
      }
    },
    [wallet, onError]
  );

  // Debounce: re-check 2.5s after typing stops, only if the text has changed
  // meaningfully.
  useEffect(() => {
    if (!wallet) return;
    if (plainText === lastCheckedText) return;
    const handle = setTimeout(() => {
      runCheck(plainText);
    }, 2500);
    return () => clearTimeout(handle);
  }, [plainText, lastCheckedText, wallet, runCheck]);

  function handleApply(issue: GrammarIssue) {
    const key = `${issue.original}|${issue.suggestion}`;
    onApply(issue.original, issue.suggestion);
    setAcceptedKeys((s) => new Set(s).add(key));
  }

  if (!wallet) {
    return (
      <div className="text-center py-12 px-4">
        <p className="text-[13px] text-[color:var(--fg-muted)]">
          Connect your wallet to enable grammar checks.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b border-[color:var(--border)] flex items-center justify-between">
        <div className="flex items-center gap-2">
          {loading ? (
            <RefreshCw
              className="w-3.5 h-3.5 text-[color:var(--accent-hover)] animate-spin"
              strokeWidth={2}
            />
          ) : issues.length === 0 ? (
            <CheckCircle2
              className="w-3.5 h-3.5 text-[color:var(--success)]"
              strokeWidth={2}
            />
          ) : (
            <AlertCircle
              className="w-3.5 h-3.5 text-[color:var(--warning)]"
              strokeWidth={2}
            />
          )}
          <span className="text-[12px] mono uppercase tracking-[0.18em] text-[color:var(--fg-muted)]">
            {loading
              ? "checking…"
              : issues.length === 0
              ? "looking good"
              : `${issues.length} ${issues.length === 1 ? "issue" : "issues"}`}
          </span>
        </div>
        <button
          type="button"
          onClick={() => runCheck(plainText)}
          disabled={loading || plainText.trim().length < 20}
          title="Re-check now"
          className="w-7 h-7 rounded-md text-[color:var(--fg-muted)] hover:text-[color:var(--fg)] hover:bg-[color:var(--surface)] inline-flex items-center justify-center transition-colors disabled:opacity-40"
        >
          <RefreshCw className="w-3.5 h-3.5" strokeWidth={2} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 min-h-0">
        {plainText.trim().length < 20 && !loading && (
          <p className="text-[12.5px] text-[color:var(--fg-muted)] px-2 py-6 text-center">
            Write at least 20 characters to start the grammar check.
          </p>
        )}

        {!loading && plainText.trim().length >= 20 && issues.length === 0 && (
          <p className="text-[12.5px] text-[color:var(--fg-muted)] px-2 py-6 text-center">
            No issues found. Nice writing.
          </p>
        )}

        <AnimatePresence initial={false}>
          {issues.map((issue, i) => {
            const key = `${issue.original}|${issue.suggestion}`;
            const accepted = acceptedKeys.has(key);
            return (
              <motion.div
                key={`${i}-${key}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: accepted ? 0.55 : 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18 }}
                className={cn(
                  "rounded-md border p-3 bg-[color:var(--surface)]",
                  accepted
                    ? "border-[color:var(--success)]/30"
                    : "border-[color:var(--border)] hover:border-[color:var(--border-strong)]"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={cn(
                      "text-[10.5px] mono uppercase tracking-[0.18em] font-semibold",
                      TYPE_TONES[issue.type]
                    )}
                  >
                    {TYPE_LABELS[issue.type]}
                  </span>
                  {accepted && (
                    <span className="inline-flex items-center gap-1 text-[10.5px] mono uppercase tracking-[0.16em] text-[color:var(--success)]">
                      <Check className="w-3 h-3" strokeWidth={2.5} />
                      applied
                    </span>
                  )}
                </div>
                <p className="text-[12.5px] mb-1 leading-snug">
                  <span className="line-through text-[color:var(--fg-muted)]">
                    {issue.original}
                  </span>
                  <span className="mx-1.5 text-[color:var(--fg-subtle)]">→</span>
                  <span className="text-[color:var(--fg)] font-medium">
                    {issue.suggestion}
                  </span>
                </p>
                <p className="text-[11.5px] text-[color:var(--fg-muted)] leading-snug mb-2.5">
                  {issue.explanation}
                </p>
                {!accepted && (
                  <button
                    type="button"
                    onClick={() => handleApply(issue)}
                    className="text-[11.5px] mono uppercase tracking-[0.16em] text-[color:var(--accent-hover)] hover:text-[color:var(--fg)] transition-colors font-semibold"
                  >
                    apply →
                  </button>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

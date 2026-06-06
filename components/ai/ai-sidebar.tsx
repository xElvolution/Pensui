"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, SpellCheck, ChevronRight, X, AlertCircle } from "lucide-react";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { ChatPanel } from "./chat-panel";
import { GrammarPanel } from "./grammar-panel";
import { ProBadge } from "./pro-badge";
import { cn } from "@/lib/utils";

interface AiSidebarProps {
  selection: string;
  plainText: string;
  onApplyEdit: (original: string, suggestion: string) => void;
  onInsertToArticle: (text: string) => void;
}

type Tab = "chat" | "grammar";

export function AiSidebar({
  selection,
  plainText,
  onApplyEdit,
  onInsertToArticle,
}: AiSidebarProps) {
  const account = useCurrentAccount();
  const [open, setOpen] = useState(true);
  const [tab, setTab] = useState<Tab>("chat");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 5000);
    return () => clearTimeout(t);
  }, [error]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed top-1/2 right-4 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-[color:var(--accent)] hover:bg-[color:var(--accent-hover)] text-white inline-flex items-center justify-center transition-all shadow-lg"
        style={{
          boxShadow:
            "0 0 0 1px var(--accent-border), 0 16px 40px -12px rgba(124,58,237,0.55)",
        }}
        title="Open AI assistant"
      >
        <Sparkles className="w-4 h-4" strokeWidth={2} />
      </button>
    );
  }

  return (
    <motion.aside
      initial={{ x: 24, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 24, opacity: 0 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="hidden lg:flex flex-col fixed top-20 bottom-6 right-4 w-[360px] z-30 rounded-xl border border-[color:var(--border)] bg-[color:var(--card)] overflow-hidden"
      style={{
        boxShadow: "0 24px 60px -16px rgba(0,0,0,0.6)",
      }}
    >
      <div className="px-4 py-3 border-b border-[color:var(--border)] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles
            className="w-3.5 h-3.5 text-[color:var(--accent-hover)]"
            strokeWidth={2}
          />
          <p className="text-[12px] mono uppercase tracking-[0.18em] text-[color:var(--fg-secondary)] font-semibold">
            assistant
          </p>
          {account && <ProBadge wallet={account.address} />}
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          title="Collapse"
          className="w-7 h-7 rounded-md text-[color:var(--fg-muted)] hover:text-[color:var(--fg)] hover:bg-[color:var(--surface)] inline-flex items-center justify-center transition-colors"
        >
          <ChevronRight className="w-3.5 h-3.5" strokeWidth={2} />
        </button>
      </div>

      <div className="flex border-b border-[color:var(--border)] shrink-0">
        <TabButton
          active={tab === "chat"}
          onClick={() => setTab("chat")}
          icon={<Sparkles className="w-3.5 h-3.5" strokeWidth={2} />}
          label="Chat"
        />
        <TabButton
          active={tab === "grammar"}
          onClick={() => setTab("grammar")}
          icon={<SpellCheck className="w-3.5 h-3.5" strokeWidth={2} />}
          label="Grammar"
        />
      </div>

      <div className="flex-1 min-h-0 relative">
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="absolute top-2 left-2 right-2 z-10 px-3 py-2 rounded-md bg-[color:var(--error)]/12 border border-[color:var(--error)]/30 flex items-start gap-2"
            >
              <AlertCircle
                className="w-3.5 h-3.5 mt-0.5 shrink-0 text-[color:var(--error)]"
                strokeWidth={2}
              />
              <p className="text-[12px] text-[color:var(--error)] leading-relaxed">
                {error}
              </p>
              <button
                type="button"
                onClick={() => setError(null)}
                className="text-[color:var(--error)] opacity-70 hover:opacity-100 shrink-0"
              >
                <X className="w-3 h-3" strokeWidth={2} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {tab === "chat" ? (
          <ChatPanel
            wallet={account?.address || null}
            selection={selection}
            onError={setError}
            onInsertToArticle={onInsertToArticle}
          />
        ) : (
          <GrammarPanel
            wallet={account?.address || null}
            plainText={plainText}
            onApply={onApplyEdit}
            onError={setError}
          />
        )}
      </div>
    </motion.aside>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex-1 h-10 inline-flex items-center justify-center gap-1.5 text-[12.5px] font-medium transition-colors relative",
        active
          ? "text-[color:var(--fg)]"
          : "text-[color:var(--fg-muted)] hover:text-[color:var(--fg-secondary)]"
      )}
    >
      {icon}
      {label}
      {active && (
        <motion.div
          layoutId="ai-tab-underline"
          className="absolute bottom-0 left-0 right-0 h-[2px] bg-[color:var(--accent-hover)]"
        />
      )}
    </button>
  );
}

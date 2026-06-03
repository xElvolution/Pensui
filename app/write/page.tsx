"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCurrentAccount, useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { TipTapEditor } from "@/components/editor/tiptap-editor";
import { buildPublishTx } from "@/lib/contracts";
import { CONTENT_TYPES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Send,
  Sparkles,
  BookOpen,
  Lock,
  CheckCircle2,
  AlertCircle,
  Wallet,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

type PublishStatus = "idle" | "uploading" | "signing" | "success" | "error";

interface ToggleRowProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  enabled: boolean;
  onToggle: () => void;
  priceInput?: React.ReactNode;
}

function ToggleRow({ icon, title, subtitle, enabled, onToggle, priceInput }: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <div className="flex items-start gap-3 min-w-0">
        <div className="w-8 h-8 rounded-md bg-[color:var(--surface)] border border-[color:var(--border)] flex items-center justify-center text-[color:var(--accent-hover)] shrink-0">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-[14px] font-semibold">{title}</p>
          <p className="text-[12.5px] text-[color:var(--fg-muted)] leading-snug">
            {subtitle}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        {enabled && priceInput}
        <button
          type="button"
          onClick={onToggle}
          className={cn(
            "relative w-10 h-6 rounded-full transition-colors duration-200",
            enabled ? "bg-[color:var(--accent)]" : "bg-[color:var(--border-strong)]"
          )}
          aria-pressed={enabled}
        >
          <span
            className={cn(
              "absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform duration-200",
              enabled ? "translate-x-[18px]" : "translate-x-0.5"
            )}
          />
        </button>
      </div>
    </div>
  );
}

export default function WritePage() {
  const account = useCurrentAccount();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");

  const [mintEnabled, setMintEnabled] = useState(false);
  const [mintPrice, setMintPrice] = useState("1");
  const [readPriceEnabled, setReadPriceEnabled] = useState(false);
  const [readPrice, setReadPrice] = useState("0.5");
  const [subscriptionRequired, setSubscriptionRequired] = useState(false);

  const [status, setStatus] = useState<PublishStatus>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const canPublish =
    account && title.trim() && content && (status === "idle" || status === "error");

  async function handlePublish() {
    if (!canPublish) return;

    try {
      setStatus("uploading");
      setErrorMsg("");

      const articleData = {
        title,
        description,
        content,
        author: account!.address,
        createdAt: Date.now(),
      };

      const res = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(articleData),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to upload to Walrus");
      }

      const { blobId } = await res.json();

      setStatus("signing");

      const tx = buildPublishTx({
        blobId,
        title,
        description,
        contentType: CONTENT_TYPES.ARTICLE,
        mintPrice: mintEnabled ? parseFloat(mintPrice) || 0 : 0,
        readPrice: readPriceEnabled ? parseFloat(readPrice) || 0 : 0,
        subscriptionRequired,
      });

      await signAndExecute({ transaction: tx });

      setStatus("success");
      setTimeout(() => router.push("/explore"), 1600);
    } catch (err: unknown) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Publishing failed");
    }
  }

  if (!account) {
    return (
      <div className="pt-32 pb-24 container-page">
        <EmptyState
          icon={<Wallet className="w-7 h-7" strokeWidth={1.5} />}
          title="Connect your wallet"
          description="Sign in with any Sui wallet to start publishing on PENSUI."
        />
      </div>
    );
  }

  return (
    <div className="pt-24 pb-24">
      <div className="container-page max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <p className="text-[12px] mono text-[color:var(--accent-hover)] uppercase tracking-wider mb-4">
            New article
          </p>

          <input
            type="text"
            placeholder="Article title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-transparent border-0 outline-none text-[clamp(1.75rem,4vw,2.5rem)] font-bold tracking-tight placeholder:text-[color:var(--fg-subtle)] mb-3"
          />

          <input
            type="text"
            placeholder="One-line description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-transparent border-0 outline-none text-[17px] text-[color:var(--fg-secondary)] placeholder:text-[color:var(--fg-subtle)] mb-10"
          />

          <TipTapEditor content={content} onChange={setContent} />

          <div className="card mt-8">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-[15px] font-semibold">Monetization</h3>
              <span className="text-[12px] mono text-[color:var(--fg-muted)] uppercase tracking-wider">
                Optional
              </span>
            </div>
            <p className="text-[13px] text-[color:var(--fg-muted)] mb-2">
              Set your terms. You can leave everything off to publish for free.
            </p>
            <div className="divide-y divide-[color:var(--border)]">
              <ToggleRow
                icon={<Sparkles className="w-4 h-4" strokeWidth={1.75} />}
                title="Mint to collect"
                subtitle="Readers can mint your article as an NFT for permanent proof of support"
                enabled={mintEnabled}
                onToggle={() => setMintEnabled(!mintEnabled)}
                priceInput={
                  <PriceInput
                    value={mintPrice}
                    onChange={setMintPrice}
                  />
                }
              />
              <ToggleRow
                icon={<BookOpen className="w-4 h-4" strokeWidth={1.75} />}
                title="Pay per read"
                subtitle="Readers pay once, access forever"
                enabled={readPriceEnabled}
                onToggle={() => setReadPriceEnabled(!readPriceEnabled)}
                priceInput={
                  <PriceInput
                    value={readPrice}
                    onChange={setReadPrice}
                  />
                }
              />
              <ToggleRow
                icon={<Lock className="w-4 h-4" strokeWidth={1.75} />}
                title="Subscriber-only"
                subtitle="Only your active subscribers can read this article"
                enabled={subscriptionRequired}
                onToggle={() => setSubscriptionRequired(!subscriptionRequired)}
              />
            </div>
          </div>

          <div className="mt-8">
            <AnimatePresence mode="wait">
              {status === "success" ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-3 p-4 rounded-md border border-[color:rgba(16,185,129,0.24)] bg-[color:rgba(16,185,129,0.08)]"
                >
                  <CheckCircle2 className="w-5 h-5 text-[color:var(--success)] shrink-0" />
                  <div>
                    <p className="text-[14px] font-semibold text-[color:var(--success)]">
                      Published.
                    </p>
                    <p className="text-[13px] text-[color:var(--fg-secondary)]">
                      Stored on Walrus, recorded on Sui. Redirecting…
                    </p>
                  </div>
                </motion.div>
              ) : status === "error" ? (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-start gap-3 p-4 rounded-md border border-[color:rgba(239,68,68,0.24)] bg-[color:rgba(239,68,68,0.08)]"
                >
                  <AlertCircle className="w-5 h-5 text-[color:var(--error)] shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-[14px] font-semibold text-[color:var(--error)]">
                      Publishing failed
                    </p>
                    <p className="text-[13px] text-[color:var(--fg-secondary)] break-words">
                      {errorMsg}
                    </p>
                  </div>
                  <button
                    onClick={() => setStatus("idle")}
                    className="text-[13px] text-[color:var(--fg-muted)] hover:text-[color:var(--fg)] transition-colors"
                  >
                    Dismiss
                  </button>
                </motion.div>
              ) : (
                <motion.div
                  key="actions"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center justify-between gap-4"
                >
                  <p className="text-[12.5px] text-[color:var(--fg-muted)]">
                    {status === "uploading" && "Uploading to Walrus…"}
                    {status === "signing" && "Confirm in your wallet…"}
                    {status === "idle" &&
                      "Your article will be permanently stored on Walrus."}
                  </p>
                  <Button
                    onClick={handlePublish}
                    disabled={!canPublish}
                    loading={status === "uploading" || status === "signing"}
                    leftIcon={
                      status === "idle" ? <Send className="w-4 h-4" /> : undefined
                    }
                  >
                    Publish
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function PriceInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="inline-flex items-center gap-1.5 px-2.5 h-8 rounded-md bg-[color:var(--surface)] border border-[color:var(--border)]">
      <input
        type="number"
        step="0.1"
        min="0"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-14 bg-transparent border-0 outline-none text-[13px] mono text-right"
      />
      <span className="text-[11px] mono text-[color:var(--fg-muted)]">SUI</span>
    </div>
  );
}

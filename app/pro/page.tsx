"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useCurrentAccount,
  useSuiClient,
  useSignTransaction,
} from "@mysten/dapp-kit";
import { buildSubscribeTx } from "@/lib/contracts";
import {
  PRO_RECIPIENT,
  PRO_PRICE_SUI,
  PRO_DURATION_DAYS,
  AI_DAILY_FREE_LIMIT,
  AI_DAILY_PRO_LIMIT,
  PACKAGE_ID,
} from "@/lib/constants";
import { ConnectHero } from "@/components/wallet/connect-hero";
import { Button } from "@/components/ui/button";
import {
  Sparkles,
  Check,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Clock,
  Zap,
  X,
} from "lucide-react";
import Link from "next/link";

type Status = "idle" | "signing" | "success" | "error";

export default function ProPage() {
  const account = useCurrentAccount();
  const suiClient = useSuiClient();
  const { mutateAsync: signTransaction } = useSignTransaction();

  const [isPro, setIsPro] = useState(false);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);

  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (!account) {
      setLoadingStatus(false);
      return;
    }
    let cancelled = false;
    async function load() {
      try {
        const owned = await suiClient.getOwnedObjects({
          owner: account!.address,
          filter: {
            StructType: `${PACKAGE_ID}::subscription::Subscription`,
          },
          options: { showContent: true },
        });
        const now = Date.now();
        let bestExpiry = 0;
        for (const o of owned.data) {
          if (o.data?.content?.dataType !== "moveObject") continue;
          const f = o.data.content.fields as Record<string, unknown>;
          if (
            f.creator === PRO_RECIPIENT &&
            Number(f.expires_at) > now &&
            Number(f.expires_at) > bestExpiry
          ) {
            bestExpiry = Number(f.expires_at);
          }
        }
        if (!cancelled) {
          setIsPro(bestExpiry > 0);
          setExpiresAt(bestExpiry || null);
        }
      } catch {
        // leave defaults
      } finally {
        if (!cancelled) setLoadingStatus(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [account, suiClient]);

  async function handleSubscribe() {
    if (!account) return;
    setStatus("signing");
    setErrorMsg("");
    try {
      const tx = buildSubscribeTx({
        creatorAddress: PRO_RECIPIENT,
        amount: PRO_PRICE_SUI,
        durationDays: PRO_DURATION_DAYS,
      });
      const { bytes, signature } = await signTransaction({
        transaction: tx,
        chain: "sui:testnet",
      });
      const res = await fetch("/api/submit-tx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bytes, signature }),
      });
      if (!res.ok) {
        const err = await res
          .json()
          .catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(err.error || "Subscribe failed");
      }
      setStatus("success");
      const newExpiry = Date.now() + PRO_DURATION_DAYS * 24 * 60 * 60 * 1000;
      setIsPro(true);
      setExpiresAt(newExpiry);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatus("error");
      setErrorMsg(
        msg.toLowerCase().includes("reject")
          ? "Transaction rejected in wallet."
          : msg
      );
    }
  }

  if (!account) {
    return <ConnectHero />;
  }

  return (
    <div className="pt-24 pb-24">
      <div className="container-page max-w-3xl">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Link
            href="/explore"
            className="inline-flex items-center gap-1.5 text-[13px] mono text-[color:var(--fg-muted)] hover:text-[color:var(--fg)] transition-colors mb-8"
          >
            <ArrowLeft className="w-3.5 h-3.5" strokeWidth={2} />
            back to explore
          </Link>

          <p className="text-[12px] mono uppercase tracking-[0.2em] text-[color:var(--accent-hover)] mb-3">
            PENSUI Pro
          </p>
          <h1 className="text-h2 mb-3">
            Better AI for serious writers.
          </h1>
          <p className="text-body max-w-xl mb-10">
            10× the daily AI quota, the upgraded Content Agent for chat, all
            paid on-chain. Anchored in your wallet as a real Sui Subscription
            object.
          </p>

          {loadingStatus ? (
            <div className="h-72 rounded-xl bg-[color:var(--surface)] animate-pulse" />
          ) : isPro ? (
            <ActivePro
              expiresAt={expiresAt}
              onExtend={() => setConfirmOpen(true)}
              status={status}
              errorMsg={errorMsg}
            />
          ) : (
            <Upsell
              onSubscribe={() => setConfirmOpen(true)}
              status={status}
              errorMsg={errorMsg}
            />
          )}

        </motion.div>
      </div>

      <ConfirmModal
        open={confirmOpen}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          handleSubscribe();
        }}
        isExtend={isPro}
      />
    </div>
  );
}

function Upsell({
  onSubscribe,
  status,
  errorMsg,
}: {
  onSubscribe: () => void;
  status: Status;
  errorMsg: string;
}) {
  const signing = status === "signing";

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <PlanCard
        name="Free"
        price="0 SUI"
        active
        items={[
          `${AI_DAILY_FREE_LIMIT} AI requests / day`,
          "Standard Content Agent for chat & grammar",
          "Full writing experience",
          "Wallet-signed Walrus publishing",
        ]}
      />
      <PlanCard
        name="Pro"
        price={`${PRO_PRICE_SUI} SUI`}
        priceSuffix={`/ ${PRO_DURATION_DAYS} days`}
        primary
        items={[
          `${AI_DAILY_PRO_LIMIT} AI requests / day`,
          "Pro Content Agent (sharper, faster)",
          "✦ PRO badge on your profile",
          "Same grammar engine, higher limit",
        ]}
        cta={
          <div>
            <Button
              onClick={onSubscribe}
              loading={signing}
              disabled={signing}
              leftIcon={<Sparkles className="w-4 h-4" strokeWidth={2} />}
              className="w-full"
            >
              {signing ? "Confirm in wallet…" : `Subscribe for ${PRO_PRICE_SUI} SUI`}
            </Button>
            {status === "error" && (
              <p className="text-[12.5px] text-[color:var(--error)] mt-3 flex items-start gap-1.5">
                <AlertCircle
                  className="w-3.5 h-3.5 shrink-0 mt-0.5"
                  strokeWidth={2}
                />
                {errorMsg}
              </p>
            )}
          </div>
        }
      />
    </div>
  );
}

function ActivePro({
  expiresAt,
  onExtend,
  status,
  errorMsg,
}: {
  expiresAt: number | null;
  onExtend: () => void;
  status: Status;
  errorMsg: string;
}) {
  const daysLeft = expiresAt
    ? Math.max(0, Math.ceil((expiresAt - Date.now()) / (24 * 60 * 60 * 1000)))
    : 0;
  const signing = status === "signing";

  return (
    <div
      className="card !p-7 relative overflow-hidden"
      style={{
        boxShadow: "0 0 0 1px var(--accent-border), 0 32px 64px -20px rgba(124,58,237,0.4)",
      }}
    >
      <div
        aria-hidden
        className="absolute -top-24 -right-24 w-72 h-72 rounded-full pointer-events-none opacity-50"
        style={{
          background:
            "radial-gradient(closest-side, var(--accent-glow), transparent 70%)",
          filter: "blur(40px)",
        }}
      />
      <div className="relative">
        <AnimatePresence>
          {status === "success" && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-5 px-3 py-2 rounded-md border border-[color:var(--success)]/30 bg-[color:var(--success)]/10 inline-flex items-center gap-2"
            >
              <CheckCircle2
                className="w-4 h-4 text-[color:var(--success)]"
                strokeWidth={2}
              />
              <span className="text-[13px] text-[color:var(--success)] font-medium">
                {expiresAt ? "Extended on-chain." : "Pro activated."}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        <p className="text-[11px] mono uppercase tracking-[0.22em] text-[color:var(--accent-hover)] mb-2">
          active
        </p>
        <h2 className="text-h3 mb-1 inline-flex items-center gap-3">
          You're on
          <span
            className="inline-flex items-center gap-1 rounded-full px-3 h-8 mono text-[14px] font-bold tracking-[0.1em]"
            style={{
              background:
                "linear-gradient(135deg, var(--accent), var(--accent-hover))",
              color: "#fff",
            }}
          >
            ✦ PRO
          </span>
        </h2>
        <p className="text-[14px] text-[color:var(--fg-muted)] mb-6">
          {daysLeft > 0
            ? `${daysLeft} day${daysLeft !== 1 ? "s" : ""} remaining.`
            : "Subscription expired."}
        </p>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <Stat
            icon={<Zap className="w-3.5 h-3.5" strokeWidth={2} />}
            label="Daily AI quota"
            value={`${AI_DAILY_PRO_LIMIT} req`}
          />
          <Stat
            icon={<Clock className="w-3.5 h-3.5" strokeWidth={2} />}
            label="Renewal"
            value={
              expiresAt
                ? new Date(expiresAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                : "—"
            }
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            onClick={onExtend}
            loading={signing}
            disabled={signing}
            leftIcon={<Sparkles className="w-4 h-4" strokeWidth={2} />}
          >
            {signing
              ? "Confirm in wallet…"
              : `Extend ${PRO_DURATION_DAYS} days (${PRO_PRICE_SUI} SUI)`}
          </Button>
          <Link href="/write" className="inline-block">
            <Button variant="ghost">Start writing</Button>
          </Link>
        </div>

        {status === "error" && (
          <p className="text-[12.5px] text-[color:var(--error)] mt-4 flex items-start gap-1.5">
            <AlertCircle
              className="w-3.5 h-3.5 shrink-0 mt-0.5"
              strokeWidth={2}
            />
            {errorMsg}
          </p>
        )}
      </div>
    </div>
  );
}

function PlanCard({
  name,
  price,
  priceSuffix,
  items,
  primary,
  active,
  cta,
}: {
  name: string;
  price: string;
  priceSuffix?: string;
  items: string[];
  primary?: boolean;
  active?: boolean;
  cta?: React.ReactNode;
}) {
  return (
    <div
      className={
        "card !p-6 relative overflow-hidden " +
        (primary ? "border-[color:var(--accent-border)]" : "")
      }
      style={
        primary
          ? {
              boxShadow:
                "0 0 0 1px var(--accent-border), 0 32px 60px -20px rgba(124,58,237,0.35)",
            }
          : undefined
      }
    >
      {primary && (
        <div
          aria-hidden
          className="absolute -top-20 -right-20 w-64 h-64 rounded-full pointer-events-none opacity-50"
          style={{
            background:
              "radial-gradient(closest-side, var(--accent-glow), transparent 70%)",
            filter: "blur(40px)",
          }}
        />
      )}
      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <p
            className={
              "text-[11px] mono uppercase tracking-[0.2em] font-semibold " +
              (primary
                ? "text-[color:var(--accent-hover)]"
                : "text-[color:var(--fg-muted)]")
            }
          >
            {name}
          </p>
          {active && (
            <span className="text-[10.5px] mono uppercase tracking-[0.16em] text-[color:var(--fg-muted)] inline-flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--success)] pulse-dot" />
              current
            </span>
          )}
        </div>
        <div className="flex items-baseline gap-2 mb-5">
          <span className="text-[34px] font-bold tracking-tight leading-none">
            {price}
          </span>
          {priceSuffix && (
            <span className="text-[12.5px] text-[color:var(--fg-muted)] mono">
              {priceSuffix}
            </span>
          )}
        </div>
        <ul className="space-y-2.5 mb-6">
          {items.map((it) => (
            <li
              key={it}
              className="text-[13.5px] text-[color:var(--fg-secondary)] flex items-start gap-2 leading-snug"
            >
              <Check
                className={
                  "w-3.5 h-3.5 mt-1 shrink-0 " +
                  (primary
                    ? "text-[color:var(--accent-hover)]"
                    : "text-[color:var(--success)]")
                }
                strokeWidth={2.5}
              />
              {it}
            </li>
          ))}
        </ul>
        {cta}
      </div>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-[color:var(--border)] bg-[color:var(--surface)] p-3">
      <div className="flex items-center gap-1.5 mb-1.5 text-[color:var(--fg-muted)]">
        {icon}
        <span className="text-[10.5px] mono uppercase tracking-[0.16em]">
          {label}
        </span>
      </div>
      <p className="text-[15px] mono font-bold tracking-tight">{value}</p>
    </div>
  );
}

function ConfirmModal({
  open,
  onCancel,
  onConfirm,
  isExtend,
}: {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  isExtend: boolean;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
          onClick={onCancel}
        >
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md rounded-2xl border border-[color:var(--border-strong)] bg-[color:var(--card)] overflow-hidden"
            style={{
              boxShadow:
                "0 0 0 1px var(--accent-border), 0 40px 80px -24px rgba(124,58,237,0.35), 0 20px 40px -10px rgba(0,0,0,0.6)",
            }}
          >
            <div
              aria-hidden
              className="absolute -top-20 -right-20 w-64 h-64 rounded-full pointer-events-none opacity-60"
              style={{
                background:
                  "radial-gradient(closest-side, var(--accent-glow), transparent 70%)",
                filter: "blur(40px)",
              }}
            />
            <button
              type="button"
              onClick={onCancel}
              className="absolute top-4 right-4 z-10 w-8 h-8 rounded-md text-[color:var(--fg-muted)] hover:text-[color:var(--fg)] hover:bg-[color:var(--surface)] inline-flex items-center justify-center transition-colors"
              aria-label="Cancel"
            >
              <X className="w-4 h-4" strokeWidth={2} />
            </button>

            <div className="relative p-7">
              <p className="text-[11px] mono uppercase tracking-[0.22em] text-[color:var(--accent-hover)] mb-2">
                {isExtend ? "extend pro" : "subscribe to pro"}
              </p>
              <h3 className="text-[22px] font-bold tracking-tight leading-[1.1] mb-3">
                {isExtend
                  ? `Extend ${PRO_DURATION_DAYS} more days?`
                  : "Confirm your subscription"}
              </h3>
              <p className="text-[14px] text-[color:var(--fg-secondary)] leading-relaxed mb-5">
                You're about to pay{" "}
                <span className="font-semibold text-[color:var(--fg)]">
                  {PRO_PRICE_SUI} SUI
                </span>{" "}
                for{" "}
                <span className="font-semibold text-[color:var(--fg)]">
                  {PRO_DURATION_DAYS} days
                </span>{" "}
                of PENSUI Pro. Payment settles on Sui as a real Subscription
                object. Click confirm to sign in your wallet.
              </p>

              <div className="rounded-lg border border-[color:var(--border)] bg-[color:var(--surface)] p-3 mb-6 grid grid-cols-2 gap-2 text-[12.5px]">
                <span className="text-[color:var(--fg-muted)]">Plan</span>
                <span className="text-right font-medium">PENSUI Pro</span>
                <span className="text-[color:var(--fg-muted)]">Duration</span>
                <span className="text-right font-medium">
                  {PRO_DURATION_DAYS} days
                </span>
                <span className="text-[color:var(--fg-muted)]">Price</span>
                <span className="text-right font-mono font-semibold text-[color:var(--accent-hover)]">
                  {PRO_PRICE_SUI} SUI
                </span>
              </div>

              <div className="flex gap-2">
                <Button variant="ghost" onClick={onCancel} className="flex-1">
                  Cancel
                </Button>
                <Button onClick={onConfirm} className="flex-1">
                  Confirm
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

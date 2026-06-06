"use client";

import {
  useState,
  useEffect,
  use,
  useRef,
  type ReactNode,
} from "react";
import {
  motion,
  AnimatePresence,
  useScroll,
  useTransform,
} from "framer-motion";
import {
  useCurrentAccount,
  useSuiClient,
  useSignTransaction,
} from "@mysten/dapp-kit";
import { readFromWalrus } from "@/lib/walrus";
import {
  buildMintCollectTx,
  buildTipTx,
  buildPayToReadTx,
  buildSubscribeTx,
} from "@/lib/contracts";
import {
  PACKAGE_ID,
  formatSui,
  mistToSui,
  getWalrusUrl,
} from "@/lib/constants";
import { timeAgo, readingTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Mono } from "@/components/ui/mono";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sparkles,
  Heart,
  Share2,
  ExternalLink,
  Lock,
  CheckCircle2,
  ArrowLeft,
  X,
  Clock,
  Database,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface ContentFields {
  creator: string;
  blob_id: string;
  title: string;
  description: string;
  content_type: number;
  mint_price: string;
  read_price: string;
  subscription_required: boolean;
  total_mints: string;
  total_tips: string;
  total_earnings: string;
  created_at: string;
}

interface ArticleData {
  title: string;
  description: string;
  content: string;
  author: string;
  createdAt: number;
}

export default function ArticlePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const account = useCurrentAccount();
  const suiClient = useSuiClient();
  const { mutateAsync: signTransaction } = useSignTransaction();

  const [fields, setFields] = useState<ContentFields | null>(null);
  const [articleData, setArticleData] = useState<ArticleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [contentLoading, setContentLoading] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [mintStatus, setMintStatus] = useState<"idle" | "loading" | "success">("idle");
  const [tipStatus, setTipStatus] = useState<"idle" | "loading" | "success">("idle");
  const [tipAmount, setTipAmount] = useState("0.5");
  const [showTipModal, setShowTipModal] = useState(false);
  const [copied, setCopied] = useState(false);

  /**
   * Sign the tx with the wallet, submit through our server-side Tatum proxy.
   * Same pattern as profile-settings: avoids the wallet's internal RPC and
   * any browser CORS quirks. Throws on failure so callers can catch.
   */
  async function signAndSubmit(tx: import("@mysten/sui/transactions").Transaction) {
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
      const errBody = await res
        .json()
        .catch(() => ({ error: `HTTP ${res.status}` }));
      throw new Error(errBody.error || "Sui submission failed");
    }
  }


  useEffect(() => {
    loadContent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, account?.address]);

  async function loadContent() {
    setLoading(true);
    try {
      const obj = await suiClient.getObject({
        id,
        options: { showContent: true },
      });

      if (obj.data?.content?.dataType !== "moveObject") return;

      const f = obj.data.content.fields as unknown as ContentFields;
      setFields(f);

      // Load the Walrus blob eagerly so the paywall can show a real preview.
      // Gating is enforced by what we RENDER, not by whether we have the bytes.
      await loadArticleFromWalrus(f.blob_id);

      const isFree = Number(f.read_price) === 0 && !f.subscription_required;
      if (isFree) {
        setUnlocked(true);
        return;
      }

      // Gate check: does the current wallet already have access?
      if (!account) return; // not connected → show paywall preview

      if (f.subscription_required) {
        const hasActive = await hasActiveSubscription(
          account.address,
          f.creator
        );
        if (hasActive) {
          setUnlocked(true);
          return;
        }
      }

      if (Number(f.read_price) > 0) {
        const paid = await hasPaidToRead(account.address, id);
        if (paid) {
          setUnlocked(true);
          return;
        }
      }
    } catch (err) {
      console.error("Failed to load content:", err);
    } finally {
      setLoading(false);
    }
  }

  /** True if the wallet owns an unexpired Subscription for this creator. */
  async function hasActiveSubscription(
    walletAddress: string,
    creatorAddress: string
  ): Promise<boolean> {
    try {
      const owned = await suiClient.getOwnedObjects({
        owner: walletAddress,
        filter: {
          StructType: `${PACKAGE_ID}::subscription::Subscription`,
        },
        options: { showContent: true },
      });
      const now = Date.now();
      return owned.data.some((o) => {
        if (o.data?.content?.dataType !== "moveObject") return false;
        const sf = o.data.content.fields as Record<string, unknown>;
        return (
          sf.creator === creatorAddress &&
          Number(sf.expires_at) > now
        );
      });
    } catch {
      return false;
    }
  }

  /** True if a ContentRead event exists with this wallet as reader. */
  async function hasPaidToRead(
    walletAddress: string,
    contentId: string
  ): Promise<boolean> {
    try {
      const reads = await suiClient.queryEvents({
        query: { MoveEventType: `${PACKAGE_ID}::content::ContentRead` },
        limit: 200,
        order: "descending",
      });
      return reads.data.some((e) => {
        const p = e.parsedJson as Record<string, string> | null;
        return p?.content_id === contentId && p?.reader === walletAddress;
      });
    } catch {
      return false;
    }
  }

  async function loadArticleFromWalrus(blobId: string) {
    setContentLoading(true);
    try {
      const raw = await readFromWalrus(blobId);
      setArticleData(JSON.parse(raw) as ArticleData);
    } catch (err) {
      console.error("Walrus load failed:", err);
    } finally {
      setContentLoading(false);
    }
  }

  async function handleMint() {
    if (!fields || mintStatus !== "idle") return;
    setMintStatus("loading");
    try {
      const tx = buildMintCollectTx({
        contentId: id,
        mintPrice: mistToSui(Number(fields.mint_price)),
      });
      await signAndSubmit(tx);
      setMintStatus("success");
      setTimeout(() => setMintStatus("idle"), 3000);
    } catch {
      setMintStatus("idle");
    }
  }

  async function handleTip() {
    if (!fields || tipStatus !== "idle") return;
    setTipStatus("loading");
    try {
      const tx = buildTipTx({
        contentId: id,
        amount: parseFloat(tipAmount) || 0.5,
      });
      await signAndSubmit(tx);
      setTipStatus("success");
      setTimeout(() => {
        setShowTipModal(false);
        setTipStatus("idle");
      }, 1500);
    } catch {
      setTipStatus("idle");
    }
  }

  async function handlePayToRead() {
    if (!fields) return;
    try {
      const tx = buildPayToReadTx({
        contentId: id,
        readPrice: mistToSui(Number(fields.read_price)),
      });
      await signAndSubmit(tx);
      setUnlocked(true);
      await loadArticleFromWalrus(fields.blob_id);
    } catch (err) {
      console.error("Pay to read failed:", err);
    }
  }

  async function handleSubscribeToRead() {
    if (!fields) return;
    try {
      const tx = buildSubscribeTx({
        creatorAddress: fields.creator,
        amount: 1,
        durationDays: 30,
      });
      await signAndSubmit(tx);
      setUnlocked(true);
      await loadArticleFromWalrus(fields.blob_id);
    } catch (err) {
      console.error("Subscribe failed:", err);
    }
  }

  function handleShare() {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (loading) {
    return (
      <div className="pt-24 pb-24 container-page max-w-3xl">
        <Skeleton className="h-4 w-24 mb-8" />
        <Skeleton className="h-12 w-3/4 mb-4" />
        <Skeleton className="h-6 w-1/2 mb-8" />
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
    );
  }

  if (!fields) {
    return (
      <div className="pt-32 pb-24 container-page text-center">
        <p className="text-[color:var(--fg-muted)]">Article not found.</p>
        <Link
          href="/explore"
          className="inline-block mt-4 text-[14px] text-[color:var(--accent-hover)] hover:underline underline-offset-4"
        >
          Back to Explore
        </Link>
      </div>
    );
  }

  const isMintable = Number(fields.mint_price) > 0;

  return (
    <div className="pt-24 pb-24">
      <div className="container-page max-w-3xl">
        <Link
          href="/explore"
          className="inline-flex items-center gap-1.5 text-[13px] text-[color:var(--fg-muted)] hover:text-[color:var(--fg)] transition-colors mb-10"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Explore
        </Link>

        <motion.article
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex flex-wrap items-center gap-2 mb-6">
            {Number(fields.read_price) === 0 && !fields.subscription_required && (
              <Badge tone="success">Free</Badge>
            )}
            {fields.subscription_required && <Badge tone="warning">Subscribers</Badge>}
            {Number(fields.read_price) > 0 && (
              <Badge tone="neutral">{formatSui(Number(fields.read_price))}</Badge>
            )}
            {isMintable && (
              <Badge tone="accent">
                <Sparkles className="w-3 h-3" strokeWidth={2} />
                Mintable {formatSui(Number(fields.mint_price))}
              </Badge>
            )}
          </div>

          <h1 className="text-h1 mb-6">{fields.title}</h1>

          {fields.description && (
            <p className="text-[19px] text-[color:var(--fg-secondary)] leading-relaxed mb-10">
              {fields.description}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pb-10 mb-10 border-b border-[color:var(--border)]">
            <Link
              href={`/profile/${fields.creator}`}
              className="flex items-center gap-2.5 group"
            >
              <div className="w-7 h-7 rounded-full bg-[color:var(--accent-soft)] border border-[color:var(--accent-border)] flex items-center justify-center text-[11px] font-semibold text-[color:var(--accent-hover)]">
                {fields.creator.slice(2, 3).toUpperCase()}
              </div>
              <Mono value={fields.creator} truncate={4} className="text-[13px] group-hover:text-[color:var(--fg)] transition-colors" />
            </Link>
            <span className="flex items-center gap-1.5 text-[12px] text-[color:var(--fg-muted)]">
              <Clock className="w-3 h-3" />
              {timeAgo(Number(fields.created_at))}
            </span>
            {articleData && (
              <span className="text-[12px] text-[color:var(--fg-muted)]">
                {readingTime(articleData.content)}
              </span>
            )}
            <span className="flex items-center gap-1.5 text-[12px] text-[color:var(--fg-muted)]">
              <Sparkles className="w-3 h-3" />
              {fields.total_mints} mints
            </span>
            {fields.blob_id && (
              <a
                href={getWalrusUrl(fields.blob_id)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[12px] text-[color:var(--fg-muted)] hover:text-[color:var(--accent-hover)] transition-colors"
                title={fields.blob_id}
              >
                <Database className="w-3 h-3" />
                <span className="mono">walrus blob</span>
                <ExternalLink className="w-3 h-3 opacity-60" />
              </a>
            )}
          </div>

          {unlocked ? (
            contentLoading ? (
              <div className="space-y-3 py-8">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-11/12" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <p className="text-[12px] mono text-[color:var(--fg-muted)] mt-6">
                  Loading from Walrus…
                </p>
              </div>
            ) : articleData ? (
              <div className="prose">{renderContent(articleData.content)}</div>
            ) : (
              <p className="text-[color:var(--fg-muted)]">Failed to load content.</p>
            )
          ) : (
            <PreviewPaywall
              articleData={articleData}
              contentLoading={contentLoading}
              fields={fields}
              account={!!account}
              onPay={handlePayToRead}
              onSubscribe={handleSubscribeToRead}
            />
          )}

          <div className="flex flex-wrap items-center gap-3 mt-12 pt-8 border-t border-[color:var(--border)]">
            {isMintable && (
              <Button
                variant="primary"
                onClick={handleMint}
                disabled={!account || mintStatus !== "idle"}
                loading={mintStatus === "loading"}
                leftIcon={
                  mintStatus === "success" ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <Sparkles className="w-4 h-4" />
                  )
                }
              >
                {mintStatus === "success"
                  ? "Minted"
                  : `Mint ${formatSui(Number(fields.mint_price))}`}
              </Button>
            )}
            <Button
              variant="ghost"
              onClick={() => setShowTipModal(true)}
              disabled={!account}
              leftIcon={<Heart className="w-4 h-4" />}
            >
              Tip
            </Button>
            <Button
              variant="ghost"
              onClick={handleShare}
              leftIcon={
                copied ? <CheckCircle2 className="w-4 h-4" /> : <Share2 className="w-4 h-4" />
              }
            >
              {copied ? "Copied" : "Share"}
            </Button>
          </div>
        </motion.article>
      </div>

      <AnimatePresence>
        {showTipModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setShowTipModal(false)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="card-glass w-full sm:w-[420px] p-6 mx-0 sm:mx-4 rounded-t-2xl sm:rounded-xl"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2.5">
                  <Heart className="w-4 h-4 text-[color:var(--accent-hover)]" />
                  <h3 className="text-[15px] font-semibold">Tip the creator</h3>
                </div>
                <button
                  onClick={() => setShowTipModal(false)}
                  className="w-8 h-8 rounded-md text-[color:var(--fg-muted)] hover:text-[color:var(--fg)] hover:bg-[color:var(--surface)] inline-flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-4 gap-2 mb-4">
                {["0.1", "0.5", "1", "5"].map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setTipAmount(amt)}
                    className={cn(
                      "h-11 rounded-md text-[14px] font-medium mono transition-colors border",
                      tipAmount === amt
                        ? "bg-[color:var(--accent-soft)] text-[color:var(--accent-hover)] border-[color:var(--accent-border)]"
                        : "bg-[color:var(--surface)] text-[color:var(--fg-secondary)] border-[color:var(--border)] hover:border-[color:var(--border-strong)]"
                    )}
                  >
                    {amt}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 mb-6">
                <div className="flex-1 input flex items-center gap-2 pr-3">
                  <input
                    type="number"
                    step="0.1"
                    min="0.01"
                    value={tipAmount}
                    onChange={(e) => setTipAmount(e.target.value)}
                    className="flex-1 bg-transparent border-0 outline-none text-[14px] mono"
                  />
                  <span className="text-[12px] mono text-[color:var(--fg-muted)]">
                    SUI
                  </span>
                </div>
              </div>

              <Button
                onClick={handleTip}
                disabled={tipStatus === "loading"}
                loading={tipStatus === "loading"}
                className="w-full"
              >
                {tipStatus === "success"
                  ? "Sent. Thanks for supporting."
                  : `Send ${tipAmount} SUI`}
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PreviewPaywall({
  articleData,
  contentLoading,
  fields,
  account,
  onPay,
  onSubscribe,
}: {
  articleData: ArticleData | null;
  contentLoading: boolean;
  fields: ContentFields;
  account: boolean;
  onPay: () => void;
  onSubscribe: () => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: scrollRef,
    offset: ["start end", "end end"],
  });

  // 0%–35% of the section in view: no blur
  // 35%–100%: ramps to 8px blur
  const blurPx = useTransform(scrollYProgress, [0.35, 1], [0, 8]);
  const filter = useTransform(blurPx, (v) => `blur(${v}px)`);
  const opacity = useTransform(scrollYProgress, [0.55, 1], [1, 0.35]);
  const ctaOpacity = useTransform(scrollYProgress, [0.7, 1], [0, 1]);
  const ctaY = useTransform(scrollYProgress, [0.7, 1], [12, 0]);

  const [showCard, setShowCard] = useState(false);

  if (contentLoading) {
    return (
      <div className="space-y-3 py-8">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <p className="text-[12px] mono text-[color:var(--fg-muted)] mt-6">
          Loading from Walrus…
        </p>
      </div>
    );
  }

  if (!articleData) {
    return (
      <p className="text-[color:var(--fg-muted)]">Preview unavailable.</p>
    );
  }

  return (
    <>
      <div ref={scrollRef} className="relative">
        <motion.div
          className="prose pointer-events-none select-none will-change-[filter,opacity]"
          style={{ filter, opacity }}
        >
          {renderContent(articleData.content)}
        </motion.div>

        <motion.div
          className="flex flex-col items-center gap-3 mt-12 pt-6 border-t border-[color:var(--border)]"
          style={{ opacity: ctaOpacity, y: ctaY }}
        >
          <p className="text-[12px] mono uppercase tracking-[0.18em] text-[color:var(--fg-muted)]">
            keep reading
          </p>
          <button
            type="button"
            onClick={() => setShowCard(true)}
            className="group inline-flex items-center gap-2 h-12 px-7 rounded-full bg-[color:var(--accent)] text-white font-semibold text-[14.5px] tracking-tight transition-all duration-200 hover:bg-[color:var(--accent-hover)] hover:-translate-y-0.5"
            style={{
              boxShadow:
                "0 0 0 1px var(--accent-border), 0 22px 50px -16px rgba(124,58,237,0.45), 0 6px 18px -6px rgba(124,58,237,0.35)",
            }}
          >
            Continue reading
            <Lock className="w-3.5 h-3.5 opacity-90" strokeWidth={2} />
          </button>
        </motion.div>
      </div>

      <PaywallModal
        open={showCard}
        onClose={() => setShowCard(false)}
        fields={fields}
        account={account}
        onPay={() => {
          setShowCard(false);
          onPay();
        }}
        onSubscribe={() => {
          setShowCard(false);
          onSubscribe();
        }}
      />
    </>
  );
}

function PaywallModal({
  open,
  onClose,
  fields,
  account,
  onPay,
  onSubscribe,
}: {
  open: boolean;
  onClose: () => void;
  fields: ContentFields;
  account: boolean;
  onPay: () => void;
  onSubscribe: () => void;
}) {
  const hasPay = Number(fields.read_price) > 0;
  const hasSub = fields.subscription_required;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg rounded-2xl border border-[color:var(--border-strong)] bg-[color:var(--card)] overflow-hidden"
            style={{
              boxShadow:
                "0 0 0 1px var(--accent-border), 0 40px 80px -24px rgba(124,58,237,0.35), 0 20px 40px -10px rgba(0,0,0,0.6)",
            }}
          >
            <div
              aria-hidden
              className="absolute -top-20 -right-20 w-72 h-72 rounded-full pointer-events-none opacity-60"
              style={{
                background:
                  "radial-gradient(closest-side, var(--accent-glow), transparent 70%)",
                filter: "blur(40px)",
              }}
            />
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 z-10 w-8 h-8 rounded-md text-[color:var(--fg-muted)] hover:text-[color:var(--fg)] hover:bg-[color:var(--surface)] inline-flex items-center justify-center transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="relative p-7">
              <p className="text-[11px] mono uppercase tracking-[0.22em] text-[color:var(--accent-hover)] mb-3">
                premium content
              </p>
              <h3 className="text-[26px] font-bold tracking-tight leading-[1.1] mb-2">
                You've reached the wall.
              </h3>
              <p className="text-[14px] text-[color:var(--fg-secondary)] leading-relaxed mb-6">
                Support the writer to unlock the rest. Payment goes straight to
                their wallet, anchored on Sui.
              </p>

              {!account && (
                <div className="mb-5 p-3 rounded-md border border-[color:var(--warning)]/30 bg-[color:var(--warning)]/10">
                  <p className="text-[12.5px] text-[color:var(--warning)]">
                    Connect your wallet first.
                  </p>
                </div>
              )}

              <div
                className={
                  hasPay && hasSub
                    ? "grid grid-cols-2 gap-3"
                    : "grid grid-cols-1 gap-3"
                }
              >
                {hasPay && (
                  <PriceOption
                    label="Pay once"
                    price={formatSui(Number(fields.read_price))}
                    sub="Yours forever"
                    onClick={onPay}
                    primary
                    disabled={!account}
                  />
                )}
                {hasSub && (
                  <PriceOption
                    label="Subscribe"
                    price="1 SUI"
                    sub="30 days, all articles"
                    onClick={onSubscribe}
                    primary={!hasPay}
                    disabled={!account}
                  />
                )}
              </div>

              <div className="mt-5 space-y-2">
                {hasPay && (
                  <Button
                    onClick={onPay}
                    disabled={!account}
                    className="w-full"
                  >
                    Pay {formatSui(Number(fields.read_price))} to read
                  </Button>
                )}
                {hasSub && (
                  <Button
                    onClick={onSubscribe}
                    disabled={!account}
                    variant={hasPay ? "ghost" : "primary"}
                    className="w-full"
                  >
                    Subscribe for 1 SUI / 30 days
                  </Button>
                )}
              </div>

              <p className="text-[11.5px] mono text-[color:var(--fg-subtle)] mt-6 text-center">
                payments settle on sui · receipt on-chain
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function PriceOption({
  label,
  price,
  sub,
  onClick,
  primary,
  disabled,
}: {
  label: string;
  price: string;
  sub: string;
  onClick: () => void;
  primary?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "group relative text-left rounded-xl border p-4 transition-all duration-200 overflow-hidden",
        primary
          ? "border-[color:var(--accent-border)] bg-[color:var(--accent-soft)] hover:bg-[color:var(--accent-soft)] hover:-translate-y-0.5"
          : "border-[color:var(--border)] bg-[color:var(--surface)] hover:border-[color:var(--border-strong)] hover:-translate-y-0.5",
        disabled && "opacity-50 cursor-not-allowed hover:translate-y-0"
      )}
    >
      <p className="text-[11px] mono uppercase tracking-[0.18em] text-[color:var(--fg-muted)] mb-3">
        {label}
      </p>
      <p
        className={cn(
          "text-[22px] font-bold tracking-tight leading-none mb-1",
          primary
            ? "text-[color:var(--accent-hover)]"
            : "text-[color:var(--fg)]"
        )}
      >
        {price}
      </p>
      <p className="text-[12.5px] text-[color:var(--fg-muted)]">{sub}</p>
    </button>
  );
}

/**
 * Render only the first N "paragraph"-equivalent nodes from a TipTap JSON doc.
 * Used to surface a free preview before the paywall fade.
 */
function renderPreview(content: string, maxBlocks: number): ReactNode {
  try {
    const json = JSON.parse(content) as Record<string, unknown>;
    const docContent = Array.isArray(json.content)
      ? (json.content as Record<string, unknown>[])
      : [];
    const trimmed = docContent.slice(0, maxBlocks);
    return (
      <>
        {trimmed.map((node, i) => renderNode(node, i))}
      </>
    );
  } catch {
    // Plain text fallback: take first ~280 characters
    const text = content.slice(0, 280);
    return <p>{text}</p>;
  }
}

function renderContent(content: string): ReactNode {
  try {
    const json = JSON.parse(content);
    return renderNode(json, 0);
  } catch {
    return <p>{content}</p>;
  }
}

function renderNode(node: Record<string, unknown>, k: number): ReactNode {
  if (!node) return null;

  const children = Array.isArray(node.content)
    ? (node.content as Record<string, unknown>[]).map((c, i) => renderNode(c, i))
    : null;

  switch (node.type) {
    case "doc":
      return <div key={k}>{children}</div>;
    case "paragraph":
      return <p key={k}>{children}</p>;
    case "heading": {
      const level = ((node.attrs as Record<string, unknown>)?.level as number) || 1;
      if (level === 1) return <h1 key={k}>{children}</h1>;
      if (level === 2) return <h2 key={k}>{children}</h2>;
      return <h3 key={k}>{children}</h3>;
    }
    case "blockquote":
      return <blockquote key={k}>{children}</blockquote>;
    case "bulletList":
      return <ul key={k}>{children}</ul>;
    case "orderedList":
      return <ol key={k}>{children}</ol>;
    case "listItem":
      return <li key={k}>{children}</li>;
    case "codeBlock":
      return (
        <pre key={k}>
          <code>{children}</code>
        </pre>
      );
    case "image": {
      const attrs = node.attrs as Record<string, string>;
      // eslint-disable-next-line @next/next/no-img-element
      return <img key={k} src={attrs.src} alt={attrs.alt || ""} />;
    }
    case "text": {
      const marks = (node.marks as Record<string, unknown>[]) || [];
      let el: ReactNode = node.text as string;
      for (const m of marks) {
        if (m.type === "bold") el = <strong key={`b${k}`}>{el}</strong>;
        else if (m.type === "italic") el = <em key={`i${k}`}>{el}</em>;
        else if (m.type === "underline") el = <u key={`u${k}`}>{el}</u>;
        else if (m.type === "code") el = <code key={`c${k}`}>{el}</code>;
        else if (m.type === "link") {
          const href = ((m.attrs as Record<string, string>) || {}).href || "#";
          el = (
            <a key={`a${k}`} href={href} target="_blank" rel="noopener noreferrer">
              {el}
            </a>
          );
        }
      }
      return <span key={k}>{el}</span>;
    }
    default:
      return null;
  }
}

"use client";

import { useState, useEffect, use, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useCurrentAccount,
  useSuiClient,
  useSignAndExecuteTransaction,
} from "@mysten/dapp-kit";
import { readFromWalrus } from "@/lib/walrus";
import { buildMintCollectTx, buildTipTx, buildPayToReadTx } from "@/lib/contracts";
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
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();

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

  useEffect(() => {
    loadContent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function loadContent() {
    setLoading(true);
    try {
      if (id.startsWith("demo-")) {
        const demos = getDemoArticles();
        const demo = demos[id] || demos["demo-1"];
        setFields(demo.fields);
        setArticleData(demo.data);
        setUnlocked(true);
        setLoading(false);
        return;
      }

      const obj = await suiClient.getObject({
        id,
        options: { showContent: true },
      });

      if (obj.data?.content?.dataType === "moveObject") {
        const f = obj.data.content.fields as unknown as ContentFields;
        setFields(f);
        const isFree = Number(f.read_price) === 0 && !f.subscription_required;
        if (isFree) {
          setUnlocked(true);
          await loadArticleFromWalrus(f.blob_id);
        }
      }
    } catch (err) {
      console.error("Failed to load content:", err);
    } finally {
      setLoading(false);
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
      await signAndExecute({ transaction: tx });
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
      await signAndExecute({ transaction: tx });
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
      await signAndExecute({ transaction: tx });
      setUnlocked(true);
      await loadArticleFromWalrus(fields.blob_id);
    } catch (err) {
      console.error("Pay to read failed:", err);
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
            {fields.blob_id && !fields.blob_id.startsWith("demo") && (
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
            <div className="relative">
              <div className="prose opacity-30 pointer-events-none select-none">
                <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua…</p>
                <p>Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
              </div>

              <div className="absolute inset-x-0 bottom-0 top-1/3 bg-gradient-to-b from-transparent via-[color:var(--bg)] to-[color:var(--bg)]" />

              <div className="relative -mt-32 card max-w-md mx-auto text-center">
                <div className="w-12 h-12 mx-auto mb-5 rounded-full bg-[color:var(--accent-soft)] border border-[color:var(--accent-border)] flex items-center justify-center">
                  <Lock className="w-5 h-5 text-[color:var(--accent-hover)]" strokeWidth={1.75} />
                </div>
                <h3 className="text-[18px] font-semibold mb-2">Premium content</h3>
                <p className="text-[14px] text-[color:var(--fg-muted)] mb-6">
                  {Number(fields.read_price) > 0
                    ? `Unlock this article for ${formatSui(Number(fields.read_price))}. Yours forever, on-chain.`
                    : "Subscribe to this creator to access this content."}
                </p>
                {Number(fields.read_price) > 0 && (
                  <Button onClick={handlePayToRead} className="w-full">
                    Pay {formatSui(Number(fields.read_price))} to read
                  </Button>
                )}
              </div>
            </div>
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

function getDemoArticles(): Record<string, { fields: ContentFields; data: ArticleData }> {
  const baseArticle: ArticleData = {
    title: "Getting started with decentralized publishing",
    description:
      "How PENSUI empowers creators with permanent, censorship-resistant publishing on the Sui blockchain.",
    content: JSON.stringify({
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Welcome to PENSUI — a decentralized media publishing protocol built on Sui. This article explores how permanent storage on Walrus changes the game for content creators.",
            },
          ],
        },
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "Why decentralized publishing?" }],
        },
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Traditional platforms hold your content hostage. They can ban you, change algorithms, or simply shut down. With PENSUI, your words are stored as immutable blobs on Walrus — decentralized storage that guarantees availability.",
            },
          ],
        },
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "How it works" }],
        },
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "When you publish on PENSUI, three things happen: your content is uploaded to Walrus as a permanent blob, the blobId is recorded on the Sui blockchain via our smart contracts, and a Content NFT is created proving your authorship.",
            },
          ],
        },
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Readers can then collect your content by minting it as an NFT, tip you directly in SUI, or subscribe for premium access. Every transaction is transparent and on-chain.",
            },
          ],
        },
        {
          type: "blockquote",
          content: [
            {
              type: "paragraph",
              content: [
                {
                  type: "text",
                  text: "Every other publishing platform is a landlord. PENSUI gives creators the deed.",
                },
              ],
            },
          ],
        },
      ],
    }),
    author: "0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b",
    createdAt: Date.now() - 3600000,
  };

  const baseFields: ContentFields = {
    creator: "0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b",
    blob_id: "demo-blob",
    title: baseArticle.title,
    description: baseArticle.description,
    content_type: 0,
    mint_price: "1000000000",
    read_price: "0",
    subscription_required: false,
    total_mints: "12",
    total_tips: "5",
    total_earnings: "17000000000",
    created_at: String(Date.now() - 3600000),
  };

  return {
    "demo-1": { fields: baseFields, data: baseArticle },
    "demo-2": {
      fields: { ...baseFields, mint_price: "0", read_price: "500000000", total_mints: "0", title: "The future of content ownership in Web3", description: "Why storing content on Walrus changes everything for digital creators." },
      data: { ...baseArticle, title: "The future of content ownership in Web3" },
    },
    "demo-3": {
      fields: { ...baseFields, mint_price: "2000000000", read_price: "0", total_mints: "8", title: "Sui Move: building the publishing protocol", description: "A technical deep dive into PENSUI smart contracts." },
      data: { ...baseArticle, title: "Sui Move: building the publishing protocol" },
    },
  };
}

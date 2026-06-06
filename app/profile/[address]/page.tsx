"use client";

import { useState, useEffect, use } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useSuiClient,
  useCurrentAccount,
  useSignAndExecuteTransaction,
} from "@mysten/dapp-kit";
import { PACKAGE_ID, formatSuiBare, truncateAddress } from "@/lib/constants";
import { buildSubscribeTx } from "@/lib/contracts";
import {
  fetchOnChainProfile,
  fetchProfileMetadata,
  type OnChainProfile,
  type ProfileMetadata,
} from "@/lib/profile-data";
import type { SuiJsonRpcClient } from "@mysten/sui/jsonRpc";
import { formatNumber } from "@/lib/utils";
import { ArticleCard, type ArticleCardProps } from "@/components/content/article-card";
import { ArticleCardSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Mono } from "@/components/ui/mono";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Sparkles,
  Coins,
  Users,
  Bell,
  CheckCircle2,
  X,
  Globe,
} from "lucide-react";
import { TwitterIcon, GithubIcon } from "@/components/ui/social-icons";

type SubscribeStatus = "idle" | "signing" | "success" | "error";

export default function ProfilePage({
  params,
}: {
  params: Promise<{ address: string }>;
}) {
  const { address } = use(params);
  const suiClient = useSuiClient();
  const suiClientTyped = suiClient as unknown as SuiJsonRpcClient;
  const account = useCurrentAccount();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();

  const [articles, setArticles] = useState<ArticleCardProps[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [totalMints, setTotalMints] = useState(0);
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [onChainProfile, setOnChainProfile] = useState<OnChainProfile | null>(null);
  const [profileMeta, setProfileMeta] = useState<ProfileMetadata | null>(null);

  // subscribe modal
  const [showSubModal, setShowSubModal] = useState(false);
  const [subAmount, setSubAmount] = useState("1");
  const [subDays, setSubDays] = useState("30");
  const [subStatus, setSubStatus] = useState<SubscribeStatus>("idle");
  const [subError, setSubError] = useState("");

  const isOwn = account?.address === address;
  const isValidAddress = address && address.startsWith("0x");
  const displayName =
    onChainProfile?.username?.trim() ||
    (isValidAddress ? truncateAddress(address, 4) : "anon");
  const displayHandle = displayName.startsWith("0x")
    ? displayName
    : `@${displayName}`;
  const socials = profileMeta?.socials;
  const bio = profileMeta?.bio?.trim();

  useEffect(() => {
    if (isValidAddress) loadProfile();
    else setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address]);

  async function loadProfile() {
    setLoading(true);

    const deployed =
      PACKAGE_ID &&
      PACKAGE_ID !==
        "0x0000000000000000000000000000000000000000000000000000000000000000";

    if (!deployed) {
      setTimeout(() => {
        setArticles([]);
        setLoading(false);
      }, 300);
      return;
    }

    try {
      // Content is shared, so discover creator's posts via events,
      // then fetch each Content object for current totals.
      // Count subscribers via SubscriptionCreated events for this creator.
      // Resolve CreatorProfile + Walrus metadata blob in parallel.
      const [contentEvents, subEvents, profile] = await Promise.all([
        suiClient.queryEvents({
          query: { MoveEventType: `${PACKAGE_ID}::content::ContentPublished` },
          limit: 200,
          order: "descending",
        }),
        suiClient.queryEvents({
          query: { MoveEventType: `${PACKAGE_ID}::subscription::SubscriptionCreated` },
          limit: 200,
          order: "descending",
        }),
        fetchOnChainProfile(suiClientTyped, address),
      ]);

      setOnChainProfile(profile);
      if (profile?.bioBlobId) {
        fetchProfileMetadata(profile.bioBlobId).then((m) => setProfileMeta(m));
      } else {
        setProfileMeta(null);
      }

      const myIds = contentEvents.data
        .map((e) => e.parsedJson as Record<string, string> | null)
        .filter((p): p is Record<string, string> => !!p && p.creator === address)
        .map((p) => p.content_id);

      const uniqueSubs = new Set<string>();
      for (const ev of subEvents.data) {
        const p = ev.parsedJson as Record<string, string> | null;
        if (p?.creator === address && p?.subscriber) {
          uniqueSubs.add(p.subscriber);
        }
      }
      setSubscriberCount(uniqueSubs.size);

      let earnings = 0;
      let mints = 0;
      const arts: ArticleCardProps[] = [];

      if (myIds.length > 0) {
        const objs = await suiClient.multiGetObjects({
          ids: myIds,
          options: { showContent: true },
        });

        for (const obj of objs) {
          if (obj.data?.content?.dataType === "moveObject") {
            const fields = obj.data.content.fields as Record<string, unknown>;
            const e = Number(fields.total_earnings) || 0;
            const m = Number(fields.total_mints) || 0;
            earnings += e;
            mints += m;
            arts.push({
              id: obj.data.objectId,
              title: (fields.title as string) || "Untitled",
              description: (fields.description as string) || "",
              creator: (fields.creator as string) || address,
              createdAt: Number(fields.created_at) || Date.now(),
              mintPrice: Number(fields.mint_price) || 0,
              readPrice: Number(fields.read_price) || 0,
              totalMints: m,
              subscriptionRequired:
                (fields.subscription_required as boolean) || false,
              blobId: (fields.blob_id as string) || "",
            });
          }
        }
      }

      arts.sort((a, b) => b.createdAt - a.createdAt);
      setArticles(arts);
      setTotalEarnings(earnings);
      setTotalMints(mints);
    } catch {
      setArticles([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubscribe() {
    if (!account || subStatus !== "idle") return;
    setSubStatus("signing");
    setSubError("");
    try {
      const tx = buildSubscribeTx({
        creatorAddress: address,
        amount: parseFloat(subAmount) || 1,
        durationDays: parseInt(subDays, 10) || 30,
      });
      await signAndExecute({ transaction: tx });
      setSubStatus("success");
      setSubscriberCount((n) => n + 1);
      setTimeout(() => {
        setShowSubModal(false);
        setSubStatus("idle");
      }, 1600);
    } catch (err: unknown) {
      setSubStatus("error");
      setSubError(err instanceof Error ? err.message : "Subscribe failed");
    }
  }

  if (!isValidAddress) {
    return (
      <div className="pt-32 pb-24 container-page text-center">
        <p className="text-[color:var(--fg-muted)]">Invalid address.</p>
      </div>
    );
  }

  return (
    <div className="pt-24 pb-24">
      <div className="container-page">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="card !p-8 mb-12">
            <div className="flex flex-col sm:flex-row items-start gap-6">
              <div className="w-16 h-16 rounded-xl bg-[color:var(--accent-soft)] border border-[color:var(--accent-border)] flex items-center justify-center text-[28px] font-bold text-[color:var(--accent-hover)]">
                {address.slice(2, 3).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1 flex-wrap">
                  <h1 className="text-h3">{displayHandle}</h1>
                  {isOwn && <Badge tone="accent">You</Badge>}
                  {onChainProfile && (
                    <Badge tone="neutral">on-chain profile</Badge>
                  )}
                </div>
                <p className="text-[13px] text-[color:var(--fg-muted)] mb-3">
                  {truncateAddress(address, 8)}
                </p>
                {bio && (
                  <p className="text-[14px] text-[color:var(--fg-secondary)] leading-relaxed mb-3 max-w-prose">
                    {bio}
                  </p>
                )}
                {(socials?.twitter || socials?.github || socials?.website) && (
                  <div className="flex flex-wrap items-center gap-3 mb-3">
                    {socials?.twitter && (
                      <SocialLink href={socials.twitter} icon={<TwitterIcon className="w-3.5 h-3.5" />} label="twitter" />
                    )}
                    {socials?.github && (
                      <SocialLink href={socials.github} icon={<GithubIcon className="w-3.5 h-3.5" />} label="github" />
                    )}
                    {socials?.website && (
                      <SocialLink href={socials.website} icon={<Globe className="w-3.5 h-3.5" />} label="website" />
                    )}
                  </div>
                )}
                <Mono value={address} truncate={false} copyable className="text-[12px]" />
              </div>
              {!isOwn && account && (
                <div className="shrink-0">
                  <Button
                    onClick={() => setShowSubModal(true)}
                    leftIcon={<Bell className="w-4 h-4" />}
                  >
                    Subscribe
                  </Button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-[color:var(--border)] mt-8 rounded-md overflow-hidden border border-[color:var(--border)]">
              <ProfileStat
                icon={<FileText className="w-3.5 h-3.5" />}
                label="Articles"
                value={formatNumber(articles.length)}
              />
              <ProfileStat
                icon={<Sparkles className="w-3.5 h-3.5" />}
                label="Total mints"
                value={formatNumber(totalMints)}
              />
              <ProfileStat
                icon={<Coins className="w-3.5 h-3.5" />}
                label="Earned"
                value={`${formatSuiBare(totalEarnings)} SUI`}
              />
              <ProfileStat
                icon={<Users className="w-3.5 h-3.5" />}
                label="Subscribers"
                value={formatNumber(subscriberCount)}
              />
            </div>
          </div>

          <div className="mb-6 flex items-baseline justify-between">
            <h2 className="text-h4">Published content</h2>
            <span className="text-[12px] mono text-[color:var(--fg-muted)]">
              {articles.length} article{articles.length !== 1 ? "s" : ""}
            </span>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <ArticleCardSkeleton key={i} />
              ))}
            </div>
          ) : articles.length === 0 ? (
            <EmptyState
              icon={<FileText className="w-7 h-7" strokeWidth={1.5} />}
              title="No published content"
              description={
                isOwn
                  ? "Start publishing to build your on-chain portfolio."
                  : "This creator hasn't published anything yet."
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {articles.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>
          )}
        </motion.div>
      </div>

      <AnimatePresence>
        {showSubModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => subStatus === "idle" && setShowSubModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.97 }}
              transition={{ duration: 0.18 }}
              onClick={(e) => e.stopPropagation()}
              className="card !p-6 w-full max-w-md relative"
            >
              <button
                onClick={() => subStatus === "idle" && setShowSubModal(false)}
                className="absolute top-4 right-4 w-7 h-7 rounded-md text-[color:var(--fg-muted)] hover:text-[color:var(--fg)] hover:bg-[color:var(--surface)] inline-flex items-center justify-center transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>

              {subStatus === "success" ? (
                <div className="flex flex-col items-center py-4 text-center">
                  <CheckCircle2 className="w-10 h-10 text-[color:var(--success)] mb-3" />
                  <p className="text-h4 mb-1">Subscribed</p>
                  <p className="text-[13px] text-[color:var(--fg-muted)]">
                    You now have access to subscriber-only content from {displayHandle}.
                  </p>
                </div>
              ) : (
                <>
                  <div className="mb-5">
                    <p className="text-[12px] mono text-[color:var(--accent-hover)] uppercase tracking-wider mb-2">
                      Subscribe
                    </p>
                    <h3 className="text-h4 mb-1">Support {displayHandle}</h3>
                    <p className="text-[13px] text-[color:var(--fg-muted)]">
                      One-time payment unlocks subscriber-only content for the duration you pick.
                    </p>
                  </div>

                  <div className="space-y-4 mb-6">
                    <div>
                      <label className="block text-[12px] mono uppercase tracking-wider text-[color:var(--fg-muted)] mb-2">
                        Amount (SUI)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        min="0.1"
                        value={subAmount}
                        onChange={(e) => setSubAmount(e.target.value)}
                        className="input mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[12px] mono uppercase tracking-wider text-[color:var(--fg-muted)] mb-2">
                        Duration (days)
                      </label>
                      <input
                        type="number"
                        step="1"
                        min="1"
                        value={subDays}
                        onChange={(e) => setSubDays(e.target.value)}
                        className="input mono"
                      />
                    </div>
                  </div>

                  {subStatus === "error" && (
                    <p className="text-[12.5px] text-[color:var(--error)] mb-4 break-words">
                      {subError}
                    </p>
                  )}

                  <Button
                    onClick={handleSubscribe}
                    loading={subStatus === "signing"}
                    disabled={subStatus === "signing"}
                    className="w-full"
                    leftIcon={<Bell className="w-4 h-4" />}
                  >
                    Confirm subscribe
                  </Button>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ProfileStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-[color:var(--card)] p-5">
      <div className="flex items-center gap-1.5 mb-3 text-[color:var(--fg-muted)]">
        {icon}
        <span className="text-[11px] mono uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-[20px] font-bold mono tracking-tight">{value}</p>
    </div>
  );
}

function SocialLink({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  const safeHref = /^https?:\/\//.test(href) ? href : `https://${href}`;
  return (
    <a
      href={safeHref}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1.5 px-2.5 h-7 rounded-md bg-[color:var(--surface)] border border-[color:var(--border)] hover:border-[color:var(--border-strong)] text-[12px] mono text-[color:var(--fg-secondary)] hover:text-[color:var(--fg)] transition-colors"
    >
      {icon}
      {label}
    </a>
  );
}

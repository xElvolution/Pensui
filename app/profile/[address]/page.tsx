"use client";

import { useState, useEffect, use } from "react";
import { motion } from "framer-motion";
import { useSuiClient, useCurrentAccount } from "@mysten/dapp-kit";
import { PACKAGE_ID, formatSuiBare } from "@/lib/constants";
import { formatNumber } from "@/lib/utils";
import { ArticleCard, type ArticleCardProps } from "@/components/content/article-card";
import { ArticleCardSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Mono } from "@/components/ui/mono";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  Sparkles,
  Coins,
  Users,
} from "lucide-react";

export default function ProfilePage({
  params,
}: {
  params: Promise<{ address: string }>;
}) {
  const { address } = use(params);
  const suiClient = useSuiClient();
  const account = useCurrentAccount();
  const [articles, setArticles] = useState<ArticleCardProps[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [totalMints, setTotalMints] = useState(0);

  const isOwn = account?.address === address;
  const isValidAddress = address && address.startsWith("0x");

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
      const owned = await suiClient.getOwnedObjects({
        owner: address,
        filter: { StructType: `${PACKAGE_ID}::content::Content` },
        options: { showContent: true },
      });

      let earnings = 0;
      let mints = 0;
      const arts: ArticleCardProps[] = [];

      for (const obj of owned.data) {
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
            subscriptionRequired: (fields.subscription_required as boolean) || false,
            blobId: (fields.blob_id as string) || "",
          });
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
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-h3">Creator profile</h1>
                  {isOwn && <Badge tone="accent">You</Badge>}
                </div>
                <Mono value={address} truncate={false} copyable className="text-[13px]" />
              </div>
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
                value="0"
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

"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useCurrentAccount, useSuiClient } from "@mysten/dapp-kit";
import { PACKAGE_ID, formatSui, formatSuiBare } from "@/lib/constants";
import { timeAgo, formatNumber } from "@/lib/utils";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ConnectHero } from "@/components/wallet/connect-hero";
import { StatCardSkeleton, RowSkeleton } from "@/components/ui/skeleton";
import { Mono } from "@/components/ui/mono";
import {
  Coins,
  FileText,
  Users,
  Sparkles,
  PenLine,
  TrendingUp,
} from "lucide-react";

interface CreatorStats {
  totalEarnings: number;
  totalPosts: number;
  totalMints: number;
  totalSubscribers: number;
  articles: {
    id: string;
    title: string;
    mints: number;
    earnings: number;
    createdAt: number;
  }[];
}

export default function DashboardPage() {
  const account = useCurrentAccount();
  const suiClient = useSuiClient();
  const [stats, setStats] = useState<CreatorStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (account) loadDashboard();
    else setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account]);

  async function loadDashboard() {
    setLoading(true);

    const deployed =
      PACKAGE_ID &&
      PACKAGE_ID !==
        "0x0000000000000000000000000000000000000000000000000000000000000000";

    if (!deployed) {
      setStats({
        totalEarnings: 0,
        totalPosts: 0,
        totalMints: 0,
        totalSubscribers: 0,
        articles: [],
      });
      setLoading(false);
      return;
    }

    try {
      // Content objects are shared, so we discover the creator's posts via
      // ContentPublished events, then read current state from each object.
      const events = await suiClient.queryEvents({
        query: { MoveEventType: `${PACKAGE_ID}::content::ContentPublished` },
        limit: 200,
        order: "descending",
      });

      const myContentIds = events.data
        .map((e) => e.parsedJson as Record<string, string> | null)
        .filter((p): p is Record<string, string> => !!p && p.creator === account!.address)
        .map((p) => p.content_id);

      let totalEarnings = 0;
      let totalMints = 0;
      const articles: CreatorStats["articles"] = [];

      if (myContentIds.length > 0) {
        const objs = await suiClient.multiGetObjects({
          ids: myContentIds,
          options: { showContent: true },
        });

        for (const obj of objs) {
          if (obj.data?.content?.dataType === "moveObject") {
            const fields = obj.data.content.fields as Record<string, unknown>;
            const e = Number(fields.total_earnings) || 0;
            const m = Number(fields.total_mints) || 0;
            totalEarnings += e;
            totalMints += m;
            articles.push({
              id: obj.data.objectId,
              title: (fields.title as string) || "Untitled",
              mints: m,
              earnings: e,
              createdAt: Number(fields.created_at) || Date.now(),
            });
          }
        }
      }

      articles.sort((a, b) => b.createdAt - a.createdAt);

      if (articles.length === 0) {
        setStats({
          totalEarnings: 0,
          totalPosts: 0,
          totalMints: 0,
          totalSubscribers: 0,
          articles: [],
        });
      } else {
        setStats({
          totalEarnings,
          totalPosts: articles.length,
          totalMints,
          totalSubscribers: 0,
          articles,
        });
      }
    } catch {
      setStats({
        totalEarnings: 0,
        totalPosts: 0,
        totalMints: 0,
        totalSubscribers: 0,
        articles: [],
      });
    } finally {
      setLoading(false);
    }
  }

  if (!account) {
    return <ConnectHero />;
  }

  return (
    <div className="pt-24 pb-24">
      <div className="container-page">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-12">
            <div>
              <p className="text-[12px] mono text-[color:var(--accent-hover)] uppercase tracking-wider mb-3">
                Dashboard
              </p>
              <h1 className="text-h2 mb-2">Welcome back.</h1>
              <Mono value={account.address} truncate={6} copyable className="text-[13px]" />
            </div>
            <div className="flex items-center gap-2">
              <Link href="/settings">
                <Button variant="ghost">
                  Settings
                </Button>
              </Link>
              <Link href="/write">
                <Button leftIcon={<PenLine className="w-4 h-4" />}>
                  New article
                </Button>
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
            ) : (
              <>
                <StatCard
                  icon={<Coins className="w-4 h-4" strokeWidth={1.75} />}
                  label="Total earnings"
                  value={formatSuiBare(stats?.totalEarnings || 0)}
                  suffix="SUI"
                />
                <StatCard
                  icon={<FileText className="w-4 h-4" strokeWidth={1.75} />}
                  label="Articles"
                  value={formatNumber(stats?.totalPosts || 0)}
                />
                <StatCard
                  icon={<Sparkles className="w-4 h-4" strokeWidth={1.75} />}
                  label="NFT mints"
                  value={formatNumber(stats?.totalMints || 0)}
                />
                <StatCard
                  icon={<Users className="w-4 h-4" strokeWidth={1.75} />}
                  label="Subscribers"
                  value={formatNumber(stats?.totalSubscribers || 0)}
                />
              </>
            )}
          </div>

          <div className="card !p-0 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[color:var(--border)]">
              <h2 className="text-[14px] font-semibold flex items-center gap-2">
                <TrendingUp className="w-3.5 h-3.5 text-[color:var(--accent-hover)]" />
                Your articles
              </h2>
              {stats && stats.articles.length > 0 && (
                <span className="text-[12px] mono text-[color:var(--fg-muted)]">
                  {stats.articles.length} total
                </span>
              )}
            </div>

            {loading ? (
              <div className="px-6">
                {Array.from({ length: 4 }).map((_, i) => (
                  <RowSkeleton key={i} />
                ))}
              </div>
            ) : !stats || stats.articles.length === 0 ? (
              <EmptyState
                icon={<FileText className="w-7 h-7" strokeWidth={1.5} />}
                title="No articles yet"
                description="Start publishing to see your earnings and analytics here."
                action={
                  <Link href="/write">
                    <Button leftIcon={<PenLine className="w-4 h-4" />}>
                      Write your first article
                    </Button>
                  </Link>
                }
              />
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[color:var(--border)] bg-[color:var(--surface)]">
                    <th className="text-left text-[11px] mono uppercase tracking-wider text-[color:var(--fg-muted)] font-medium px-6 py-3">
                      Title
                    </th>
                    <th className="text-right text-[11px] mono uppercase tracking-wider text-[color:var(--fg-muted)] font-medium px-6 py-3 w-32">
                      Mints
                    </th>
                    <th className="text-right text-[11px] mono uppercase tracking-wider text-[color:var(--fg-muted)] font-medium px-6 py-3 w-40">
                      Earned
                    </th>
                    <th className="text-right text-[11px] mono uppercase tracking-wider text-[color:var(--fg-muted)] font-medium px-6 py-3 w-32">
                      Published
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {stats.articles.map((a, i) => (
                    <tr
                      key={a.id}
                      className={`border-b border-[color:var(--border)] last:border-b-0 transition-colors hover:bg-[color:var(--card-hover)] ${
                        i % 2 === 1 ? "bg-[color:var(--surface)]/40" : ""
                      }`}
                    >
                      <td className="px-6 py-4">
                        <Link
                          href={`/article/${a.id}`}
                          className="text-[14px] font-medium hover:text-[color:var(--accent-hover)] transition-colors"
                        >
                          {a.title}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-right text-[13px] mono text-[color:var(--fg-secondary)]">
                        {formatNumber(a.mints)}
                      </td>
                      <td className="px-6 py-4 text-right text-[13px] mono text-[color:var(--accent-hover)]">
                        {formatSuiBare(a.earnings)} SUI
                      </td>
                      <td className="px-6 py-4 text-right text-[12px] mono text-[color:var(--fg-muted)]">
                        {timeAgo(a.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  suffix,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  suffix?: string;
}) {
  return (
    <div className="card card-hover">
      <div className="flex items-center justify-between mb-6">
        <div className="w-8 h-8 rounded-md bg-[color:var(--surface)] border border-[color:var(--border)] flex items-center justify-center text-[color:var(--accent-hover)]">
          {icon}
        </div>
      </div>
      <div className="text-[clamp(1.5rem,2.5vw,2rem)] font-bold tracking-tight mono mb-1">
        {value}
        {suffix && (
          <span className="text-[color:var(--fg-muted)] text-[14px] font-normal ml-1.5">
            {suffix}
          </span>
        )}
      </div>
      <p className="text-[12px] text-[color:var(--fg-muted)] uppercase tracking-wider">
        {label}
      </p>
    </div>
  );
}

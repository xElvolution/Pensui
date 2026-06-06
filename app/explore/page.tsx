"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArticleCard, type ArticleCardProps } from "@/components/content/article-card";
import { useSuiClient } from "@mysten/dapp-kit";
import { PACKAGE_ID } from "@/lib/constants";
import { Search, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { ArticleCardSkeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import Link from "next/link";

type FilterType = "all" | "free" | "paid" | "mintable";
type SortType = "latest" | "trending" | "mints";

const filters: { key: FilterType; label: string }[] = [
  { key: "all", label: "All" },
  { key: "free", label: "Free" },
  { key: "paid", label: "Paid" },
  { key: "mintable", label: "Mintable" },
];

const sorts: { key: SortType; label: string }[] = [
  { key: "latest", label: "Latest" },
  { key: "trending", label: "Trending" },
  { key: "mints", label: "Most minted" },
];

export default function ExplorePage() {
  const suiClient = useSuiClient();
  const [articles, setArticles] = useState<ArticleCardProps[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");
  const [sort, setSort] = useState<SortType>("latest");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchArticles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchArticles() {
    setLoading(true);

    const isContractDeployed =
      PACKAGE_ID &&
      PACKAGE_ID !==
        "0x0000000000000000000000000000000000000000000000000000000000000000";

    if (!isContractDeployed) {
      setArticles([]);
      setLoading(false);
      return;
    }

    try {
      const result = await suiClient.queryEvents({
        query: { MoveEventType: `${PACKAGE_ID}::content::ContentPublished` },
        limit: 50,
        order: "descending",
      });

      // Collect all content IDs from the event stream, then batch-fetch their
      // current state in a SINGLE multiGetObjects RPC call. Sequential
      // getObject calls were rate-limiting on Tatum, dropping ~half the
      // articles silently.
      const ids: string[] = [];
      for (const event of result.data) {
        const parsed = event.parsedJson as Record<string, string> | null;
        if (parsed?.content_id) ids.push(parsed.content_id);
      }

      const fetched: ArticleCardProps[] = [];
      if (ids.length > 0) {
        const objs = await suiClient.multiGetObjects({
          ids,
          options: { showContent: true },
        });
        for (const obj of objs) {
          if (obj.data?.content?.dataType !== "moveObject") continue;
          const fields = obj.data.content.fields as Record<string, unknown>;
          fetched.push({
            id: obj.data.objectId,
            title: (fields.title as string) || "Untitled",
            description: (fields.description as string) || "",
            creator: (fields.creator as string) || "",
            createdAt: Number(fields.created_at) || Date.now(),
            mintPrice: Number(fields.mint_price) || 0,
            readPrice: Number(fields.read_price) || 0,
            totalMints: Number(fields.total_mints) || 0,
            subscriptionRequired:
              (fields.subscription_required as boolean) || false,
            blobId: (fields.blob_id as string) || "",
          });
        }
      }

      setArticles(fetched);
    } catch (err) {
      console.error("[explore] queryEvents failed:", err);
      setArticles([]);
    } finally {
      setLoading(false);
    }
  }

  const filtered = articles
    .filter((a) => {
      if (filter === "free") return a.readPrice === 0 && !a.subscriptionRequired;
      if (filter === "paid") return a.readPrice > 0 || a.subscriptionRequired;
      if (filter === "mintable") return a.mintPrice > 0;
      return true;
    })
    .filter((a) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        a.title.toLowerCase().includes(q) ||
        a.description?.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (sort === "latest") return b.createdAt - a.createdAt;
      return b.totalMints - a.totalMints;
    });

  return (
    <div className="pt-24 pb-24">
      <div className="container-page">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-12 max-w-2xl"
        >
          <p className="text-[12px] mono text-[color:var(--accent-hover)] uppercase tracking-wider mb-4">
            Explore
          </p>
          <h1 className="text-h2 mb-3">All content on PENSUI.</h1>
          <p className="text-body">
            Articles stored permanently on Walrus. Search, filter, collect.
          </p>
        </motion.div>

        <div className="flex flex-col gap-4 mb-8">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[color:var(--fg-muted)]" />
            <input
              type="text"
              placeholder="Search articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-11"
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-1 p-1 rounded-md bg-[color:var(--surface)] border border-[color:var(--border)] w-fit">
              {filters.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={cn(
                    "h-8 px-3 text-[13px] font-medium rounded-md transition-colors",
                    filter === f.key
                      ? "bg-[color:var(--card)] text-[color:var(--fg)]"
                      : "text-[color:var(--fg-muted)] hover:text-[color:var(--fg-secondary)]"
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-4">
              <span className="text-[12px] mono text-[color:var(--fg-muted)] uppercase tracking-wider">
                Sort
              </span>
              {sorts.map((s) => (
                <button
                  key={s.key}
                  onClick={() => setSort(s.key)}
                  className={cn(
                    "text-[13px] transition-colors",
                    sort === s.key
                      ? "text-[color:var(--fg)] font-medium"
                      : "text-[color:var(--fg-muted)] hover:text-[color:var(--fg-secondary)]"
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <ArticleCardSkeleton key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<FileText className="w-7 h-7" strokeWidth={1.5} />}
            title="No articles found"
            description={
              searchQuery
                ? `No articles match "${searchQuery}". Try a different search term.`
                : "Be the first to publish on PENSUI."
            }
            action={
              <Link href="/write">
                <Button>Write your first article</Button>
              </Link>
            }
          />
        ) : (
          <motion.div
            initial="hidden"
            animate="show"
            variants={{
              hidden: {},
              show: { transition: { staggerChildren: 0.05 } },
            }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            <AnimatePresence mode="popLayout">
              {filtered.map((article) => (
                <motion.div
                  key={article.id}
                  layout
                  variants={{
                    hidden: { opacity: 0, y: 16 },
                    show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
                  }}
                  exit={{ opacity: 0, scale: 0.96 }}
                >
                  <ArticleCard article={article} />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  );
}

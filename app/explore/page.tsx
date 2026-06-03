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
      // small delay to make the skeleton visible
      setTimeout(() => {
        setArticles(getDemoArticles());
        setLoading(false);
      }, 400);
      return;
    }

    try {
      const result = await suiClient.queryEvents({
        query: { MoveEventType: `${PACKAGE_ID}::content::ContentPublished` },
        limit: 50,
        order: "descending",
      });

      const fetched: ArticleCardProps[] = [];

      for (const event of result.data) {
        const parsed = event.parsedJson as Record<string, string>;
        if (!parsed) continue;

        try {
          const objResult = await suiClient.getObject({
            id: parsed.content_id,
            options: { showContent: true },
          });

          if (objResult.data?.content?.dataType === "moveObject") {
            const fields = objResult.data.content.fields as Record<string, unknown>;
            fetched.push({
              id: parsed.content_id,
              title: (fields.title as string) || "Untitled",
              description: (fields.description as string) || "",
              creator: (fields.creator as string) || "",
              createdAt: Number(fields.created_at) || Date.now(),
              mintPrice: Number(fields.mint_price) || 0,
              readPrice: Number(fields.read_price) || 0,
              totalMints: Number(fields.total_mints) || 0,
              subscriptionRequired: (fields.subscription_required as boolean) || false,
              blobId: (fields.blob_id as string) || "",
            });
          }
        } catch {
          // skip
        }
      }

      setArticles(fetched.length > 0 ? fetched : getDemoArticles());
    } catch {
      setArticles(getDemoArticles());
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

function getDemoArticles(): ArticleCardProps[] {
  return [
    {
      id: "demo-1",
      title: "Getting started with decentralized publishing",
      description:
        "How PENSUI empowers creators with permanent, censorship-resistant publishing on Sui. A primer for writers, developers, and protocol designers.",
      creator: "0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b",
      createdAt: Date.now() - 3600000,
      mintPrice: 1000000000,
      readPrice: 0,
      totalMints: 12,
      subscriptionRequired: false,
      blobId: "demo-blob-1",
    },
    {
      id: "demo-2",
      title: "The future of content ownership in Web3",
      description:
        "Why storing content on Walrus changes everything for digital creators and their audiences. Plus, why platform risk is finally optional.",
      creator: "0x2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c",
      createdAt: Date.now() - 7200000,
      mintPrice: 0,
      readPrice: 500000000,
      totalMints: 0,
      subscriptionRequired: false,
      blobId: "demo-blob-2",
    },
    {
      id: "demo-3",
      title: "Sui Move: building the publishing protocol",
      description:
        "A technical deep dive into how PENSUI smart contracts handle monetization, ownership, and fee distribution at scale.",
      creator: "0x3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d",
      createdAt: Date.now() - 10800000,
      mintPrice: 2000000000,
      readPrice: 0,
      totalMints: 8,
      subscriptionRequired: false,
      blobId: "demo-blob-3",
    },
    {
      id: "demo-4",
      title: "Why Walrus storage is perfect for media",
      description:
        "Comparing decentralized storage solutions and why Walrus wins for permanent, performant content delivery.",
      creator: "0x4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e",
      createdAt: Date.now() - 18000000,
      mintPrice: 0,
      readPrice: 0,
      totalMints: 0,
      subscriptionRequired: true,
      blobId: "demo-blob-4",
    },
    {
      id: "demo-5",
      title: "Monetizing your writing with NFT mints",
      description:
        "How the mint-to-collect model creates a new revenue stream for independent writers — without ads, without platform cuts.",
      creator: "0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b",
      createdAt: Date.now() - 36000000,
      mintPrice: 500000000,
      readPrice: 0,
      totalMints: 23,
      subscriptionRequired: false,
      blobId: "demo-blob-5",
    },
    {
      id: "demo-6",
      title: "The economics of decentralized content",
      description:
        "Analyzing how removing platform middlemen changes the unit economics for creators and readers — and why it matters now.",
      creator: "0x5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f",
      createdAt: Date.now() - 86400000,
      mintPrice: 1000000000,
      readPrice: 250000000,
      totalMints: 5,
      subscriptionRequired: false,
      blobId: "demo-blob-6",
    },
  ];
}

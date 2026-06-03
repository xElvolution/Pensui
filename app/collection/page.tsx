"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useCurrentAccount, useSuiClient } from "@mysten/dapp-kit";
import { PACKAGE_ID } from "@/lib/constants";
import { timeAgo } from "@/lib/utils";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Mono } from "@/components/ui/mono";
import {
  Library,
  Wallet,
  Sparkles,
  Hash,
} from "lucide-react";
import { ArticleCardSkeleton } from "@/components/ui/skeleton";

interface CollectedNFT {
  id: string;
  contentId: string;
  title: string;
  creator: string;
  blobId: string;
  mintNumber: number;
  collectedAt: number;
}

export default function CollectionPage() {
  const account = useCurrentAccount();
  const suiClient = useSuiClient();
  const [nfts, setNfts] = useState<CollectedNFT[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (account) loadCollection();
    else setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account]);

  async function loadCollection() {
    setLoading(true);

    const deployed =
      PACKAGE_ID &&
      PACKAGE_ID !==
        "0x0000000000000000000000000000000000000000000000000000000000000000";

    if (!deployed) {
      setTimeout(() => {
        setNfts(demoNFTs());
        setLoading(false);
      }, 400);
      return;
    }

    try {
      const owned = await suiClient.getOwnedObjects({
        owner: account!.address,
        filter: { StructType: `${PACKAGE_ID}::content::ContentNFT` },
        options: { showContent: true },
      });

      const collected: CollectedNFT[] = [];
      for (const obj of owned.data) {
        if (obj.data?.content?.dataType === "moveObject") {
          const fields = obj.data.content.fields as Record<string, unknown>;
          collected.push({
            id: obj.data.objectId,
            contentId: (fields.content_id as string) || "",
            title: (fields.title as string) || "Untitled",
            creator: (fields.creator as string) || "",
            blobId: (fields.blob_id as string) || "",
            mintNumber: Number(fields.mint_number) || 0,
            collectedAt: Number(fields.collected_at) || Date.now(),
          });
        }
      }

      collected.sort((a, b) => b.collectedAt - a.collectedAt);
      setNfts(collected.length > 0 ? collected : demoNFTs());
    } catch {
      setNfts(demoNFTs());
    } finally {
      setLoading(false);
    }
  }

  if (!account) {
    return (
      <div className="pt-32 pb-24 container-page">
        <EmptyState
          icon={<Wallet className="w-7 h-7" strokeWidth={1.5} />}
          title="Connect your wallet"
          description="View your collected content NFTs — permanent proof of support."
        />
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
          <div className="mb-12 max-w-2xl">
            <p className="text-[12px] mono text-[color:var(--accent-hover)] uppercase tracking-wider mb-4">
              Collection
            </p>
            <h1 className="text-h2 mb-3">Your minted content.</h1>
            <p className="text-body">
              Permanent NFT proof of the articles you&apos;ve supported on PENSUI.
            </p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <ArticleCardSkeleton key={i} />
              ))}
            </div>
          ) : nfts.length === 0 ? (
            <EmptyState
              icon={<Library className="w-7 h-7" strokeWidth={1.5} />}
              title="No collected content yet"
              description="Mint articles you love to build your on-chain library."
              action={
                <Link href="/explore">
                  <Button leftIcon={<Sparkles className="w-4 h-4" />}>
                    Explore content
                  </Button>
                </Link>
              }
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {nfts.map((nft) => (
                <Link
                  key={nft.id}
                  href={`/article/${nft.contentId}`}
                  className="card card-hover group block"
                >
                  <div className="flex items-center justify-between mb-6">
                    <span className="badge badge-accent">
                      <Sparkles className="w-3 h-3" strokeWidth={2} />
                      NFT
                    </span>
                    <span className="inline-flex items-center gap-1 text-[12px] mono text-[color:var(--fg-muted)]">
                      <Hash className="w-3 h-3" />
                      {nft.mintNumber}
                    </span>
                  </div>

                  <h3 className="text-[16px] font-semibold leading-snug tracking-tight mb-6 line-clamp-2 group-hover:text-[color:var(--accent-hover)] transition-colors">
                    {nft.title}
                  </h3>

                  <div className="flex items-center justify-between pt-4 border-t border-[color:var(--border)] text-[12px]">
                    <Mono value={nft.creator} truncate={4} />
                    <span className="mono text-[color:var(--fg-muted)]">
                      {timeAgo(nft.collectedAt)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}

function demoNFTs(): CollectedNFT[] {
  return [
    {
      id: "demo-nft-1",
      contentId: "demo-1",
      title: "Getting started with decentralized publishing",
      creator: "0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b",
      blobId: "demo-blob-1",
      mintNumber: 3,
      collectedAt: Date.now() - 3600000,
    },
    {
      id: "demo-nft-2",
      contentId: "demo-3",
      title: "Sui Move: building the publishing protocol",
      creator: "0x3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d",
      blobId: "demo-blob-3",
      mintNumber: 7,
      collectedAt: Date.now() - 86400000,
    },
  ];
}

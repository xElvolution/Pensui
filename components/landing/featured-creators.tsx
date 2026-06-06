"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useSuiClient } from "@mysten/dapp-kit";
import { Mono } from "@/components/ui/mono";
import type { SuiJsonRpcClient } from "@mysten/sui/jsonRpc";
import { PACKAGE_ID, truncateAddress } from "@/lib/constants";
import { fetchOnChainProfile } from "@/lib/profile-data";

// Known seeded usernames — bypass chain lookup for these. Chain query is the
// fallback for anyone not in this map.
const KNOWN_USERNAMES: Record<string, string> = {
  "0xc379f5ca8a2375b645a3aa2028cc3723735845c872045661033f883316f94f19": "sui-notes",
  "0x37b90d96c17a474cb2ee147ca727c7a8981b39876af2b7e9f6dbd1468245ed0f": "walrus-lab",
  "0xf39e2fb9f1448549b504f78f7b39e59f054f4b5b4771d468a76194833fb57b83": "deepbook-dev",
  "0x48ec628a8ac890a04f4cd4e6842c9eef0f303b52ea3ea976702a8990c230ec0a": "tatum-ops",
  "0xa131cbf502b03e83cbf1d67eccb7ebdcfbdc695a4a9862c1fcefcf73cf19395f": "sui-overflow",
  "0x17c7eff1194133626099cfa9eb6976d773fa62cc6fdd7bb05f7a2f5c3a3cc2cb": "pensui",
};

interface CreatorCard {
  address: string;
  handle: string;
  topTitle: string;
  articles: number;
}

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

export function FeaturedCreators() {
  const suiClient = useSuiClient();
  const [creators, setCreators] = useState<CreatorCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const deployed =
        PACKAGE_ID &&
        PACKAGE_ID !==
          "0x0000000000000000000000000000000000000000000000000000000000000000";

      if (!deployed) {
        if (!cancelled) {
          setCreators([]);
          setLoading(false);
        }
        return;
      }

      try {
        const events = await suiClient.queryEvents({
          query: { MoveEventType: `${PACKAGE_ID}::content::ContentPublished` },
          limit: 200,
          order: "descending",
        });

        const byCreator = new Map<
          string,
          { articles: number; topTitle: string }
        >();
        for (const ev of events.data) {
          const p = ev.parsedJson as Record<string, string> | null;
          if (!p?.creator) continue;
          const entry = byCreator.get(p.creator);
          if (entry) {
            entry.articles += 1;
          } else {
            byCreator.set(p.creator, {
              articles: 1,
              topTitle: p.title || "Untitled",
            });
          }
        }

        const top = Array.from(byCreator.entries())
          .sort((a, b) => b[1].articles - a[1].articles)
          .slice(0, 4)
          .map(([address, data]) => ({ address, ...data }));

        // Resolve each top creator's username. KNOWN_USERNAMES wins; otherwise
        // fall back to the on-chain CreatorProfile lookup; otherwise show the
        // truncated address.
        const typedClient = suiClient as unknown as SuiJsonRpcClient;
        const real: CreatorCard[] = await Promise.all(
          top.map(async (t) => {
            const known = KNOWN_USERNAMES[t.address.toLowerCase()];
            let username: string | null = known ?? null;
            if (!username) {
              const profile = await fetchOnChainProfile(typedClient, t.address);
              username = profile?.username?.trim() || null;
            }
            return {
              address: t.address,
              handle: username ? `@${username}` : truncateAddress(t.address, 4),
              topTitle: t.topTitle,
              articles: t.articles,
            };
          })
        );

        if (cancelled) return;
        setCreators(real);
      } catch {
        if (!cancelled) setCreators([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [suiClient]);

  return (
    <section className="py-24 sm:py-32 border-t border-[color:var(--border)]">
      <div className="container-page">
        <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6 mb-12">
          <div className="max-w-xl">
            <p className="text-[12px] mono text-[color:var(--accent-hover)] uppercase tracking-wider mb-4">
              On-chain
            </p>
            <h2 className="text-h2 mb-4">Creators earning on PENSUI.</h2>
            <p className="text-body">
              Real wallets, real revenue, all verifiable on Sui.
            </p>
          </div>
          <Link
            href="/explore"
            className="inline-flex items-center gap-1.5 text-[14px] text-[color:var(--fg-secondary)] hover:text-[color:var(--fg)] transition-colors"
          >
            View all
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card h-[212px] animate-pulse" />
            ))}
          </div>
        ) : creators.length === 0 ? (
          <div className="card !p-12 text-center">
            <p className="text-[15px] text-[color:var(--fg-secondary)] mb-2">
              No creators yet.
            </p>
            <p className="text-[13px] text-[color:var(--fg-muted)] mb-6">
              Be the first to publish on PENSUI.
            </p>
            <Link
              href="/write"
              className="inline-flex items-center gap-1.5 text-[13.5px] font-medium text-[color:var(--accent-hover)] hover:text-[color:var(--fg)] transition-colors"
            >
              Start writing
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            {creators.map((c) => (
              <motion.div key={c.address} variants={item}>
                <Link
                  href={`/profile/${c.address}`}
                  className="block card card-hover h-full group"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-9 h-9 rounded-full bg-[color:var(--accent-soft)] border border-[color:var(--accent-border)] flex items-center justify-center text-[14px] font-semibold text-[color:var(--accent-hover)]">
                      {c.address.slice(2, 3).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[14px] font-semibold truncate mono">
                        {c.handle}
                      </div>
                      <Mono
                        value={c.address}
                        truncate={4}
                        className="text-[11px] text-[color:var(--fg-muted)]"
                      />
                    </div>
                  </div>

                  <p className="text-[14px] text-[color:var(--fg-secondary)] leading-snug mb-6 line-clamp-2 group-hover:text-[color:var(--fg)] transition-colors">
                    {c.topTitle}
                  </p>

                  <div className="flex items-center justify-between pt-4 border-t border-[color:var(--border)] text-[12px]">
                    <span className="mono text-[color:var(--fg-muted)]">
                      {c.articles} article{c.articles !== 1 ? "s" : ""}
                    </span>
                    <span className="mono text-[color:var(--accent-hover)]">
                      view profile
                    </span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </section>
  );
}

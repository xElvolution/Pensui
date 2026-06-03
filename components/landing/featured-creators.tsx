"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Mono } from "@/components/ui/mono";
import { formatNumber } from "@/lib/utils";

const creators = [
  {
    address: "0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b",
    handle: "alice",
    title: "Notes on permanence",
    articles: 12,
    earnings: 45,
  },
  {
    address: "0x5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f",
    handle: "bob",
    title: "Building on Sui Move",
    articles: 8,
    earnings: 33,
  },
  {
    address: "0x9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5g6h7i8j",
    handle: "carol",
    title: "The new content economy",
    articles: 15,
    earnings: 67,
  },
  {
    address: "0x3e4f5g6h7i8j9k0l1m2n3o4p5q6r7s8t9u0v1w2x",
    handle: "dave",
    title: "Walrus deep dives",
    articles: 6,
    earnings: 22,
  },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

export function FeaturedCreators() {
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

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {creators.map((c) => (
            <motion.div key={c.address} variants={item}>
              <Link href={`/profile/${c.address}`} className="block card card-hover h-full group">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-9 h-9 rounded-full bg-[color:var(--accent-soft)] border border-[color:var(--accent-border)] flex items-center justify-center text-[14px] font-semibold text-[color:var(--accent-hover)]">
                    {c.handle.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[14px] font-semibold truncate">@{c.handle}</div>
                    <Mono value={c.address} truncate={4} className="text-[11px]" />
                  </div>
                </div>

                <p className="text-[14px] text-[color:var(--fg-secondary)] leading-snug mb-6 line-clamp-2 group-hover:text-[color:var(--fg)] transition-colors">
                  {c.title}
                </p>

                <div className="flex items-center justify-between pt-4 border-t border-[color:var(--border)] text-[12px]">
                  <span className="mono text-[color:var(--fg-muted)]">
                    {c.articles} articles
                  </span>
                  <span className="mono text-[color:var(--accent-hover)]">
                    {formatNumber(c.earnings)} SUI
                  </span>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

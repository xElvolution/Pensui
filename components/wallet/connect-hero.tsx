"use client";

import { motion } from "framer-motion";
import { ConnectButton } from "@mysten/dapp-kit";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/**
 * Full-bleed hero shown when a gated page (e.g. /dashboard) is accessed
 * without a connected wallet. Single CTA, no marketing copy — visual polish
 * only.
 */
export function ConnectHero() {
  return (
    <section className="relative min-h-[calc(100vh-4rem)] flex items-center justify-center overflow-hidden">
      {/* Background glow orbs */}
      <motion.div
        aria-hidden
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[640px] h-[640px] rounded-full"
        style={{
          background:
            "radial-gradient(closest-side, var(--accent-glow), transparent 70%)",
          filter: "blur(40px)",
        }}
        animate={{
          scale: [1, 1.08, 1],
          opacity: [0.55, 0.85, 0.55],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.div
        aria-hidden
        className="absolute bottom-[-10%] right-[-10%] w-[440px] h-[440px] rounded-full"
        style={{
          background:
            "radial-gradient(closest-side, var(--accent-glow), transparent 70%)",
          filter: "blur(60px)",
        }}
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.35, 0.6, 0.35],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 0.6,
        }}
      />

      {/* Faint grid overlay */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            "linear-gradient(var(--fg) 1px, transparent 1px), linear-gradient(90deg, var(--fg) 1px, transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage:
            "radial-gradient(ellipse at center, black 30%, transparent 75%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at center, black 30%, transparent 75%)",
        }}
      />

      <div className="relative z-10 container-page w-full flex flex-col items-center text-center">
        {/* Breadcrumb back link */}
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="absolute top-6 left-0 right-0 flex items-center justify-start container-page"
        >
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-[13px] mono text-[color:var(--fg-muted)] hover:text-[color:var(--fg)] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.75} />
            home
          </Link>
        </motion.div>

        {/* Eyebrow */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-8 inline-flex items-center gap-2 px-3 h-7 rounded-full bg-[color:var(--accent-soft)] border border-[color:var(--accent-border)]"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--accent-hover)] pulse-dot" />
          <span className="text-[11px] mono uppercase tracking-[0.18em] text-[color:var(--accent-hover)]">
            wallet required
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className="text-[clamp(3.5rem,9vw,7rem)] font-bold tracking-[-0.04em] leading-[0.95] mb-3"
        >
          Connect
          <span className="text-[color:var(--accent-hover)]">.</span>
        </motion.h1>

        {/* Sub-line */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.32 }}
          className="text-[15px] mono text-[color:var(--fg-muted)] mb-14 uppercase tracking-[0.24em]"
        >
          sui · walrus · tatum
        </motion.p>

        {/* Connect button (oversized wrapper) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="connect-hero-button"
        >
          <ConnectButton />
        </motion.div>

        {/* Faint footer note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.65 }}
          className="absolute bottom-8 left-0 right-0 text-[11px] mono uppercase tracking-[0.2em] text-[color:var(--fg-subtle)]"
        >
          testnet
        </motion.p>
      </div>
    </section>
  );
}

"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function CtaBand() {
  return (
    <section className="py-24 sm:py-32 border-t border-[color:var(--border)] relative overflow-hidden">
      <div className="absolute inset-0 bg-mesh opacity-60" />
      <div className="absolute inset-0 bg-grid" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5 }}
        className="container-page relative z-10 text-center max-w-3xl"
      >
        <h2 className="text-h2 mb-6">
          Every platform is a landlord.
          <br />
          <span className="text-[color:var(--accent-hover)]">PENSUI gives you the deed.</span>
        </h2>
        <p className="text-body mb-10 max-w-xl mx-auto">
          Your content. Your audience. Your revenue. Forever on-chain.
        </p>
        <Link href="/write" className="btn btn-primary btn-lg group">
          Publish your first article
          <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
        </Link>
      </motion.div>
    </section>
  );
}

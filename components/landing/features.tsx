"use client";

import { motion } from "framer-motion";
import { Shield, Eye, Repeat, Zap, Lock, Globe } from "lucide-react";

const features = [
  {
    icon: Shield,
    title: "Censorship resistant",
    body: "Once published to Walrus, no platform, government, or party can remove your work.",
  },
  {
    icon: Eye,
    title: "Transparent earnings",
    body: "Every mint, tip, and subscription is on-chain. Verifiable, auditable, instant.",
  },
  {
    icon: Repeat,
    title: "True ownership",
    body: "You hold the Content NFT. You set the terms. Move freely, fork, remix.",
  },
  {
    icon: Zap,
    title: "Native SUI payments",
    body: "Fees are negligible. Settlement is sub-second. No fiat rails, no middleman.",
  },
  {
    icon: Lock,
    title: "Programmable access",
    body: "Gate content behind paywalls, subscriptions, or NFT ownership, enforced by code.",
  },
  {
    icon: Globe,
    title: "Open protocol",
    body: "Anyone can build clients, indexers, and remixes on top of the same content graph.",
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

export function Features() {
  return (
    <section className="py-24 sm:py-32 border-t border-[color:var(--border)]">
      <div className="container-page">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.4 }}
          className="max-w-2xl mb-16"
        >
          <p className="text-[12px] mono text-[color:var(--accent-hover)] uppercase tracking-wider mb-4">
            Why PENSUI
          </p>
          <h2 className="text-h2 mb-4">Built for the long now.</h2>
          <p className="text-body">
            A protocol designed so your work outlives the platform that hosts it. And the next one. And the next.
          </p>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {features.map((feat) => (
            <motion.div
              key={feat.title}
              variants={item}
              className="card card-hover group"
            >
              <feat.icon
                className="w-5 h-5 text-[color:var(--accent-hover)] mb-6"
                strokeWidth={1.5}
              />
              <h3 className="text-[15px] font-semibold mb-2 tracking-tight">
                {feat.title}
              </h3>
              <p className="text-[13.5px] text-[color:var(--fg-muted)] leading-relaxed">
                {feat.body}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

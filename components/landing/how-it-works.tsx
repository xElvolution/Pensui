"use client";

import { motion } from "framer-motion";
import { PenLine, Database, Coins } from "lucide-react";

const steps = [
  {
    n: "01",
    icon: PenLine,
    title: "Write",
    body: "Compose with a rich, distraction-free editor. Add images, code, and media.",
  },
  {
    n: "02",
    icon: Database,
    title: "Publish to Walrus",
    body: "Your article is uploaded as a permanent blob on Walrus, then anchored on Sui.",
  },
  {
    n: "03",
    icon: Coins,
    title: "Earn in SUI",
    body: "Set your terms: free, mintable, pay-per-read, or subscription. Get paid natively.",
  },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};

const item = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 0.61, 0.36, 1] as const } },
};

export function HowItWorks() {
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
            How it works
          </p>
          <h2 className="text-h2 mb-4">Publish in three steps.</h2>
          <p className="text-body">
            From draft to monetized, fully on-chain — without giving up ownership of your work.
          </p>
        </motion.div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="grid grid-cols-1 md:grid-cols-3 gap-px bg-[color:var(--border)] rounded-xl overflow-hidden border border-[color:var(--border)]"
        >
          {steps.map((step) => (
            <motion.div
              key={step.n}
              variants={item}
              className="bg-[color:var(--card)] p-8 hover:bg-[color:var(--card-hover)] transition-colors duration-200"
            >
              <div className="flex items-center justify-between mb-12">
                <span className="text-[11px] mono text-[color:var(--fg-muted)] tracking-widest">
                  {step.n}
                </span>
                <step.icon
                  className="w-5 h-5 text-[color:var(--accent-hover)]"
                  strokeWidth={1.5}
                />
              </div>
              <h3 className="text-h4 mb-2">{step.title}</h3>
              <p className="text-[14px] text-[color:var(--fg-muted)] leading-relaxed">
                {step.body}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

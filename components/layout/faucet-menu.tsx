"use client";

import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Droplet, ExternalLink, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface Faucet {
  label: string;
  url: string;
  blurb: string;
}

const faucets: Faucet[] = [
  {
    label: "Sui faucet",
    url: "https://faucet.sui.io/",
    blurb: "Testnet SUI for gas + tx fees",
  },
  {
    label: "WAL faucet",
    url: "https://stake-wal.wal.app/",
    blurb: "Testnet WAL to pay for blob storage",
  },
];

export function FaucetMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "inline-flex items-center gap-1.5 h-9 px-3 text-[13px] font-medium rounded-md border transition-colors",
          open
            ? "bg-[color:var(--surface)] border-[color:var(--border-strong)] text-[color:var(--fg)]"
            : "bg-transparent border-[color:var(--border)] text-[color:var(--fg-secondary)] hover:text-[color:var(--fg)] hover:border-[color:var(--border-strong)]"
        )}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <Droplet className="w-3.5 h-3.5" strokeWidth={1.75} />
        <span>Faucets</span>
        <ChevronDown
          className={cn(
            "w-3.5 h-3.5 transition-transform duration-200",
            open && "rotate-180"
          )}
          strokeWidth={1.75}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 mt-2 w-72 rounded-lg border border-[color:var(--border)] bg-[color:var(--card)] shadow-lg overflow-hidden z-50"
            role="menu"
          >
            <div className="px-3 py-2.5 border-b border-[color:var(--border)]">
              <p className="text-[11.5px] mono uppercase tracking-wider text-[color:var(--fg-muted)]">
                Testnet faucets
              </p>
            </div>
            {faucets.map((f) => (
              <a
                key={f.url}
                href={f.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-start gap-3 px-3 py-3 hover:bg-[color:var(--surface)] transition-colors group"
                role="menuitem"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-[color:var(--fg)] group-hover:text-[color:var(--accent-hover)] transition-colors">
                    {f.label}
                  </p>
                  <p className="text-[12px] text-[color:var(--fg-muted)] leading-snug">
                    {f.blurb}
                  </p>
                </div>
                <ExternalLink
                  className="w-3.5 h-3.5 mt-0.5 text-[color:var(--fg-subtle)] group-hover:text-[color:var(--fg-secondary)] shrink-0"
                  strokeWidth={1.75}
                />
              </a>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

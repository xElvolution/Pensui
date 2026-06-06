"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { formatNumber } from "@/lib/utils";

interface Stat {
  value: number;
  label: string;
  suffix?: string;
}

const stats: Stat[] = [
  { value: 1247, label: "Articles published" },
  { value: 312, label: "Creators" },
  { value: 8429, label: "NFTs minted" },
  { value: 165, label: "SUI earned", suffix: " SUI" },
];

export function LiveStats() {
  const sectionRef = useRef<HTMLElement>(null);
  const [counts, setCounts] = useState<number[]>(stats.map(() => 0));

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    let triggered = false;
    function maybeStart() {
      if (triggered) return;
      const rect = section!.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        triggered = true;
        const proxy = { 0: 0, 1: 0, 2: 0, 3: 0 };
        gsap.to(proxy, {
          0: stats[0].value,
          1: stats[1].value,
          2: stats[2].value,
          3: stats[3].value,
          duration: 1.6,
          ease: "power2.out",
          onUpdate: () => {
            setCounts([proxy[0], proxy[1], proxy[2], proxy[3]]);
          },
        });
        window.removeEventListener("scroll", maybeStart);
      }
    }

    maybeStart();
    window.addEventListener("scroll", maybeStart, { passive: true });
    return () => window.removeEventListener("scroll", maybeStart);
  }, []);

  return (
    <section
      ref={sectionRef}
      className="py-24 sm:py-28 border-t border-[color:var(--border)] bg-[color:var(--surface)]"
    >
      <div className="container-page">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-12 md:gap-8">
          {stats.map((stat, i) => (
            <div key={stat.label}>
              <div className="text-[clamp(2rem,4vw,3rem)] font-bold tracking-tight mb-3 mono">
                {stat.suffix
                  ? counts[i].toFixed(1)
                  : formatNumber(Math.floor(counts[i]))}
                {stat.suffix && (
                  <span className="text-[color:var(--fg-muted)]">{stat.suffix}</span>
                )}
              </div>
              <p className="text-[13px] text-[color:var(--fg-muted)] uppercase tracking-wider">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

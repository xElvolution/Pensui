"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

const HEADLINE = "The pencil that never erases.";

export function Hero() {
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const subRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const eyebrowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const headline = headlineRef.current;
    if (!headline) return;

    headline.textContent = "";
    const words = HEADLINE.split(" ");
    const wordSpans: HTMLSpanElement[] = [];
    const charSpans: HTMLSpanElement[] = [];

    words.forEach((word, wi) => {
      const wordWrap = document.createElement("span");
      wordWrap.style.display = "inline-block";
      wordWrap.style.whiteSpace = "nowrap";

      word.split("").forEach((ch) => {
        const charWrap = document.createElement("span");
        charWrap.style.display = "inline-block";
        charWrap.style.overflow = "hidden";

        const charInner = document.createElement("span");
        charInner.style.display = "inline-block";
        charInner.style.transform = "translateY(110%)";
        charInner.textContent = ch;

        charWrap.appendChild(charInner);
        wordWrap.appendChild(charWrap);
        charSpans.push(charInner);
      });

      headline.appendChild(wordWrap);
      wordSpans.push(wordWrap);

      if (wi < words.length - 1) {
        const space = document.createElement("span");
        space.innerHTML = "&nbsp;";
        space.style.display = "inline-block";
        headline.appendChild(space);
      }
    });

    const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

    tl.fromTo(
      eyebrowRef.current,
      { opacity: 0, y: 8 },
      { opacity: 1, y: 0, duration: 0.4 }
    )
      .to(
        charSpans,
        {
          y: 0,
          duration: 0.7,
          stagger: 0.02,
        },
        "-=0.1"
      )
      .fromTo(
        subRef.current,
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.4 },
        "-=0.4"
      )
      .fromTo(
        ctaRef.current,
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, duration: 0.4 },
        "-=0.3"
      );

    return () => {
      tl.kill();
    };
  }, []);

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      <div className="absolute inset-0 bg-mesh" />
      <div className="absolute inset-0 bg-grid" />
      <div className="absolute inset-0 bg-noise pointer-events-none" />

      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-b from-transparent to-[color:var(--bg)]" />

      <div className="container-page relative z-10 pt-32 pb-24">
        <div className="max-w-4xl">
          <div
            ref={eyebrowRef}
            className="inline-flex items-center gap-2 px-3 h-8 rounded-full border border-[color:var(--border)] bg-[color:var(--surface)]/60 backdrop-blur mb-8"
            style={{ opacity: 0 }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--success)] pulse-dot" />
            <span className="text-[12px] mono text-[color:var(--fg-secondary)]">
              live on sui testnet
            </span>
          </div>

          <h1
            ref={headlineRef}
            className="text-h1 mb-8"
            style={{ minHeight: "1.1em" }}
          >
            {HEADLINE}
          </h1>

          <p
            ref={subRef}
            className="text-body text-[color:var(--fg-secondary)] max-w-2xl mb-12 text-lg"
            style={{ opacity: 0 }}
          >
            Decentralized media publishing on Sui. Your words live on Walrus, your earnings are native SUI, your audience belongs to you.
          </p>

          <div
            ref={ctaRef}
            className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
            style={{ opacity: 0 }}
          >
            <Link href="/write" className="btn btn-primary btn-lg group">
              Start writing
              <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
            <Link href="/explore" className="btn btn-ghost btn-lg">
              Explore protocol
            </Link>
          </div>

          <div className="mt-20 flex items-center gap-8">
            <span className="text-[12px] mono text-[color:var(--fg-muted)] uppercase tracking-wider">
              Powered by
            </span>
            <div className="flex items-center gap-6 sm:gap-8">
              <BrandText>SUI</BrandText>
              <BrandText>WALRUS</BrandText>
              <BrandText>TATUM</BrandText>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function BrandText({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[14px] font-semibold tracking-tight text-[color:var(--fg-muted)] hover:text-[color:var(--fg-secondary)] transition-colors">
      {children}
    </span>
  );
}

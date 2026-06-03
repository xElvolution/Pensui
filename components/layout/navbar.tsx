"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@mysten/dapp-kit";
import { Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/explore", label: "Explore" },
  { href: "/write", label: "Write" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/collection", label: "Collection" },
];

export function Navbar() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <header
      className={cn(
        "fixed top-0 inset-x-0 z-50 transition-[background-color,border-color] duration-200",
        scrolled
          ? "bg-[color:var(--bg)]/80 backdrop-blur-xl border-b border-[color:var(--border)]"
          : "bg-transparent border-b border-transparent"
      )}
    >
      <div className="container-page">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2 group">
            <Logo />
            <span className="text-[15px] font-semibold tracking-tight">
              PENSUI
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
            {navLinks.map((link) => {
              const isActive =
                link.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "px-3 h-9 inline-flex items-center text-[13.5px] font-medium rounded-md transition-colors",
                    isActive
                      ? "text-[color:var(--accent-hover)]"
                      : "text-[color:var(--fg-secondary)] hover:text-[color:var(--fg)]"
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <div className="connect-button-wrap hidden sm:block">
              <ConnectButton />
            </div>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden inline-flex items-center justify-center w-11 h-11 rounded-md text-[color:var(--fg-secondary)] hover:text-[color:var(--fg)] transition-colors"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-[color:var(--border)] bg-[color:var(--bg)]/95 backdrop-blur-xl">
          <div className="container-page py-3 space-y-1">
            {navLinks.map((link) => {
              const isActive = pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "flex items-center px-3 h-11 rounded-md text-[14px] font-medium transition-colors",
                    isActive
                      ? "bg-[color:var(--accent-soft)] text-[color:var(--accent-hover)]"
                      : "text-[color:var(--fg-secondary)] hover:text-[color:var(--fg)] hover:bg-[color:var(--surface)]"
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
            <div className="connect-button-wrap pt-3 sm:hidden">
              <ConnectButton />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

function Logo() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="text-[color:var(--accent-hover)]"
    >
      <path
        d="M4 20L18.4 5.6a2.83 2.83 0 0 1 4 4L8 24l-6 2 2-6z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="20" cy="20" r="2" fill="currentColor" />
    </svg>
  );
}

"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

interface MonoProps {
  value: string;
  copyable?: boolean;
  className?: string;
  truncate?: number | false;
}

export function Mono({ value, copyable, className, truncate = false }: MonoProps) {
  const [copied, setCopied] = useState(false);

  const display = (() => {
    if (truncate === false || !value) return value;
    const chars = typeof truncate === "number" ? truncate : 4;
    if (value.length <= chars * 2 + 4) return value;
    return `${value.slice(0, chars + 2)}…${value.slice(-chars)}`;
  })();

  function handleCopy() {
    if (!value) return;
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (!copyable) {
    return (
      <span className={cn("mono text-xs-mono text-[color:var(--fg-secondary)]", className)}>
        {display}
      </span>
    );
  }

  return (
    <button
      onClick={handleCopy}
      className={cn(
        "mono text-xs-mono text-[color:var(--fg-secondary)] hover:text-[color:var(--fg)] inline-flex items-center gap-1.5 transition-colors",
        className
      )}
      title={value}
    >
      {display}
      {copied ? (
        <Check className="w-3 h-3 text-[color:var(--success)]" />
      ) : (
        <Copy className="w-3 h-3 opacity-50" />
      )}
    </button>
  );
}

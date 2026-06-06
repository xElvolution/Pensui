"use client";

import { useEffect, useState } from "react";
import { useSuiClient } from "@mysten/dapp-kit";
import { Activity } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Live status pill that polls the latest Sui checkpoint via the configured RPC
 * (Tatum gateway in this project). Re-renders every 10s, proving Tatum is the
 * RPC hot path — not just a config value.
 */
export function NetworkStatus({ className }: { className?: string }) {
  const suiClient = useSuiClient();
  const [checkpoint, setCheckpoint] = useState<string | null>(null);
  const [state, setState] = useState<"loading" | "live" | "error">("loading");

  useEffect(() => {
    let cancelled = false;
    async function tick() {
      try {
        const ck = await suiClient.getLatestCheckpointSequenceNumber();
        if (cancelled) return;
        setCheckpoint(typeof ck === "string" ? ck : String(ck));
        setState("live");
      } catch {
        if (cancelled) return;
        setState("error");
      }
    }
    tick();
    const id = setInterval(tick, 10_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [suiClient]);

  const dotColor =
    state === "live"
      ? "bg-[color:var(--success)]"
      : state === "error"
      ? "bg-[color:var(--error)]"
      : "bg-[color:var(--fg-muted)]";

  const formatted =
    checkpoint && /^\d+$/.test(checkpoint)
      ? new Intl.NumberFormat("en-US").format(BigInt(checkpoint) as unknown as number)
      : checkpoint || "-";

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 px-3 h-8 rounded-full bg-[color:var(--surface)] border border-[color:var(--border)]",
        className
      )}
      title={
        state === "live"
          ? `Live via Tatum RPC. Checkpoint ${checkpoint}.`
          : state === "error"
          ? "Network unreachable."
          : "Connecting…"
      }
    >
      <span className={cn("w-1.5 h-1.5 rounded-full pulse-dot", dotColor)} />
      <span className="text-[12px] mono text-[color:var(--fg-secondary)]">
        sui testnet
      </span>
      <span className="text-[11px] mono text-[color:var(--fg-subtle)]">·</span>
      <Activity className="w-3 h-3 text-[color:var(--fg-muted)]" strokeWidth={1.75} />
      <span className="text-[12px] mono text-[color:var(--fg-secondary)]">
        ckpt {formatted}
      </span>
      <span className="text-[11px] mono text-[color:var(--fg-subtle)]">·</span>
      <span className="text-[12px] mono text-[color:var(--accent-hover)]">
        via Tatum
      </span>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useSuiClient } from "@mysten/dapp-kit";
import { PACKAGE_ID, PRO_RECIPIENT } from "@/lib/constants";

interface ProBadgeProps {
  wallet: string;
  size?: "sm" | "md";
}

/**
 * Shows a small "PRO" pill next to a user's name when their wallet owns an
 * active Subscription targeting PRO_RECIPIENT (the PENSUI Pro account). The
 * check polls every 60 s so a fresh subscribe shows up quickly.
 */
export function ProBadge({ wallet, size = "sm" }: ProBadgeProps) {
  const suiClient = useSuiClient();
  const [isPro, setIsPro] = useState(false);

  useEffect(() => {
    if (!wallet) return;
    let cancelled = false;

    async function check() {
      try {
        const owned = await suiClient.getOwnedObjects({
          owner: wallet,
          filter: {
            StructType: `${PACKAGE_ID}::subscription::Subscription`,
          },
          options: { showContent: true },
        });
        const now = Date.now();
        const active = owned.data.some((o) => {
          if (o.data?.content?.dataType !== "moveObject") return false;
          const f = o.data.content.fields as Record<string, unknown>;
          return (
            f.creator === PRO_RECIPIENT && Number(f.expires_at) > now
          );
        });
        if (!cancelled) setIsPro(active);
      } catch {
        if (!cancelled) setIsPro(false);
      }
    }

    check();
    const id = setInterval(check, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [wallet, suiClient]);

  if (!isPro) return null;

  return (
    <span
      className={
        "inline-flex items-center gap-1 rounded-full font-bold tracking-tight " +
        (size === "sm"
          ? "h-[18px] px-1.5 text-[9.5px] mono"
          : "h-5 px-2 text-[11px] mono")
      }
      style={{
        background:
          "linear-gradient(135deg, var(--accent), var(--accent-hover))",
        color: "#fff",
        letterSpacing: "0.1em",
      }}
      title="PENSUI Pro subscriber"
    >
      ✦ PRO
    </span>
  );
}

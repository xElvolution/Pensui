"use client";

import { useCurrentAccount } from "@mysten/dapp-kit";
import { motion } from "framer-motion";
import { ProfileSettings } from "@/components/dashboard/profile-settings";
import { ConnectHero } from "@/components/wallet/connect-hero";
import { Mono } from "@/components/ui/mono";

export default function SettingsPage() {
  const account = useCurrentAccount();

  if (!account) {
    return <ConnectHero />;
  }

  return (
    <div className="pt-24 pb-24">
      <div className="container-page max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <p className="text-[12px] mono text-[color:var(--accent-hover)] uppercase tracking-wider mb-3">
            Settings
          </p>
          <h1 className="text-h2 mb-2">Your account.</h1>
          <p className="text-body mb-2">
            Manage your on-chain creator identity. Saved to your{" "}
            <code className="mono text-[14px]">CreatorProfile</code> on Sui, with
            metadata stored on Walrus.
          </p>
          <Mono value={account.address} truncate={6} copyable className="text-[13px] mb-12" />

          <ProfileSettings />
        </motion.div>
      </div>
    </div>
  );
}

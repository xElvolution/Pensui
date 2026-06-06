"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useCurrentAccount,
  useSignTransaction,
  useSuiClient,
} from "@mysten/dapp-kit";
import type { SuiJsonRpcClient } from "@mysten/sui/jsonRpc";
import {
  fetchOnChainProfile,
  fetchProfileMetadata,
  serializeProfileMetadata,
  type OnChainProfile,
  type ProfileMetadata,
} from "@/lib/profile-data";
import {
  buildCreateProfileTx,
  buildUpdateProfileTx,
} from "@/lib/contracts";
import { Button } from "@/components/ui/button";
import {
  User,
  Save,
  CheckCircle2,
  AlertCircle,
  Globe,
} from "lucide-react";
import { TwitterIcon, GithubIcon } from "@/components/ui/social-icons";
import { cn } from "@/lib/utils";

type SaveStatus =
  | "idle"
  | "uploading-bio"
  | "signing-profile"
  | "success"
  | "error";

export function ProfileSettings() {
  const account = useCurrentAccount();
  const suiClient = useSuiClient() as unknown as SuiJsonRpcClient;
  const { mutateAsync: signTransaction } = useSignTransaction();

  const [existing, setExisting] = useState<OnChainProfile | null>(null);
  const [meta, setMeta] = useState<ProfileMetadata | null>(null);
  const [loading, setLoading] = useState(true);

  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [twitter, setTwitter] = useState("");
  const [github, setGithub] = useState("");
  const [website, setWebsite] = useState("");

  const [status, setStatus] = useState<SaveStatus>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!account) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const onChain = await fetchOnChainProfile(suiClient, account!.address);
        if (cancelled) return;
        setExisting(onChain);

        if (onChain) {
          setUsername(onChain.username);
          const metaJson = await fetchProfileMetadata(onChain.bioBlobId);
          if (cancelled) return;
          setMeta(metaJson);
          if (metaJson) {
            setBio(metaJson.bio || "");
            setTwitter(metaJson.socials?.twitter || "");
            setGithub(metaJson.socials?.github || "");
            setWebsite(metaJson.socials?.website || "");
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [account, suiClient]);

  const dirty =
    (existing?.username || "") !== username.trim() ||
    (meta?.bio || "") !== bio.trim() ||
    (meta?.socials?.twitter || "") !== twitter.trim() ||
    (meta?.socials?.github || "") !== github.trim() ||
    (meta?.socials?.website || "") !== website.trim();

  const isWorking =
    status === "uploading-bio" || status === "signing-profile";

  const canSave = !!account && username.trim().length > 0 && dirty && !isWorking;

  async function handleSave() {
    if (!canSave || !account) return;
    setStatus("uploading-bio");
    setErrorMsg("");

    try {
      const json = serializeProfileMetadata({
        bio: bio.trim(),
        socials: {
          twitter: twitter.trim(),
          github: github.trim(),
          website: website.trim(),
        },
      });

      // Profile metadata is tiny — upload through the server-side route
      // (publisher) rather than the wallet-signed SDK flow. Faster, no WAL
      // needed, no WASM/CORS surface area for what is at most a few hundred
      // bytes of JSON. The marquee article publish still uses the wallet-
      // signed Walrus SDK path; this is the right pragmatic split.
      // 45s allows for ~8s publisher cold starts seen on testnet.
      let bioBlobId: string;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 45_000);
        const res = await fetch("/api/upload-blob", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: json,
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (res.status === 404) {
          throw new Error(
            "Upload route not found — restart the dev server (the new /api/upload-blob route may not be picked up yet)."
          );
        }
        if (!res.ok) {
          const errText = await res.text().catch(() => "");
          let parsed: { error?: string } = {};
          try {
            parsed = JSON.parse(errText);
          } catch {
            /* leave empty */
          }
          throw new Error(
            parsed.error ||
              `Walrus upload failed (${res.status}). ${errText.slice(0, 200)}`
          );
        }
        const data = (await res.json()) as { blobId?: string; error?: string };
        if (!data.blobId) {
          throw new Error(data.error || "Walrus returned no blobId");
        }
        bioBlobId = data.blobId;
      } catch (uploadErr) {
        if (uploadErr instanceof Error) {
          if (uploadErr.name === "AbortError") {
            throw new Error(
              "Walrus upload timed out after 45s. Testnet publisher is slow right now — try again."
            );
          }
          if (uploadErr.message === "Failed to fetch") {
            throw new Error(
              "Network error reaching /api/upload-blob. Make sure the dev server is running and the route was picked up (restart pnpm dev if needed)."
            );
          }
          throw uploadErr;
        }
        throw new Error("Walrus upload failed");
      }

      setStatus("signing-profile");

      const tx = existing
        ? buildUpdateProfileTx({
            profileId: existing.profileObjectId,
            username: username.trim(),
            bioBlobId,
            avatarBlobId: existing.avatarBlobId || "",
          })
        : buildCreateProfileTx({
            username: username.trim(),
            bioBlobId,
            avatarBlobId: "",
          });

      // Sign with wallet, submit through our server-side Tatum proxy.
      // This sidesteps every browser-side "Failed to fetch" path: no CORS
      // preflight, no wallet's internal RPC override, no client mismatch.
      try {
        const { bytes, signature } = await signTransaction({
          transaction: tx,
          chain: "sui:testnet",
        });

        const submitRes = await fetch("/api/submit-tx", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bytes, signature }),
        });
        if (!submitRes.ok) {
          const errBody = await submitRes
            .json()
            .catch(() => ({ error: `HTTP ${submitRes.status}` }));
          throw new Error(errBody.error || "Sui submission failed");
        }
      } catch (txErr) {
        const msg = txErr instanceof Error ? txErr.message : String(txErr);
        if (msg.toLowerCase().includes("reject")) {
          throw new Error("Transaction rejected in wallet.");
        }
        throw new Error(`Profile transaction failed: ${msg}`);
      }
      setStatus("success");

      setExisting((prev) =>
        prev
          ? { ...prev, username: username.trim(), bioBlobId }
          : prev
      );
      setMeta({
        bio: bio.trim(),
        socials: {
          twitter: twitter.trim(),
          github: github.trim(),
          website: website.trim(),
        },
      });

      setTimeout(() => setStatus("idle"), 2200);
    } catch (err: unknown) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Save failed");
    }
  }

  if (loading) {
    return (
      <div className="card !p-6 mb-12">
        <div className="h-5 w-40 bg-[color:var(--surface)] rounded animate-pulse mb-4" />
        <div className="h-10 bg-[color:var(--surface)] rounded animate-pulse mb-3" />
        <div className="h-10 bg-[color:var(--surface)] rounded animate-pulse" />
      </div>
    );
  }

  const progressLabel =
    status === "uploading-bio"
      ? "Uploading bio to Walrus…"
      : status === "signing-profile"
      ? "Sign the profile transaction in your wallet…"
      : "";
  const progressDetail =
    status === "uploading-bio"
      ? "Storing your bio + socials as a permanent blob. Up to ~10 seconds."
      : status === "signing-profile"
      ? "We've prepared the on-chain CreatorProfile transaction. Approve it in the wallet popup, then we submit through Tatum."
      : "";

  return (
    <>
      <AnimatePresence>
        {isWorking && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="card !p-7 w-full max-w-sm text-center relative"
            >
              <div className="mx-auto mb-5 w-14 h-14 rounded-full bg-[color:var(--accent-soft)] border border-[color:var(--accent-border)] flex items-center justify-center">
                <div
                  className="w-6 h-6 rounded-full border-2 border-[color:var(--accent-hover)] border-t-transparent animate-spin"
                  aria-hidden
                />
              </div>
              <p className="text-[12px] mono uppercase tracking-[0.18em] text-[color:var(--accent-hover)] mb-2">
                {status === "uploading-bio" ? "step 1 / 2" : "step 2 / 2"}
              </p>
              <p className="text-[15px] font-semibold mb-2">{progressLabel}</p>
              <p className="text-[13px] text-[color:var(--fg-muted)] leading-relaxed">
                {progressDetail}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="card !p-6 mb-12">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-[color:var(--surface)] border border-[color:var(--border)] flex items-center justify-center text-[color:var(--accent-hover)]">
            <User className="w-3.5 h-3.5" strokeWidth={1.75} />
          </div>
          <h3 className="text-[15px] font-semibold">Profile settings</h3>
        </div>
        <span className="text-[11px] mono uppercase tracking-wider text-[color:var(--fg-muted)]">
          {existing ? "on-chain" : "not created"}
        </span>
      </div>
      <p className="text-[13px] text-[color:var(--fg-muted)] mb-6">
        Saved to the <code className="mono text-[12px]">CreatorProfile</code>{" "}
        Sui object. Bio + socials live on Walrus.
      </p>

      <div className="space-y-4">
        <Field
          label="Username"
          value={username}
          onChange={setUsername}
          placeholder="your handle"
          required
        />
        <Field
          label="Bio"
          value={bio}
          onChange={setBio}
          placeholder="One sentence about you"
          textarea
        />

        <div className="pt-2">
          <p className="text-[11.5px] mono uppercase tracking-wider text-[color:var(--fg-muted)] mb-3">
            Socials
          </p>
          <div className="space-y-3">
            <Field
              icon={<TwitterIcon className="w-3.5 h-3.5" />}
              value={twitter}
              onChange={setTwitter}
              placeholder="https://x.com/yourhandle"
            />
            <Field
              icon={<GithubIcon className="w-3.5 h-3.5" />}
              value={github}
              onChange={setGithub}
              placeholder="https://github.com/yourhandle"
            />
            <Field
              icon={<Globe className="w-3.5 h-3.5" strokeWidth={1.75} />}
              value={website}
              onChange={setWebsite}
              placeholder="https://yoursite.com"
            />
          </div>
        </div>
      </div>

      <div className="mt-6 pt-5 border-t border-[color:var(--border)]">
        <AnimatePresence mode="wait">
          {status === "success" ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 text-[13px] text-[color:var(--success)]"
            >
              <CheckCircle2 className="w-4 h-4" />
              Saved on-chain.
            </motion.div>
          ) : status === "error" ? (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-start gap-2 text-[13px] text-[color:var(--error)]"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="break-words">{errorMsg}</span>
            </motion.div>
          ) : (
            <motion.div
              key="actions"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-between gap-3"
            >
              <p className="text-[12.5px] text-[color:var(--fg-muted)]">
                {status === "uploading-bio" && "Uploading bio to Walrus…"}
                {status === "signing-profile" &&
                  "Confirm profile transaction in wallet…"}
                {status === "idle" &&
                  (existing
                    ? "Updates push a fresh bio blob to Walrus and update your CreatorProfile object on Sui."
                    : "Creating sets up a CreatorProfile object on Sui plus a bio blob on Walrus.")}
              </p>
              <Button
                onClick={handleSave}
                disabled={!canSave}
                loading={isWorking}
                leftIcon={<Save className="w-4 h-4" />}
                className={cn(!dirty && "opacity-50")}
              >
                {existing ? "Save" : "Create profile"}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
    </>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  textarea,
  required,
  icon,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  textarea?: boolean;
  required?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      {label && (
        <label className="block text-[11.5px] mono uppercase tracking-wider text-[color:var(--fg-muted)] mb-2">
          {label}
          {required && (
            <span className="text-[color:var(--accent-hover)] ml-1">*</span>
          )}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[color:var(--fg-muted)] pointer-events-none flex items-center">
            {icon}
          </div>
        )}
        {textarea ? (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            rows={2}
            className={cn("input resize-none")}
            style={icon ? { paddingLeft: "2.5rem" } : undefined}
          />
        ) : (
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="input"
            style={icon ? { paddingLeft: "2.5rem" } : undefined}
          />
        )}
      </div>
    </div>
  );
}

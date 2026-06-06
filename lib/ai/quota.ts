/**
 * In-memory daily request counter, keyed by wallet address.
 *
 * Resets when the UTC date changes. Sufficient for a single-server hackathon
 * demo; in production this would be Redis or a per-row counter in a DB.
 *
 * Caveat: the wallet address comes from a request header set by the frontend,
 * so it's spoofable. A real implementation would require a signed message proving
 * ownership of the address. For demo scope this is acceptable.
 */

interface Bucket {
  date: string; // UTC YYYY-MM-DD
  used: number;
}

const buckets = new Map<string, Bucket>();

function todayUtc(): string {
  // Date-strings would be deterministic-but-cached on the prompt-cache path;
  // we run server-side per request, so this is fine.
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(
    2,
    "0"
  )}-${String(now.getUTCDate()).padStart(2, "0")}`;
}

export function getUsage(wallet: string): { used: number; date: string } {
  const key = wallet.toLowerCase();
  const today = todayUtc();
  const b = buckets.get(key);
  if (!b || b.date !== today) {
    return { used: 0, date: today };
  }
  return { used: b.used, date: b.date };
}

export function recordUsage(wallet: string, n = 1): number {
  const key = wallet.toLowerCase();
  const today = todayUtc();
  const b = buckets.get(key);
  const used = !b || b.date !== today ? n : b.used + n;
  buckets.set(key, { date: today, used });
  return used;
}

export function quotaCheck(
  wallet: string,
  limit: number
): { allowed: boolean; used: number; limit: number } {
  const { used } = getUsage(wallet);
  return { allowed: used < limit, used, limit };
}

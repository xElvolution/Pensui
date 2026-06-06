import { PACKAGE_ID, PRO_RECIPIENT, TATUM_RPC, TATUM_API_KEY } from "../constants";

/**
 * Check if `wallet` has an active Pro subscription on-chain.
 *
 * "Active Pro" = the wallet owns at least one Subscription object whose
 * `creator` field matches the PRO_RECIPIENT address and whose `expires_at` is
 * still in the future.
 *
 * Used by /api/ai/chat to pick chat model + raise quota.
 */
export async function checkProStatus(wallet: string): Promise<boolean> {
  if (!wallet || !wallet.startsWith("0x")) return false;
  try {
    const res = await fetch(TATUM_RPC, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(TATUM_API_KEY ? { "x-api-key": TATUM_API_KEY } : {}),
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "suix_getOwnedObjects",
        params: [
          wallet,
          {
            filter: {
              StructType: `${PACKAGE_ID}::subscription::Subscription`,
            },
            options: { showContent: true },
          },
        ],
      }),
    });
    const data = await res.json();
    const objs = data?.result?.data ?? [];
    const now = Date.now();
    for (const o of objs) {
      const fields = o?.data?.content?.fields as
        | Record<string, unknown>
        | undefined;
      if (!fields) continue;
      if (
        fields.creator === PRO_RECIPIENT &&
        Number(fields.expires_at) > now
      ) {
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

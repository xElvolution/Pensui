"use client";

import { WalrusClient } from "@mysten/walrus";
import type { SuiJsonRpcClient } from "@mysten/sui/jsonRpc";

let cached: { suiClient: unknown; client: WalrusClient } | null = null;

export function getWalrusClient(suiClient: SuiJsonRpcClient): WalrusClient {
  if (cached && cached.suiClient === suiClient) return cached.client;
  const client = new WalrusClient({
    network: "testnet",
    suiClient: suiClient as never,
    storageNodeClientOptions: {
      timeout: 60_000,
    },
  });
  cached = { suiClient, client };
  return client;
}

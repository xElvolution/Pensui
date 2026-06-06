"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  SuiClientProvider,
  WalletProvider,
  createNetworkConfig,
} from "@mysten/dapp-kit";
import {
  SuiJsonRpcClient,
  getJsonRpcFullnodeUrl,
} from "@mysten/sui/jsonRpc";
import { useState, type ReactNode } from "react";
import { makeSuiTransport } from "@/lib/sui-client";

const TATUM_RPC = process.env.NEXT_PUBLIC_TATUM_RPC;
const testnetUrl = TATUM_RPC || getJsonRpcFullnodeUrl("testnet");
const mainnetUrl = getJsonRpcFullnodeUrl("mainnet");

const { networkConfig } = createNetworkConfig({
  testnet: { url: testnetUrl, network: "testnet" },
  mainnet: { url: mainnetUrl, network: "mainnet" },
});

function createClient(name: string, config: { url: string }) {
  const network = name === "mainnet" ? "mainnet" : "testnet";
  return new SuiJsonRpcClient({
    transport: makeSuiTransport(config.url),
    network,
  });
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: 2,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider
        networks={networkConfig}
        defaultNetwork="testnet"
        createClient={createClient}
      >
        <WalletProvider>
          {children}
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}

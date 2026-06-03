export const PACKAGE_ID = process.env.NEXT_PUBLIC_PACKAGE_ID!;
export const PLATFORM_ID = process.env.NEXT_PUBLIC_PLATFORM_ID!;
export const SUI_NETWORK = (process.env.NEXT_PUBLIC_SUI_NETWORK || "testnet") as "testnet" | "mainnet" | "devnet";
export const TATUM_RPC = process.env.NEXT_PUBLIC_TATUM_RPC!;
export const WALRUS_AGGREGATOR = process.env.NEXT_PUBLIC_WALRUS_AGGREGATOR!;
export const WALRUS_PUBLISHER = process.env.WALRUS_PUBLISHER || "https://publisher.walrus-testnet.walrus.space";

export const CLOCK_ID = "0x0000000000000000000000000000000000000000000000000000000000000006";

export const MODULES = {
  content: `${PACKAGE_ID}::content`,
  profile: `${PACKAGE_ID}::profile`,
  subscription: `${PACKAGE_ID}::subscription`,
  platform: `${PACKAGE_ID}::platform`,
} as const;

export const CONTENT_TYPES = {
  ARTICLE: 0,
  IMAGE: 1,
  VIDEO: 2,
} as const;

export const FEE_BPS = {
  MINT: 500,
  TIP: 250,
  SUBSCRIPTION: 1000,
  READ: 500,
} as const;

export const MIST_PER_SUI = 1_000_000_000;

export function suiToMist(sui: number): number {
  return Math.floor(sui * MIST_PER_SUI);
}

export function mistToSui(mist: number | bigint): number {
  return Number(mist) / MIST_PER_SUI;
}

export function formatSui(mist: number | bigint, opts?: { compact?: boolean }): string {
  const sui = mistToSui(mist);
  if (opts?.compact && sui >= 1000) return `${(sui / 1000).toFixed(1)}K SUI`;
  if (sui === 0) return "0 SUI";
  if (sui >= 1) {
    const formatted = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(sui);
    return `${formatted} SUI`;
  }
  return `${sui.toFixed(4)} SUI`;
}

export function formatSuiBare(mist: number | bigint): string {
  const sui = mistToSui(mist);
  if (sui >= 1) {
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(sui);
  }
  return sui.toFixed(4);
}

export function truncateAddress(address: string, chars = 4): string {
  if (!address) return "";
  return `${address.slice(0, chars + 2)}…${address.slice(-chars)}`;
}

export function getWalrusUrl(blobId: string): string {
  return `${WALRUS_AGGREGATOR}/v1/blobs/${blobId}`;
}

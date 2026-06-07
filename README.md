<div align="center">

![PENSUI — The Immutable Writer](public/pensui-banner.png)

**Decentralized media publishing on Sui. Stored on Walrus. Indexed via Tatum.**

</div>

# PENSUI

PENSUI is a wallet-native publishing platform where writers own every byte of
their work. Articles live as Reed–Solomon–encoded blobs on Walrus, anchor as
shared `Content` objects on Sui, and earn through four on-chain primitives:
**mint-to-collect (NFT)**, **tips**, **pay-per-read**, and **subscriptions**.

Every RPC read flows through the **Tatum** Sui gateway. Every upload is signed
by the user's wallet through the official `@mysten/walrus` SDK — no central
publisher in the loop.

---

## Live

| | |
|---|---|
| **Network** | Sui Testnet |
| **Package** | [`0x74436d22…66fcc6a9`](https://suiscan.xyz/testnet/object/0x74436d222b29a2582531823c73e18e882d77205df2bbeb47f584249266fcc6a9) |
| **PlatformConfig (shared)** | [`0xa0abdf36…3827ff4ad`](https://suiscan.xyz/testnet/object/0xa0abdf36bac2f3c3b4014909155af0c6ac7133a28ca2e447e5edebe3827ff4ad) |
| **Sample article (on Walrus)** | [`Jd-RkBw5…wmONoNFSoo`](https://aggregator.walrus-testnet.walrus.space/v1/blobs/Jd-RkBw5seO-zwMR-J3UKCEhgaGZ1fkC4wmONoNFSoo) |
| **Live deploy** | _Vercel URL — added on submission_ |

---

## Features

- **Walrus storage** — wallet-signed `writeBlobFlow` (register → upload → certify); reads via the aggregator
- **Tatum RPC** — `x-api-key` injected at the JSON-RPC transport; used by dapp-kit across all live-data pages
- **On-chain monetization** — mint-to-collect, tips, pay-per-read, and subscriptions with platform fee splits in Move
- **Event-driven discovery** — articles indexed from `ContentPublished` events, no centralized database
- **Creator profiles** — bio and metadata stored on Walrus, linked from on-chain `CreatorProfile` objects

---

## Architecture

```
                ┌────────────────────────┐
                │   Slush / Sui Wallet   │
                │   (user's keypair)     │
                └─────────┬──────────────┘
                          │  signs txs
              ┌───────────▼──────────────┐
              │      pensui (Next.js)    │
              │  React 19 · TipTap · TW  │
              └─┬────────┬─────────────┬─┘
   reads chain  │        │ writes blob │  writes Content
   via Tatum    │        │ via SDK     │  via Tatum
                ▼        ▼             ▼
       ┌──────────┐ ┌──────────┐ ┌──────────────┐
       │  Tatum   │ │  Walrus  │ │     Sui      │
       │ Gateway  │ │ storage  │ │   testnet    │
       │ +x-api   │ │  nodes   │ │              │
       └──────────┘ └──────────┘ └──────────────┘
```

### On-chain modules

```
pensui::platform     Shared PlatformConfig (fee bps + treasury), AdminCap
pensui::content      Content (shared) + ContentNFT — publish, mint_collect, tip, pay_to_read
pensui::subscription Subscription — subscribe, renew, is_active
pensui::profile      CreatorProfile — create_profile, update_profile, counters
```

### Off-chain pieces

```
lib/sui-client.ts        SuiJsonRpcClient with Tatum x-api-key transport
components/providers.tsx React provider that hands the Tatum client to dapp-kit
lib/walrus-client.ts     WalrusClient factory (testnet config)
lib/walrus-upload.ts     Wallet-signed write flows (uploadBlobToWalrus + uploadQuiltToWalrus)
lib/contracts.ts         Sui PTB builders for every Move entry function
lib/walrus.ts            Aggregator reads (Walrus blob → bytes/text)
```

---

## Local setup

```bash
git clone <repo>
cd Pensui
pnpm install
cp .env.example .env.local   # fill in values
pnpm dev                     # → http://localhost:3000
```

### Env vars

```env
# Sui contracts (live testnet deploy)
NEXT_PUBLIC_PACKAGE_ID=0x74436d222b29a2582531823c73e18e882d77205df2bbeb47f584249266fcc6a9
NEXT_PUBLIC_PLATFORM_ID=0xa0abdf36bac2f3c3b4014909155af0c6ac7133a28ca2e447e5edebe3827ff4ad
NEXT_PUBLIC_SUI_NETWORK=testnet

# Tatum — free testnet key at dashboard.tatum.io
NEXT_PUBLIC_TATUM_RPC=https://sui-testnet.gateway.tatum.io
NEXT_PUBLIC_TATUM_API_KEY=t-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Walrus testnet
NEXT_PUBLIC_WALRUS_AGGREGATOR=https://aggregator.walrus-testnet.walrus.space
WALRUS_PUBLISHER=https://publisher.walrus-testnet.walrus.space
```

> `NEXT_PUBLIC_TATUM_API_KEY` is exposed in the browser bundle. For production,
> proxy the gateway through a server-side route.

---

## Deploying to Vercel

```bash
npm i -g vercel
vercel link
```

Add the env vars above in the Vercel dashboard, then:

```bash
vercel --prod
```

`@mysten/walrus` and `@mysten/walrus-wasm` are listed in `serverExternalPackages`
in `next.config.ts` so the WASM dependency is not bundled into the server runtime.

---

## Re-deploy contracts (optional)

```bash
cargo install --git https://github.com/MystenLabs/sui.git --branch testnet sui --locked
sui client new-env --alias testnet --rpc https://fullnode.testnet.sui.io:443
sui client switch --env testnet
# Fund: https://faucet.sui.io/
sui client publish --gas-budget 200000000 contracts/ --json > publish.json
```

Paste the new `PACKAGE_ID` and `PlatformConfig` object ID from `objectChanges`
into `.env.local`. Delete `contracts/Published.toml` first if republishing fresh.

---

## Demo flow

1. **Home** — live Tatum network status in the footer
2. **Explore** — sample articles from Sui events + Walrus aggregator
3. **Open an article** — body streams from Walrus
4. **Mint** an article NFT — wallet signs; fees split creator / treasury
5. **Write** — compose and publish (Walrus register + certify, then `content::publish`)
6. **Collection** — view minted NFTs

---

## Tech stack

- **Sui Move** — `pensui::{platform, content, subscription, profile}`
- **Walrus** — `@mysten/walrus` SDK, wallet-signed user-paid uploads
- **Tatum** — Sui Testnet Gateway with `x-api-key` on the JSON-RPC transport
- **Next.js 16** + React 19 + TipTap + Framer Motion + Tailwind v4 + dapp-kit

## Caveats

- Tatum API key is browser-exposed on testnet; use a server-side proxy in production
- `/api/upload-image` posts to the public Walrus publisher for editor inline images; article bodies use the wallet-signed SDK path
- `CreatorProfile` counters are derived from event queries rather than auto-incremented on-chain

---

Built for the **Tatum × Walrus hackathon** (May 23 – June 6, 2026).

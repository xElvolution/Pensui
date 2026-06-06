<div align="center">

![PENSUI — The Immutable Writer](public/pensui-banner.png)

**Decentralized media publishing on Sui. Stored on Walrus. Indexed via Tatum.**

</div>

# PENSUI

PENSUI is a wallet-native publishing platform where writers own every byte of
their work. Articles live as Reed–Solomon–encoded blobs on Walrus, anchor as
shared `Content` objects on Sui, and earn through four on-chain primitives:
**mint-to-collect (NFT)**, **tips**, **pay-per-read**, and **subscriptions**.

Every RPC read in the running app flows through the **Tatum** Sui gateway
(`x-api-key` header injected at the transport layer).
Every upload is signed by the user's wallet through the official
`@mysten/walrus` SDK — no central publisher in the loop.

Built for the **Tatum × Walrus hackathon** (May 23 – June 6, 2026).

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

## How this maps to judging criteria

### Walrus integration (30%) — core, not an add-on

| What | Where |
|---|---|
| Wallet-signed blob uploads via the official `@mysten/walrus` SDK | `lib/walrus-upload.ts`, `app/write/page.tsx` |
| Browser-friendly `writeBlobFlow` — encode → register (wallet sig #1) → upload → certify (wallet sig #2) | `uploadBlobToWalrus()` in `lib/walrus-upload.ts` |
| User pays SUI gas + WAL storage from their own wallet (no central publisher) | Sign popups in the publish flow |
| Quilt (`writeFilesFlow`) helper ready for batched article + media uploads | `uploadQuiltToWalrus()` in `lib/walrus-upload.ts` |
| Reads via the Walrus aggregator | `lib/walrus.ts::readFromWalrus` |
| Sui `Content` objects reference Walrus `blob_id` directly on-chain | `contracts/sources/content.move` |

The README of `@mysten/walrus` itself notes the SDK is the right choice
"where users need to pay for their own storage directly" — that's exactly the
PENSUI model.

### Tatum integration (30%) — every RPC read goes through it

| What | Where |
|---|---|
| Tatum Sui Gateway with `x-api-key` header injection at transport | `lib/sui-client.ts::makeSuiTransport` |
| `SuiClientProvider` constructed with a custom client factory so dapp-kit uses Tatum too | `components/providers.tsx::createClient` |
| All five live-data pages route reads through Tatum (explore, dashboard, collection, article, profile) | App pages |
| Live status pill in the footer polls `getLatestCheckpointSequenceNumber` via Tatum every 10s | `components/layout/network-status.tsx` |

Concrete: `curl -X POST $TATUM_RPC -H "x-api-key: $KEY"` is the exact path every
wallet read takes. There is no plain `https://fullnode.testnet.sui.io` in the
hot path.

### Technical quality (30%)

- Four-module Move package: `platform`, `content`, `subscription`, `profile`
- Platform-level fee splitting in basis points (5% mint, 2.5% tip, 10% sub, 5% read), routed through a shared `PlatformConfig` on every payment
- `AdminCap` + `UpgradeCap` retained by deploy address for fee tuning + future upgrades
- Reactive state via `@tanstack/react-query` (already provided by dapp-kit)
- Event-driven discovery (`ContentPublished`) — no centralized index
- TypeScript strict, no `any` in app code, clean dependency graph

### Innovation / completeness (~10%) and Presentation (~30%)

- End-to-end: write → upload → mint/tip/read/subscribe in one app
- Wallet-native UX: shareable Sui addresses, faucet shortcuts, live network ping
- Polished landing, editor with TipTap, animated transitions via Framer Motion
- Built-in `Faucets` dropdown in the navbar so judges can grab testnet SUI + WAL with one click
- **AI writing assistant** (chat + grammar) backed by OpenAI, **gated by an on-chain Subscription** — see PENSUI Pro below

---

## PENSUI Pro — AI features paid on-chain

The `/write` page ships with a collapsible AI sidebar:

- **Chat** (`/api/ai/chat`): streaming GPT-4o-mini (free) / GPT-4o (Pro). Highlight text in the editor to send it as context.
- **Grammar / spelling / clarity / fact-check** (`/api/ai/grammar`): debounced 2.5s after typing stops, returns issues with `apply →` click-to-replace.

### Tiers

| Tier | Daily AI requests | Chat model |
|---|---|---|
| Free | 30 / day per wallet | `gpt-4o-mini` |
| Pro | 300 / day per wallet | `gpt-4o` |

### How Pro is paid

Pro is **a real on-chain Subscription** to a designated PRO wallet. The "subscribe to a creator" primitive in `pensui::subscription` is being used verbatim — the platform itself acts as the creator. Same Move call, same tx pattern, just routed to the PRO_RECIPIENT address.

- Price: **2 SUI / 30 days** (configurable via `NEXT_PUBLIC_PRO_PRICE_SUI`, `NEXT_PUBLIC_PRO_DURATION_DAYS`)
- Recipient: `NEXT_PUBLIC_PRO_RECIPIENT` (defaults to the deploy wallet)
- Server checks Pro status by calling `getOwnedObjects` (via Tatum) and looking for a `Subscription` whose `creator == PRO_RECIPIENT` and `expires_at > now`

### Pro badge
The Pro badge (`✦ PRO`) renders anywhere we surface a wallet — navbar, profile cards, AI sidebar header — whenever the on-chain check confirms an active subscription. The badge is derived from chain state, not stored anywhere.

### WAL payment option (coming in v2)

The current `subscription::subscribe` only accepts `Coin<SUI>`. To add WAL we'd need to upgrade the Move package and add a sibling function `subscribe_with_wal(Coin<WAL>)`. We have the `UpgradeCap` for this — it's deferred to v2 to avoid risking the live demo data (13 articles, 6 creators) seeded for the submission. The UI hints at it from the Pro page footer.

### OpenAI key (server-only)

```env
OPENAI_API_KEY=sk-proj-...
```

Never prefix with `NEXT_PUBLIC_`. The API routes (`app/api/ai/chat/route.ts`, `app/api/ai/grammar/route.ts`) read the key from the Node runtime; the browser bundle never sees it.

### Quota

The server keeps a per-wallet daily counter (in-memory `Map`, resets at UTC midnight). For production this would be Redis. The wallet address is read from an `x-wallet-address` request header — *not* cryptographically authenticated, suitable for a hackathon demo only. Production would require a signed message to prove address ownership.

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
# 1. Clone, install
git clone <repo>
cd Pensui
pnpm install

# 2. Add .env.local (copy .env.example and fill in)
cp .env.example .env.local

# 3. Run
pnpm dev
# → http://localhost:3000
```

### Env vars

```env
# Sui contracts (these IDs are the live testnet deploy)
NEXT_PUBLIC_PACKAGE_ID=0x74436d222b29a2582531823c73e18e882d77205df2bbeb47f584249266fcc6a9
NEXT_PUBLIC_PLATFORM_ID=0xa0abdf36bac2f3c3b4014909155af0c6ac7133a28ca2e447e5edebe3827ff4ad
NEXT_PUBLIC_SUI_NETWORK=testnet

# Tatum — get a free testnet key at dashboard.tatum.io
NEXT_PUBLIC_TATUM_RPC=https://sui-testnet.gateway.tatum.io
NEXT_PUBLIC_TATUM_API_KEY=t-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Walrus testnet public endpoints
NEXT_PUBLIC_WALRUS_AGGREGATOR=https://aggregator.walrus-testnet.walrus.space
WALRUS_PUBLISHER=https://publisher.walrus-testnet.walrus.space

# PENSUI Pro (AI features)
NEXT_PUBLIC_PRO_RECIPIENT=0x17c7eff1194133626099cfa9eb6976d773fa62cc6fdd7bb05f7a2f5c3a3cc2cb
NEXT_PUBLIC_PRO_PRICE_SUI=2
NEXT_PUBLIC_PRO_DURATION_DAYS=30

# OpenAI (server-only — NEVER prefix with NEXT_PUBLIC_)
OPENAI_API_KEY=sk-proj-replace-with-your-key
```

> The Tatum key shipped in `.env.local` will be exposed in the browser bundle
> (`NEXT_PUBLIC_*` prefix). In production you would proxy the gateway through a
> server-side route; for the hackathon demo, direct exposure of a free testnet
> key is the accepted trade-off.

---

## Deploying the frontend to Vercel

```bash
# One-time
npm i -g vercel
vercel link        # connect this repo to a Vercel project
```

Then add the env vars from `.env.example` in the Vercel dashboard
(Project Settings → Environment Variables). All five `NEXT_PUBLIC_*` vars are
required; `WALRUS_PUBLISHER` is the only server-side var.

```bash
vercel --prod
```

Notes:

- `@mysten/walrus` and `@mysten/walrus-wasm` are in `serverExternalPackages` in
  `next.config.ts` — required so the WASM dependency isn't bundled into the
  server runtime.
- The Tatum API key in `NEXT_PUBLIC_TATUM_API_KEY` ships to the browser. For
  production you'd add a proxy route — see "Caveats" below.

---

## Re-deploy the contracts (optional)

Each module is `contracts/sources/*.move`. Build + publish from the deploy
wallet:

```bash
# Install Sui CLI
cargo install --git https://github.com/MystenLabs/sui.git --branch testnet sui --locked

# Configure (first run)
sui client new-env --alias testnet --rpc https://fullnode.testnet.sui.io:443
sui client switch --env testnet

# Fund the active address: https://faucet.sui.io/

# Build + publish
sui client publish --gas-budget 200000000 contracts/ --json > publish.json
```

The `objectChanges` array contains the new `PACKAGE_ID`, `PlatformConfig`
shared object, `AdminCap`, and `UpgradeCap` — paste the first two into
`.env.local`.

> Note: if `contracts/Published.toml` exists from a prior publish, delete it
> first so the CLI treats this as a fresh package.

---

## Demo flow

For a 2-minute walkthrough, hit these in order:

1. **Land** — homepage, watch the "via Tatum" network status pill bottom-right pulse with the live checkpoint
2. **Explore** — three sample articles (the three I pre-published from the deploy wallet) loaded from Sui events + Walrus aggregator, all reads via Tatum
3. **Open an article** — content streams from Walrus
4. **Mint** the "Why we store on Walrus" article (0.5 SUI) — wallet pops, fees split 95/5 creator/treasury
5. **Write** a new article — title, body, optional pricing → **Publish**
   - "Encoding blob (Reed–Solomon)…"
   - Wallet popup #1: Walrus register
   - "Uploading slivers to Walrus nodes…"
   - Wallet popup #2: Walrus certify
   - Wallet popup #3: Sui `content::publish`
   - Redirect to Explore — your article appears with `total_mints: 0` and the Walrus `blob_id` linked
6. **Collection** — your minted NFT shows up

---

## Tech stack

- **Sui Move** — `pensui::{platform, content, subscription, profile}`
- **Walrus** — `@mysten/walrus` SDK, `writeBlobFlow` for wallet-signed user-paid uploads
- **Tatum** — Sui Testnet Gateway with `x-api-key` injected at the JSON-RPC transport
- **Next.js 16** + React 19 + TipTap + Framer Motion + Tailwind v4 + dapp-kit
- **Deploy wallet** — `0x17c7eff1…3a3cc2cb` (holds `AdminCap` + `UpgradeCap`)

## Caveats and trade-offs

- Tatum key is browser-exposed (testnet only — a server-side proxy route is the
  production fix)
- One server-side fallback remains: `/api/upload-image` still POSTs to the
  public Walrus publisher for editor inline images. The article body itself
  uses the wallet-signed SDK path.
- Cross-creator counters on `CreatorProfile` are not auto-incremented from
  `content` / `subscription` — the dashboard derives counts from event queries
  instead, which is more reliable in a fully-decentralized model.

---

Built end-to-end on 2026-06-03 → 2026-06-06 for the **Tatum × Walrus
hackathon**. Three sponsor protocols, one writer-owned content unit.

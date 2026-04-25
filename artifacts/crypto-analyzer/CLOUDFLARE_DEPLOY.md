# Deploying crypto-analyzer to Cloudflare Pages

This is a static build of the Vite React app. The backend (api-server,
GraphQL, on-chain indexer) stays on Replit — Pages is frontend only.

---

## 1. Cloudflare Pages project settings

When you create the project in the Cloudflare dashboard → **Workers & Pages**
→ **Create → Pages → Connect to Git**:

| Setting | Value |
| --- | --- |
| Repository | `onedeploy1010/RUNE` |
| Production branch | `main` |
| Framework preset | **None** (don't let Pages auto-detect — our build is custom) |
| Build command | `corepack enable && pnpm install --no-frozen-lockfile && pnpm -C artifacts/crypto-analyzer run build` |
| Build output directory | `artifacts/crypto-analyzer/dist/public` |
| Root directory (advanced) | leave blank (monorepo root) |

`corepack enable` activates pnpm inside Pages' build sandbox (Cloudflare
ships Node with corepack but pnpm is opt-in). `--no-frozen-lockfile` lets
pnpm heal the lockfile if a transitive version drifts — Cloudflare's
Linux x64 builder matches our `pnpm-workspace.yaml` platform overrides so
installs should be clean either way.

---

## 2. Environment variables (Pages → Settings → Environment variables)

Set these for **Production**. For **Preview** you can copy the same values
or point `VITE_API_BASE_URL` to a staging backend.

### Required (build must read these or it will throw)

```
BASE_PATH=/
PORT=8080
NODE_VERSION=22
```

`BASE_PATH` and `PORT` come from `vite.config.ts` — it hard-throws if either
is missing, even during a pure static build. `NODE_VERSION=22` pins Pages to
a Node that supports the repo's TypeScript and Vite versions.

### App config

```
VITE_SUPABASE_URL=https://wxdefpyjntxvowayvvcc.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<your sb_publishable_... key>
VITE_THIRDWEB_CLIENT_ID=<your thirdweb client id>
VITE_RUNE_CHAIN=bsc_mainnet
VITE_API_BASE_URL=
```

`VITE_API_BASE_URL` handling:

- **Leave empty** for the first test deploy — wallet connect, on-chain reads,
  and purchase flow all work without an API. Only the indexed team-stats
  page needs the backend, and it will show an empty state.
- **Set to Replit's URL** once you have a stable api-server address, e.g.
  `https://<your-repl>.replit.dev`. CORS on the api-server is already
  permissive (`app.use(cors())` allows all origins).

---

## 3. Files committed to the repo (already done for you)

- `public/_redirects` — SPA fallback so `/projects`, `/recruit`, etc. all
  serve `index.html` with a 200 instead of Cloudflare's 404.
- `public/_headers` — long-cache `/assets/*`, no-cache HTML, basic security
  headers.

Vite copies everything in `public/` verbatim into the build output, so these
land at the root of `dist/public/` automatically.

---

## 4. Deploy checklist

- [ ] Push latest to `main` on GitHub (this commit or later).
- [ ] Cloudflare dashboard → Pages → connect repo with the settings above.
- [ ] Add the environment variables listed in section 2.
- [ ] Click **Save and Deploy** — first build takes ~3–5 min (pnpm install
  is the slow part).
- [ ] Open `<project-name>.pages.dev` in a browser:
  - `/` should render the home page.
  - `/recruit` should render the recruit page with the amber Connect Wallet
    banner visible.
  - Connect MetaMask / TokenPocket, switch to BSC Testnet, verify the wallet
    panel loads your USDT balance and purchase status.

---

## 5. Known issues + workarounds

- **Build fails with "BASE_PATH environment variable is required"** — you
  forgot to add `BASE_PATH=/` in Pages env vars.
- **Build fails on install with a peer dependency error** — set the env var
  `NPM_FLAGS=--legacy-peer-deps` in Pages, or tweak the build command to
  `pnpm install --no-frozen-lockfile --no-strict-peer-dependencies && …`.
- **Runtime 404 on direct URL (e.g. `/recruit` reload)** — `_redirects`
  wasn't copied; confirm `dist/public/_redirects` exists after build.
- **Routes work but wallet connect fails** — `VITE_THIRDWEB_CLIENT_ID`
  missing or wrong; wallet button falls back to an inert "not configured"
  banner.

---

## 6. Later: point rune-ai.xyz at Pages

When you're ready to cut over:

1. Cloudflare → DNS → add a CNAME `rune-ai.xyz → <project>.pages.dev`
   (Cloudflare offers a one-click Custom Domain from the Pages project too).
2. Update Replit's DNS so `rune-ai.xyz` no longer points there; give the
   api-server a subdomain like `api.rune-ai.xyz` (CNAME to Replit's URL).
3. Update Pages env var `VITE_API_BASE_URL=https://api.rune-ai.xyz`.
4. Trigger a Pages redeploy (push any commit, or hit the redeploy button).

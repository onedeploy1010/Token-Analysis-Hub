# Crypto Project Analyzer (CryptTerm)

## Overview

A professional DeFi investment analysis platform targeting crypto investors. Features project discovery, economic simulation tools, and dedicated RUNE token analysis. Dark terminal aesthetic with electric cyan accents — Bloomberg meets DeFi.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite (artifacts/crypto-analyzer), Tailwind CSS, shadcn/ui, Recharts, Framer Motion, Wouter
- **API framework**: Express 5 (artifacts/api-server)
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Features

### Pages
- `/` — Dashboard: Market overview, trending projects, platform stats
- `/projects` — Project catalog: Filterable grid with risk ratings, APY, TVL
- `/projects/:id` — Project detail: Full metrics, description, risk analysis
- `/tools` — Economic Simulators (8 tools in 2 groups):
  - **General DeFi**: APY Calculator, Investment Simulator, Impermanent Loss Calculator
  - **Protocol Simulators** (from AFx-Simulator): Staking Projector (铸造收益预测), AAM Pool Simulator (流动性池模拟), CLMM Analyzer (集中流动性分析), Trading Profit Calculator (交易分红计算), Broker Earnings Calculator (推荐层级收益)
  - All protocol simulators have configurable token name + price inputs; pure client-side math via `src/lib/afx-calculations.ts`
- `/projects/rune` — RUNE Protocol deep analytics: 6 recharts charts (price stages, fund allocation, node returns, deflation, asset breakdown, stage ROI), interactive node-level calculator
- `/projects/b18` — B18 Token deep analytics: AMM price simulation, staking returns, release tax, V1–V10 reward tiers, 334 protocol, SPP buyback, interactive ROI calculator. Built with recharts using data from b18-shared/schema.ts

### API Routes
- `GET /api/projects` — List all projects (filter by category, sort)
- `GET /api/projects/stats/summary` — Market summary stats
- `GET /api/projects/:id` — Single project details
- `POST /api/tools/apy-calculator` — APY compounding calculator
- `POST /api/tools/investment-simulator` — Multi-year investment projection
- `POST /api/tools/impermanent-loss` — IL calculator for LP positions
- `GET /api/rune/overview` — RUNE token key metrics
- `POST /api/rune/calculator` — RUNE yield calculator (Bond/Pool/LP modes)

## Database Tables
- `projects` — Crypto project catalog with ratings, APY, TVL, risk levels

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Notes

- RUNE calculator is using mock data — user will provide real tokenomics formulas and data to update
- All calculator tools (APY, Investment Simulator, IL) are fully functional with real math
- Project data seeded with 12 real DeFi protocols

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

# G One Global — Hummingbot Control Center

Standalone control-plane UI for Hummingbot (Project 02), isolated under `control-center/` so the Hummingbot engine source remains untouched.

## Current foundation

- Responsive dashboard with Overview, Bots, Markets, Paper Trading, Analytics, Activity & Logs, Integrations and Settings views.
- Typed domain contracts in `src/domain.ts` for bots, paper orders, service health, settings and future API responses.
- Paper bot configurations can be created, paused, resumed and stopped as local demo state.
- Bot configurations persist in the current browser using versioned localStorage (`src/storage.ts`). This is **not** cloud persistence and does not sync between devices or users.
- A fail-closed API contract adapter is in `src/services/controlPlane.ts`; it intentionally reports unavailable until a real backend is configured.

## Safety and truthfulness

- Paper Trading only. Live execution is disabled; no exchange API credential fields are provided.
- Seeded portfolio values, prices, orders, P&L and activity are illustrative demo data, not exchange data.
- Bot controls only change local configuration state. They do not start, pause or stop a Hummingbot process.
- Hummingbot Engine, Hostless Worker, Lovable Cloud and market-data services remain disconnected until their integrations are implemented and verified.
- Never use the sample data to make real trading or investment decisions.

## Run locally

```bash
npm install
npm run dev
``

Production build check:

```bash
npm run build
``

## Architecture

- **Lovable / Control Plane:** UI, authentication, persistent database, bot configuration, analytics and control API.
- **Hostless / Execution Plane (later):** long-running Hummingbot worker only, once a suitable runtime is verified.
- **Hummingbot:** separate engine source; do not mix dashboard files into the engine root.

The next integration step is to replace the unconfigured adapter with authenticated Lovable Cloud endpoints and server-side validation. Do not mark an integration connected until a real health check succeeds.

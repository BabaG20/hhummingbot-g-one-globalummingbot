# G One Global — Hummingbot Control Center

Standalone control-plane UI for Hummingbot (Project 02), isolated under `control-center/` so the Hummingbot engine source remains untouched.

## Current foundation

- Responsive dashboard with Overview, Bots, Markets, Paper Trading, Analytics, Activity & Logs, Integrations and Settings views.
- Typed domain contracts in `src/domain.ts` for bots, paper orders, service health, settings and future API responses.
- Paper bot configurations can be created, paused, resumed and stopped as local demo state.
- Bot configurations persist in the current browser using versioned localStorage (`src/storage.ts`). Each bot can store its own order size, bid/ask spread, inventory target/cap and daily loss limit (`src/botConfiguration.ts`). This is **not** cloud persistence and does not sync between devices or users.
- Editable paper risk limits (daily loss, order notional, inventory and minimum spread) are validated and saved locally (`src/risk.ts`, `src/riskStorage.ts`). The pure pre-trade guard is used by the local preview only; no order flow currently submits an order.
- A local paper-order risk preview evaluates hypothetical order notional, projected daily loss, projected inventory and spread against the tighter of bot-level and workspace limits. It never submits an order (`src/botConfiguration.ts`).
- A strategy mapper drafts verified Hummingbot v2.18.0 Pure Market Making keys. The bot editor can select Binance, KuCoin, Kraken or Gate.io paper connectors and preview Hummingbot default paper balances (`src/paperTrading.ts`, `src/strategyMapper.ts`).
- A market-data provider manager (`src/marketData.ts`) tries Binance Public Spot first and automatically falls back to Kraken Public Ticker when Binance fails. Both are public read-only endpoints and require no API credentials. The Markets watchlist polls BTC-USDT, ETH-USDT, SOL-USDT and BNB-USDT every 15 seconds, validates ticker payloads, shows the actual responding provider and timestamp, and never substitutes demo prices when both providers fail. Kraken 24-hour percentage change is calculated from its returned open and close prices. Response latency is measured with the browser performance clock for successful requests.
- The Markets page includes a provider health monitor showing observed successful/failed watchlist pairs, average response latency, last-success time, provider errors, cache hit/miss counts, request counts and active provider cooldowns. Kraken is shown as standby when it was not needed; it is not falsely marked healthy without a request. Health is limited to the four watched pairs and the latest polling cycle, not an uptime SLA.\n- Market requests use an in-memory per-pair cache with an 8-second TTL and per-provider exponential cooldown after errors (15 seconds initially for HTTP 429, 5 seconds for other failures, capped at 60 seconds). The primary is skipped while cooling down so the fallback can be tried. Only fresh successful responses are cached; stale entries are discarded and never returned to the bot editor. Cache and cooldown state resets when the browser page reloads.
- The bot editor also polls the selected pair through the same Binance-first/Kraken-fallback provider manager every 15 seconds. Only a fresh quote (under 30 seconds old) can populate the PMM draft `order_amount`; stale/offline data is not mapped. The price calculator shows indicative bid/ask values from the configured spread (`src/marketPricing.ts`). USD, USDT and USDC quote assets are treated as approximately 1:1; other quote assets are blocked until a verified conversion exists. `order_refresh_time` remains unset pending a dedicated refresh-interval setting.
- A fail-closed API contract adapter is in `src/services/controlPlane.ts`; it intentionally reports unavailable until a real backend is configured.

## Safety and truthfulness

- Paper Trading only. Live execution is disabled; no exchange API credential fields are provided.
- Seeded portfolio values, prices, orders, P&L and activity are illustrative demo data, not exchange data.
- Bot controls only change local configuration state. They do not start, pause or stop a Hummingbot process.
- Stop actions ask for confirmation. Bot-level settings are validated against workspace risk limits before local save, but neither bot nor workspace limits are server-side enforcement and cannot prevent execution; enforce the same limits in the backend/worker before connecting any order route.
- Hummingbot Engine, Hostless Worker and Lovable Cloud remain disconnected. The Binance public market-data client is implemented in the browser but its runtime connectivity must be confirmed in the deployed app; provider access may be restricted by network, CORS, pair availability or rate limits. Kraken fallback and live browser connectivity still require runtime verification.
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

The mapper is a non-runnable draft only. Before any engine integration, verify deployed Binance market-data connectivity, add quote-currency conversion, order refresh interval, and server/worker risk enforcement. Then replace the unconfigured adapter with authenticated Lovable Cloud endpoints and server-side validation. Do not mark an integration connected until a real health check succeeds.

# G One Global — Hummingbot Paper Worker

An authenticated HTTP adapter for the official Hummingbot `hbot` CLI. It is intentionally limited to one `simple_pmm` paper-trading bot per worker/container.

## Security and operating model

- Deploy one dedicated worker/container per bot. Hummingbot documents one bot per installation; multiple bots require multiple isolated installs/containers.
- Only `binance_paper_trade`, `kucoin_paper_trade`, `kraken_paper_trade`, and `gate_io_paper_trade` are accepted.
- This worker has no endpoint for exchange credentials, live connectors, arbitrary shell commands, arbitrary executable paths, file upload, or config editing.
- Every `/v1/*` request requires `Authorization: Bearer <GONE_WORKER_TOKEN>`. Use a randomly generated secret of at least 32 characters and store it only as a platform secret.
- Terminate HTTPS at the hosting platform ingress. Do not expose this worker over plain public HTTP.
- The worker calls `hbot` with an argv list and `shell=False`; it never interpolates user text into a shell command.
- `HBOT_PASSWORD` may be set as a deployment secret if the Hummingbot CLI requires non-interactive keystore initialization. It is never accepted from API requests or returned.
- Mount Hummingbot `conf/`, `data/`, and `logs/` on persistent storage. Do not share one Hummingbot data directory between workers.
- `/health` is a minimal unauthenticated platform health probe. All control/status routes require bearer auth.

## Environment

| Variable | Required | Purpose |
|---|---:|---|
| `GONE_WORKER_TOKEN` | yes | Random bearer secret, minimum 32 characters |
| `PORT` | no | HTTP port; defaults to 8080 |
| `HBOT_HOME` | no | Hummingbot working directory; defaults to `/home/hummingbot` |
| `HBOT_BIN` | no | CLI executable; defaults to `hbot` |
| `HBOT_PASSWORD` | when needed | Hummingbot keystore password, deployment secret only |
| `WORKER_STATE_PATH` | no | Persistent worker ownership state file |

## API

### `POST /v1/bot/config`

Creates one config through `hbot create simple_pmm`. Example body:

```json
{
  "name": "btc_paper",
  "exchange": "binance_paper_trade",
  "trading_pair": "BTC-USDT",
  "order_amount": 0.001,
  "bid_spread": 0.004,
  "ask_spread": 0.004,
  "order_refresh_time": 15
}
```

`order_amount` is in base-asset units. `bid_spread` and `ask_spread` are decimal fractions, not percentage points. The worker caps each spread at `0.05` (5%) as a conservative paper-trading guard. The dashboard must convert its USD notional using a fresh, verified quote price before calling this endpoint.

### `POST /v1/bot/start`

Starts only the config previously created and recorded by this worker, using `hbot start <config>`.

### `GET /v1/status`

Calls `hbot status --json` and returns parsed JSON when available.

### `POST /v1/bot/stop`

Calls `hbot stop` for this worker installation.

### `GET /health`

Returns only `{"ok":true}` for hosting-platform health probes. It does not claim that Hummingbot is running.

## Deployment boundary

This repository contains the worker source, not a deployed service. Deploy it only in a Hostless environment that can run the pinned Hummingbot image/installation and persist `conf/`, `data/`, and `logs/`. The deployment must verify the installed Hummingbot version and `hbot --help` before enabling traffic. The dashboard must remain disconnected until an authenticated health/status round trip succeeds.

## Limitations

- One bot per worker; scale by provisioning isolated workers, not by starting multiple bots in one installation.
- No log-tail endpoint is exposed yet; this avoids a long-running or unbounded subprocess until log retrieval is designed against the pinned CLI version.
- This worker does not implement trading logic, risk controls, market data, or order routing. Hummingbot `simple_pmm` remains the strategy engine.
- No live trading. Never change the connector allowlist without an explicit product/security review.

## Local syntax check

```bash
python3 -m py_compile server.py
python3 -m unittest -v
```
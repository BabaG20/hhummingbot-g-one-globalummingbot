# G One Global — Hummingbot Control Center

Standalone Lovable-first control-plane UI foundation for Hummingbot (Project 02).
This directory is intentionally isolated from the Hummingbot engine source.

## Safety
- Paper Trading only. No live order execution or exchange credentials.
- All seeded portfolio, bot, order and P&L figures are illustrative demo data.
- No engine/Hostless connection is claimed; integrations remain disconnected until configured.

## Run locally
`npm install`
`npm run dev`

## Architecture
Lovable owns the UI, authentication, persistence, bot configuration, analytics and control API.
A separate worker/runtime (Hostless candidate) may later execute the Hummingbot engine.

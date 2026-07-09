# YAAS — Human-as-a-Service Platform

**YAAS** lets AI agents request real-world human tasks via MCP. Clone this repo, deploy the API and apps to public HTTPS endpoints, configure your URLs in `.env`, then connect any MCP client using `requestHuman`.

- **Production:** [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)
- **Local dev:** [docs/LOCAL_DEV.md](docs/LOCAL_DEV.md) (optional, same-machine only)

## Architecture

- **API** — Hono REST API + BullMQ workers (Fly.io)
- **MCP** — `requestHuman` tool for Claude/GPT agents
- **Worker PWA** — Elderly-friendly task app (Vite + React)
- **Agent Dashboard** — Register agents, manage tasks, MCP setup
- **Payments** — Stripe Connect escrow (USDC deferred to v1.1)

## Quick Start (Production)

1. Copy [`.env.example`](.env.example) and set your public URLs
2. Deploy API to Fly.io — see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)
3. Deploy dashboard + worker PWA to Cloudflare Pages with `VITE_API_URL=https://api.your-domain.com`
4. Register an agent at your dashboard URL, copy the API key
5. Connect MCP (see below)

## MCP Configuration

`YAAS_API_URL` must point to your **public** API — not localhost — for agents and mobile workers on different machines.

Add to Claude Desktop (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "yaas": {
      "command": "npx",
      "args": ["tsx", "/path/to/YaaS/apps/mcp/src/index.ts"],
      "env": {
        "YAAS_API_URL": "https://api.your-domain.com",
        "YAAS_API_KEY": "sk_yaas_..."
      }
    }
  }
}
```

### requestHuman Tool

```json
{
  "taskType": "verify",
  "description": "Photograph storefront at 123 Main St",
  "location": { "lat": 37.7749, "lng": -122.4194, "radius_km": 1 },
  "budget_usd": 5,
  "urgency": "sync_60s",
  "proofRequired": "photo"
}
```

## API Reference

Base URL: `https://api.your-domain.com/v1`

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /agents/register | — | Create agent, get API key |
| GET | /agents/me | API Key | Agent profile |
| PATCH | /agents/me/budget | API Key | Set budget caps |
| GET | /agents/me/tasks | API Key | List tasks |
| POST | /tasks | API Key | Create task + escrow |
| GET | /tasks/:id | API Key | Task status + result |
| POST | /workers/register | — | Worker signup |
| POST | /workers/login | — | Worker login |
| GET | /workers/feed | JWT | Open tasks |
| POST | /tasks/:id/claim | JWT | Claim task |
| PATCH | /tasks/:id/complete | JWT | Submit proof |
| GET | /workers/me/earnings | JWT | Payout history |
| GET | /health | — | Health check |

## Environment Variables

| Variable | Description |
|----------|-------------|
| `PUBLIC_API_URL` | Public HTTPS base URL for API (proof links, redirects) |
| `CORS_ORIGINS` | Comma-separated allowed origins (dashboard + PWA URLs) |
| `WORKER_APP_URL` | Deployed worker PWA URL (Stripe Connect redirects) |
| `YAAS_API_URL` | Same as `PUBLIC_API_URL` — used by MCP client |
| `DATABASE_URL` | PostgreSQL connection string (Neon) |
| `REDIS_URL` | Redis connection string (Upstash) |
| `JWT_SECRET` | Worker JWT signing secret |
| `STRIPE_SECRET_KEY` | Stripe API secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `R2_PUBLIC_URL` | Public CDN URL for proof media |
| `VITE_API_URL` | API URL baked into frontends at build time |
| `SKIP_STRIPE` | Bypass Stripe in dev/test |
| `SKIP_QUEUES` | Process verification inline (test mode) |

See [`.env.example`](.env.example) for production template and [`.env.local.example`](.env.local.example) for local dev.

## Testing

```bash
# E2E test (requires Docker Postgres) — see docs/LOCAL_DEV.md
docker compose up -d
SKIP_STRIPE=true SKIP_QUEUES=true pnpm --filter @yaas/api test

# Load test (API must be running at your configured URL)
YAAS_API_URL=https://api.your-domain.com YAAS_API_KEY=sk_yaas_... \
  tsx apps/api/tests/load/concurrent-tasks.ts
```

## Elderly-Friendly Worker UI

- 56px minimum tap targets
- 18px base font, high contrast
- Max 3 items per screen
- Single primary CTA per view

## License

MIT — see [LICENSE](LICENSE).

# YAAS — Human-as-a-Service Platform

MCP-compatible API that lets AI agents post tasks for humans, route to qualified workers, and release payment on verified completion.

## Architecture

- **API** — Hono REST API + BullMQ workers (Fly.io)
- **MCP** — `requestHuman` tool for Claude/GPT agents
- **Worker PWA** — Elderly-friendly task app (Vite + React)
- **Agent Dashboard** — Register agents, manage tasks, MCP setup
- **Payments** — Stripe Connect escrow (USDC deferred to v1.1)

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 9+
- Docker (for Postgres + Redis)

### Setup

```bash
# Clone and install
pnpm install

# Start Postgres + Redis
docker compose up -d

# Run migrations
DATABASE_URL=postgresql://yaas:yaas@localhost:5432/yaas pnpm db:migrate

# Copy env and configure
cp .env.example .env
# Set SKIP_STRIPE=true for local dev without Stripe keys

# Start all apps
SKIP_STRIPE=true pnpm dev
```

Services:
- API: http://localhost:3000
- Agent Dashboard: http://localhost:5173
- Worker PWA: http://localhost:5174

### Register an Agent

1. Open http://localhost:5173
2. Register and save your API key
3. Configure MCP (see MCP Setup page)

### Register a Worker

1. Open http://localhost:5174
2. Create account
3. Browse and claim tasks

## MCP Configuration

Add to Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "yaas": {
      "command": "npx",
      "args": ["tsx", "/path/to/YAAS/apps/mcp/src/index.ts"],
      "env": {
        "YAAS_API_URL": "http://localhost:3000",
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

Base URL: `/v1`

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

## Testing

```bash
# E2E test (requires Docker Postgres)
docker compose up -d
DATABASE_URL=postgresql://yaas:yaas@localhost:5432/yaas_test \
  SKIP_STRIPE=true SKIP_QUEUES=true \
  pnpm --filter @yaas/api test

# Load test (API must be running)
YAAS_API_KEY=sk_yaas_... tsx apps/api/tests/load/concurrent-tasks.ts
```

## Deployment

### Fly.io (API)

```bash
fly launch --config fly.toml
fly secrets set DATABASE_URL=... REDIS_URL=... STRIPE_SECRET_KEY=... JWT_SECRET=...
fly deploy
```

### Managed Services

- **Neon** — PostgreSQL
- **Upstash** — Redis for BullMQ
- **Cloudflare R2** — Proof media storage
- **Cloudflare Pages** — Agent dashboard + Worker PWA static deploy

## Environment Variables

| Variable | Description |
|----------|-------------|
| DATABASE_URL | PostgreSQL connection string |
| REDIS_URL | Redis connection string |
| JWT_SECRET | Worker JWT signing secret |
| STRIPE_SECRET_KEY | Stripe API secret key |
| STRIPE_WEBHOOK_SECRET | Stripe webhook signing secret |
| R2_* | Cloudflare R2 credentials |
| SKIP_STRIPE | Bypass Stripe in dev/test |
| SKIP_QUEUES | Process verification inline (test mode) |

## Elderly-Friendly Worker UI

- 56px minimum tap targets
- 18px base font, high contrast
- Max 3 items per screen
- Single primary CTA per view

## License

MIT — see [LICENSE](LICENSE).


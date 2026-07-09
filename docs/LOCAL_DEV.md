# Local Development

Use this guide only on your machine. For real agent + worker flows with MCP and mobile workers, [deploy to public URLs first](DEPLOYMENT.md).

## Prerequisites

- Node.js 20+
- pnpm 9+
- Docker (for Postgres + Redis)

## Setup

```bash
# Clone and install
git clone https://github.com/Charleschtsoi/YaaS.git
cd YaaS
pnpm install

# Start Postgres + Redis
docker compose up -d

# Configure local env
cp .env.local.example .env

# Run migrations
pnpm db:migrate

# Start all apps
pnpm dev
```

## Local URLs

| Service | URL |
|---------|-----|
| API | http://localhost:3000 |
| Agent Dashboard | http://localhost:5173 |
| Worker PWA | http://localhost:5174 |

## Register an Agent (local)

1. Open http://localhost:5173
2. Register and save your API key
3. Configure MCP (MCP Setup page) — localhost works only on this machine

## Register a Worker (local)

1. Open http://localhost:5174
2. Create account
3. Browse and claim tasks

## MCP (local dev only)

When Claude Desktop and the API run on the **same machine**, you can use localhost:

```json
{
  "mcpServers": {
    "yaas": {
      "command": "npx",
      "args": ["tsx", "/path/to/YaaS/apps/mcp/src/index.ts"],
      "env": {
        "YAAS_API_URL": "http://localhost:3000",
        "YAAS_API_KEY": "sk_yaas_..."
      }
    }
  }
}
```

For any multi-user or mobile-worker scenario, use a [public API URL](DEPLOYMENT.md) instead.

## Local env variables

See [`.env.local.example`](../.env.local.example):

```bash
SKIP_STRIPE=true    # Bypass Stripe without test keys
SKIP_QUEUES=true    # Process verification inline (optional)
PUBLIC_API_URL=http://localhost:3000
CORS_ORIGINS=http://localhost:5173,http://localhost:5174,http://localhost:3000
```

## Running tests

```bash
docker compose up -d
SKIP_STRIPE=true SKIP_QUEUES=true pnpm --filter @yaas/api test
```

E2E tests skip automatically if Postgres is not available.

## Load test (local API must be running)

```bash
# Register an agent first, then:
YAAS_API_URL=http://localhost:3000 YAAS_API_KEY=sk_yaas_... \
  tsx apps/api/tests/load/concurrent-tasks.ts
```

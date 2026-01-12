# tuvi-ai monorepo

Monorepo MVP for Tuvi AI with Web (user), Admin (CMS), API, and Worker.

## Requirements
- Node.js 20+
- pnpm 9+
- Docker + Docker Compose

## Quick Start
1) `cd infra && docker compose up -d`
2) `cp .env.example .env` and update values
3) `pnpm install`
4) `pnpm db:migrate`
5) `pnpm db:seed`
6) `pnpm dev`

Apps:
- Web (user): http://localhost:3000
- API: http://localhost:3001
- Admin: http://localhost:3002

## Environment Variables
See `.env.example` for defaults.

Required:
- `DATABASE_URL`
- `REDIS_URL`
- `ADMIN_TOKEN`
- `OPENAI_API_KEY`
- `AI_MODEL`
- `NEXT_PUBLIC_API_BASE_URL`

## Admin Auth
All `/admin/*` API routes require header:

```
x-admin-token: <ADMIN_TOKEN>
```

The admin UI lets you paste the token into the input field and uses it for API calls.

## Scripts
- `pnpm dev`: run all apps via Turbo
- `pnpm db:migrate`: run Prisma migrations
- `pnpm db:seed`: seed admin user and active prompt version
- `pnpm lint`: lint (placeholder)
- `pnpm typecheck`: typecheck
- `pnpm build`: build

## Worker Notes
If `OPENAI_API_KEY` is missing, readings are marked FAILED with a helpful message.

## TODO
- RAG/KB ingestion pipeline
- Embeddings storage in pgvector
- Retrieval-augmented prompt assembly

## Troubleshooting
- Ensure Docker services are running: `docker compose ps`
- If API cannot connect to DB, verify `DATABASE_URL` and Postgres is up.
- If Worker cannot connect to Redis, verify `REDIS_URL` and Redis is up.

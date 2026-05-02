# Nightly

A small dynamic-pricing API for boutique hotels. Room rates flex with occupancy, day of week, and the weather — rainy weekends drop the price, sunny holidays bump it up.

I'm building this as a portfolio piece to dig into Node.js and TypeScript on the backend, and to have something concrete to walk through in interviews. The stack is intentionally a bit "all the things you'd see in a real production service" so I can show how the pieces fit: Fastify, Postgres, Redis, ECS Fargate behind an ALB, Terraform for infra.

## Status

Early days. The HTTP server boots and `/health` answers. Schema and the booking flow are next.

## Running it locally

You'll need Docker and Node 20+.

    npm install
    npm run db:up
    npm run dev

Then in another terminal:

    curl localhost:3000/health
    # {"status":"ok"}

## Stack

- Node.js 20 + TypeScript
- Fastify
- PostgreSQL (Prisma)
- Redis (rate limiting, pricing cache)
- Docker + docker-compose for local dev
- Headed for ECS Fargate + Terraform

## Why these choices

Fastify because it's faster than Express and the schema-first approach means validation doubles as the OpenAPI spec source. Prisma for the migrations story and the generated types — but I'll drop to raw SQL anywhere the query plan matters (revenue aggregation, search). Redis because rate limiting and pricing caches both want sub-millisecond reads.
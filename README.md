# Mavera

**Powered by Mavera**

**Kijiji Works — Contemporary Craft & Heritage**

Mavera is a configurable commerce platform for specialist product businesses.
It brings product discovery, maker identity, provenance, collections, editorial
content, and transactional commerce together, so a storefront can tell customers
why a product matters as well as what it costs.

Kijiji Works is the initial storefront identity used to shape the first customer
experience. Store branding, catalog, content, locale, and commerce settings
belong to a store configuration rather than being permanent platform defaults.

## Project status

This repository now has a React storefront and an initial Node/PostgreSQL API
foundation, with public catalog reads and server-managed signup/login sessions
wired through to the API. Payment, order creation, merchant administration,
and persistent cart/checkout services are not implemented; checkout is
intentionally disabled and does not take payment or create orders.
The implementation roadmap is in [the Mavera architecture blueprint](./docs/architecture.md).

Storefront browsing is public. A customer can browse and add items to the
in-memory cart without an account; checkout and Buy now prompt them to create an
account or sign in. The account gate is not a payment confirmation.
The initial cart is not persisted across reloads, and merchant administration
is part of the planned roadmap rather than the current implementation.

Product media supports primary and gallery views, lifestyle scenes, close-up
details, process photography, maker/workshop imagery, video with captions, and
moderated community photos. Customer images are not represented as verified
purchases unless verified against a completed order.

## Product principles

- Specialist storefronts should feel purpose-built, not like generic catalogs.
- Products can connect to makers, origins, processes, provenance, variants,
  collections, and shoppable stories.
- Storefront content, branding, navigation, and homepage composition should be
  merchant-configurable.
- Prices, discounts, stock, permissions, payment status, and order totals are
  authoritative only on the server.
- The first deployment is a modular monolith with a relational database, not a
  premature distributed system.

## Development

Install dependencies, then create local environment settings and start
PostgreSQL with Docker Compose:

```sh
npm install
cp .env.example .env
```

Replace `replace-with-local-password` in both `DATABASE_URL` and
`POSTGRES_PASSWORD` in `.env` with the same local-only password, then run:

```sh
docker compose up -d --wait db
npm run db:setup
npm run api:dev
```

`db:setup` creates the schema, initial store, and an illustrative three-product
catalog with local product photos, starter variants, and sample inventory. This
catalog exists in PostgreSQL (not in frontend code); its prices, stock, and
descriptions are examples only and must be replaced with merchant-verified
details before trading. Checkout remains disabled. The seed command is safe to
rerun: existing product slugs are left untouched.

In a separate terminal, run the frontend:

```sh
npm run dev -- --host 127.0.0.1 --port 5175
```

Open [http://127.0.0.1:5175](http://127.0.0.1:5175/). If a store has already
been bootstrapped, run `npm run db:seed-catalog` to add any missing starter
listings without recreating the store. Stop the local database with
`docker compose down`; its named volume retains the catalog between runs.

## Deploying the storefront and API to Vercel

The Vercel project serves the Vite storefront and the Express API from the same
origin. Product requests use `/api/v1` by default in production; keep
`VITE_API_URL` unset or set it to `/api/v1` in Vercel, never to `localhost`.
The API runs as a Vercel Node.js Function and expects a hosted PostgreSQL
database.

1. In the Vercel project, add the Neon integration and create a Neon database.
2. In the Vercel production environment, set `DATABASE_URL` to Neon's pooled
   connection string, `DATABASE_SSL=true`, `DATABASE_POOL_MAX=1`, and
   `STORE_SLUG=kijiji-works`. Vercel deployment hostnames are automatically
   allowed as same-origin API clients.
3. Initialize the Neon database once from this project using the same pooled
   connection string in your untracked local `.env`: run `npm run db:setup`.
   Never paste database credentials into source files or commit `.env`.
4. Redeploy the Vercel production branch and confirm
   `/health/ready` and `/api/v1/products` respond successfully.

The starter inventory and prices are examples, not live merchant information.
Checkout remains disabled until a payment provider and verified webhook
processing are implemented.

Available checks:

```sh
npm run lint
npm test
npm run build
```

The production payment provider has not been selected. No payment should be
accepted until a provider integration and verified webhook processing are
implemented and configured.

## Storefront photography

The initial Kijiji Works configuration uses Unsplash photography:

- Woven baskets — Zachary Staines
- Straw weaving process — Wei-Cheng Wu
- Potter at work — Courtney Cook
- Basket detail — [Eduardo Rodriguez](https://unsplash.com/photos/brown-woven-baskets-on-white-table-uRCrdEiiVPU)
- Ceramic vessels — [Chloe Bolton](https://unsplash.com/photos/ceramic-vases-on-wooden-surface-R0qthXq3jec)
- Wooden bowl — [Max Letek](https://unsplash.com/photos/brown-wooden-round-bowl-on-white-table-d9mooKDcw-s)
- Wooden bowls — [Nauval Hilmi](https://unsplash.com/photos/a-group-of-wooden-bowls-and-plates-on-a-table-C5eZRf7TkQA)

Product photographs are illustrative and are not claims about a specific
merchant, maker, or product.

## Architecture and delivery

Read [docs/architecture.md](./docs/architecture.md) for the product architecture,
personas and journeys, information architecture, feature map, relational data
model, REST API outline, frontend and backend boundaries, design system,
deployment, security, testing, and phased implementation plan.

## Configuration and secrets

Production integrations must be configured through environment variables and
deployment secrets. Never put credentials, payment secrets, or customer data in
source control or browser storage.

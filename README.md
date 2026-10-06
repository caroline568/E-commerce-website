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

Install dependencies and configure a PostgreSQL database:

```sh
npm install
npm run db:migrate
npm run db:bootstrap-store
npm run api:dev
```

Copy `.env.example` to `.env` and set `DATABASE_URL`, store name, currency, and
country before running migrations or bootstrapping the initial store. In a
separate terminal, run the frontend:

```sh
npm run dev
```

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

## Architecture and delivery

Read [docs/architecture.md](./docs/architecture.md) for the product architecture,
personas and journeys, information architecture, feature map, relational data
model, REST API outline, frontend and backend boundaries, design system,
deployment, security, testing, and phased implementation plan.

## Configuration and secrets

Production integrations must be configured through environment variables and
deployment secrets. Never put credentials, payment secrets, or customer data in
source control or browser storage.

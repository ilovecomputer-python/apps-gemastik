# AURA Marketplace API

Backend for AURA Marketplace: Express + TypeScript + Prisma + PostgreSQL.

## Stack

- Express 4, TypeScript (strict), ESM
- Prisma ORM + PostgreSQL
- JWT auth (bcrypt password hashing)
- zod validation, helmet, cors, rate limiting

## Local setup

1. Start Postgres (from the repo root, one level up from `server/`):

   ```bash
   docker compose up -d
   ```

2. Copy env file and adjust if needed:

   ```bash
   cp .env.example .env
   ```

3. Install dependencies:

   ```bash
   npm install
   ```

4. Run migrations and generate the Prisma client:

   ```bash
   npm run prisma:migrate
   ```

5. Seed demo data (products, stores, shipping options, payment methods, a demo user):

   ```bash
   npm run seed
   ```

   Demo login: `demo@aura.id` / `password123`

6. Start the dev server (http://localhost:4000):

   ```bash
   npm run dev
   ```

7. Check it's alive: `GET http://localhost:4000/health`

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Start with hot reload (tsx watch) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled build (production) |
| `npm run prisma:migrate` | Create/apply a dev migration |
| `npm run prisma:deploy` | Apply migrations in production (no prompts) |
| `npm run prisma:studio` | Open Prisma Studio (DB GUI) |
| `npm run seed` | Seed reference/demo data |

## Environment variables

See `.env.example`. All are validated at startup (`src/lib/env.ts`) — the process exits immediately with a clear error if any are missing/invalid.

| Var | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | yes | PostgreSQL connection string |
| `JWT_SECRET` | yes | ≥16 chars. Use a long random value in production |
| `JWT_EXPIRES_IN` | no (default `7d`) | jsonwebtoken duration string |
| `PORT` | no (default `4000`) | |
| `NODE_ENV` | no (default `development`) | |
| `CORS_ORIGIN` | no (default `http://localhost:5173`) | comma-separated list of allowed origins |

## API overview

All responses are JSON. Errors: `{ "error": { "code": string, "message": string } }`.
Authenticated routes require `Authorization: Bearer <token>`.

- `POST /api/auth/register` `{ name, email, password }` → `{ token, user }`
- `POST /api/auth/login` `{ email, password }` → `{ token, user }`
- `GET /api/auth/me` (auth) → `{ user }`
- `GET /api/products?category=&search=&sort=&halal=&umkm=` → `{ products }`
- `GET /api/products/:id` → `{ product }`
- `GET /api/wishlist` (auth) → `{ products }`
- `POST /api/wishlist/:productId` (auth) → add
- `DELETE /api/wishlist/:productId` (auth) → remove
- `GET /api/cart` (auth) → `{ items: [{ product, quantity }] }`
- `POST /api/cart/:productId` (auth) → increment/add
- `POST /api/cart/:productId/decrement` (auth) → decrement/remove
- `DELETE /api/cart/:productId` (auth) → remove line item
- `DELETE /api/cart` (auth) → clear cart
- `GET /api/addresses` (auth) → `{ addresses }`
- `POST /api/addresses` (auth) `{ label, recipient, phone, fullAddress, isDefault? }`
- `DELETE /api/addresses/:id` (auth)
- `GET /api/shipping-options` → `{ shippingOptions }`
- `GET /api/payment-methods` → `{ paymentMethods }`
- `POST /api/orders` (auth) `{ addressId, shippingOptionId, paymentMethodId }` → checkout from current cart, clears cart
- `GET /api/orders` (auth) → order history
- `GET /api/orders/:id` (auth) → order detail
- `POST /api/scan/:mode` where mode is `shade`/`skin`/`face-shape` → mock AI result + recommended products (saved to history if authenticated)
- `GET /api/scan/history` (auth)
- `GET /api/subscription/plans` → AURA+ plans available
- `GET /api/subscription` (auth) → current subscription (or `null`), with trial kit history
- `POST /api/subscription/subscribe` (auth) `{ planId }` → activates subscription, generates first trial kit (3 sample items from partner/UMKM brands)
- `POST /api/subscription/cancel` (auth) → cancels the active subscription
- `GET /api/quiz` → beauty quiz questions/options
- `POST /api/quiz/submit` (auth) `{ answers: { [questionId]: optionId[] } }` → rule-based skin profile + personalized trial kit (prioritizes new-brand products)
- `GET /api/quiz/kits` (auth) → past personalized kits
- `GET /api/brands/spotlight` → new/UMKM brands (tagline, story, launch date) with their products
- `GET /api/products/:productId/reviews` (optional auth) → reviews with `helpfulCount` and whether the current user marked it helpful
- `POST /api/products/:productId/reviews` (auth) `{ rating, text }` → one review per user per product; awards +10 points, recalculates product rating
- `POST /api/reviews/:reviewId/helpful` (auth) → toggle helpful vote; awards/revokes +2 points to the review author (can't vote your own review)
- `GET /api/users/me/reviewer-stats` (auth) → `{ reviewCount, totalHelpful, badge }`

## Deployment

`Dockerfile` builds a production image (multi-stage: install → build → slim runtime).

```bash
docker build -t aura-api .
docker run -p 4000:4000 --env-file .env aura-api
```

Before first boot in a new environment, run migrations once:

```bash
npm run prisma:deploy
npm run seed   # optional, for reference data
```

Point `DATABASE_URL` at a managed Postgres (e.g. Neon, Supabase, Railway) and set a strong `JWT_SECRET` and the real `CORS_ORIGIN` (your deployed frontend URL) in production.

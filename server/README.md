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
| `npm run test:api` | Run the Postman/Newman suite against localhost |
| `npm run test:api:prod` | Run it against the deployed API |

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
| `GEMINI_API_KEY` | no | Enables the AI scan. Get one at [AI Studio](https://aistudio.google.com/apikey). Without it the server still runs; `/api/scan/*` returns 503 |
| `GEMINI_MODEL` | no (default `gemini-3.5-flash`) | Any vision-capable Gemini model |
| `DIRECT_URL` | yes | Session-mode DB connection for Prisma Migrate. Same as `DATABASE_URL` locally; on Supabase use port 5432, not the 6543 pooler |
| `STRIPE_SECRET_KEY` | no | Enables payments. Without it `/api/payments/*` returns 503 |
| `STRIPE_WEBHOOK_SECRET` | no | Required for webhooks to be accepted |
| `APP_URL` | no (default `http://localhost:5173`) | Where Stripe returns the customer after an offsite redirect |

## Payments (Stripe)

`POST /api/payments/intent` creates a **PENDING** order and the matching
PaymentIntent, returning a `clientSecret` for Stripe Elements on the client.

Rules that matter:

- **The amount is computed server-side** from the user's own cart rows. A
  client that posts its own total could otherwise pay Rp1 for anything.
- **IDR is not a zero-decimal currency in Stripe** — rupiah is multiplied by
  100. Passing the raw figure makes Stripe read Rp107.000 as Rp1.070.
- Stripe rejects charges under roughly $0.50, so totals below
  `STRIPE_MINIMUM_RUPIAH` are refused with a clear message instead of a raw
  gateway error.
- **The cart is only cleared once payment is confirmed**, so an abandoned
  checkout leaves it intact.
- `POST /api/payments/webhook` is mounted *before* `express.json()` and reads
  the raw body, because signature verification needs the exact bytes Stripe
  signed. Unsigned requests are rejected.
- Settlement is idempotent: the PaymentIntent id is unique on the order and the
  update is filtered on `status = PENDING`, so a replayed webhook is a no-op.
- `GET /api/payments/orders/:orderId` reconciles straight from Stripe if the
  webhook hasn't landed yet, so the success screen is never stuck waiting.

Payment methods carry a `provider`: `stripe` goes through the gateway,
anything else settles offline via the existing `POST /api/orders`.

Local webhook testing:

```bash
stripe listen --forward-to localhost:4000/api/payments/webhook
```

Copy the printed `whsec_...` into `STRIPE_WEBHOOK_SECRET`.

## AI Scan (Gemini vision)

`POST /api/scan` takes a face photo and returns an analysis plus product
recommendations drawn from the local catalogue.

One vision call covers everything: the five dataset conditions, the skin type,
and the undertone used for shade matching. Splitting these into separate
per-mode calls would triple both the latency and the API quota for no extra
signal.

**Skin condition taxonomy.** The model is constrained to score exactly the five
classes of the labelled training dataset ("Skin v2", one folder per class):
`acne`, `blackheads`, `dark_spots`, `pores`, `wrinkles`. Each is scored 0-100.
Products carry a matching `concerns` array, so a detected condition maps
directly onto catalogue items — a product's rank is the sum of the severities
of the concerns it targets.

Request body accepts a data URL or raw base64:

```json
{ "image": "data:image/jpeg;base64,/9j/4AAQ..." }
```

Guards:

- `subject: "other"` (not human skin) → `400 NO_FACE_DETECTED`
- macro close-ups of one area are accepted, not just full faces
- poor-quality photos still return a result, with a `warning` field
- quota exhausted → `429 AI_QUOTA_EXCEEDED`; transient overload is retried
  three times with backoff before `502 AI_REQUEST_FAILED`

Photos are sent to Gemini and never written to disk or the database; only the
derived scores are persisted (for logged-in users) in `scan_results`.

`GET /api/scan/status` reports whether the key is configured.

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
- `POST /api/scan` → Gemini vision analysis + recommended products (see [AI Scan](#ai-scan-gemini-vision))
- `GET /api/scan/status` → whether the AI scan is configured
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

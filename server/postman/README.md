# Postman / Newman API tests

End-to-end tests for every AURA Marketplace endpoint: 73 requests, 235
assertions.

## Running

From `server/`:

```bash
npm run test:api          # against http://localhost:4000
npm run test:api:prod     # against the deployed API
npm run test:api:report   # local run + HTML report at postman/report.html
```

`npm run test:api` needs the local server running (`npm run dev`) and a seeded
database (`npm run seed`) — tests sign in as both `demo@aura.id` (a normal
shopper) and `admin@aura.id`, and expect the demo user's addresses to exist.
Two accounts are required on purpose: the admin folder checks that a normal
user is refused, which cannot be tested with one login.

## Importing into the Postman GUI

1. **Import** → `AURA-Marketplace.postman_collection.json`
2. **Import** → `local.postman_environment.json` (or the production one)
3. Pick the environment in the top-right selector, then **Run collection**

Requests must run in order: the auth folder stores `authToken`, and later
folders read it along with `productId`, `addressId`, and friends.

## What is covered

| Folder | Focus |
| --- | --- |
| 00 Health | liveness, 404 envelope |
| 01 Auth | register, duplicate email (409), weak input (400), login, wrong password (401), `/me`, missing and malformed tokens (401) |
| 02 Products | new arrivals ordering and days-since-launch, list, category filter, price sort ordering, search relevance, halal/UMKM flags, detail, unknown id (404) |
| 03 Wishlist | auth guard, add, idempotent re-add, list, remove, verify removal |
| 04 Cart | reset, add, increment, decrement, line-item shape, unknown product (404) |
| 05 Checkout data | addresses (default sorts first), address validation, shipping options (cheapest first), payment methods |
| 06 Orders | foreign address rejected (400), checkout, cart cleared by the transaction, empty-cart guard, history ordering, order detail |
| 07 Reviews | list, rating range validation, reviewer stats/badge, community feed ordering |
| 08 Quiz & Brands | brand on-boarding lands as PENDING and stays hidden, duplicate name rejected, question ordering, submit → skin profile + personalised kit, brand spotlight payload |
| 09 AURA+ | plans with benefits, current subscription |
| 10 AI Scan | status flag, unknown mode (400), malformed image (400), history auth guard |
| 11 Payments | gateway status, provider flag on every method, auth guard, COD method refused a gateway session, empty cart, unsigned webhook rejected |
| 12 Admin | role re-checked from the DB not the JWT: 401 without a token, 403 for a normal user, queue listing, approve, double-approve rejected (409), and that approval is what publishes a brand |
| 13 Security | `x-powered-by` hidden, CSP, `nosniff`, rate-limit headers |

The AI scan's *analysis* call is deliberately not exercised — it costs Gemini
quota on every run. The validation and guard paths around it are.

`registerEmail` is randomised per run, so the suite is safe to re-run. Note
that a production run does create a throwaway user and a real order.

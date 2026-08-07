/**
 * End-to-end smoke test: walks the journeys a real user takes, in order, and
 * asserts the outcome of each one.
 *
 * This is deliberately not a unit test suite. It answers one question - "is the
 * deployed stack actually usable right now?" - by signing up a throwaway
 * account and shopping, reviewing, selling and moderating with it. Anything it
 * cannot do without spending money or third-party quota (Stripe confirmation,
 * a Gemini scan) is checked at the readiness level instead.
 *
 * Usage: node scripts/smoke.mjs [baseUrl]
 * Exits non-zero if any step fails, so CI can gate on it.
 */

const BASE = (process.argv[2] || process.env.SMOKE_BASE_URL || "http://localhost:4000").replace(/\/$/, "");

const results = [];
let failed = 0;

const rupiah = (n) => `Rp${n.toLocaleString("id-ID")}`;

async function api(method, path, { token, body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(30_000),
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text.slice(0, 200) };
  }
  return { status: res.status, body: json };
}

async function step(name, fn) {
  const started = Date.now();
  try {
    const note = await fn();
    results.push({ name, ok: true, note: note ?? "", ms: Date.now() - started });
  } catch (error) {
    failed += 1;
    results.push({
      name,
      ok: false,
      note: error instanceof Error ? error.message : String(error),
      ms: Date.now() - started,
    });
  }
}

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

function expectStatus(res, want, label) {
  expect(
    res.status === want,
    `${label}: expected ${want}, got ${res.status} ${JSON.stringify(res.body)?.slice(0, 180)}`,
  );
}

const stamp = Date.now();
const shopper = { email: `smoke+${stamp}@aura.id`, password: "password123" };
const seller = { email: `smoke-seller+${stamp}@aura.id`, password: "password123" };
const ctx = {};

async function main() {
  console.log(`\nAURA smoke test -> ${BASE}\n`);

  // --- Public surface: everything a visitor sees before signing in ---------

  await step("Health endpoint responds", async () => {
    const res = await api("GET", "/health");
    expectStatus(res, 200, "health");
    return res.body?.status ?? "ok";
  });

  await step("Catalogue returns products", async () => {
    const res = await api("GET", "/api/products");
    expectStatus(res, 200, "products");
    const items = res.body.products ?? res.body.items ?? res.body;
    expect(Array.isArray(items) && items.length > 0, "catalogue is empty");
    ctx.product = items[0];
    expect(ctx.product.price > 0, "product has no price");
    return `${items.length} products, first: ${ctx.product.name}`;
  });

  await step("New arrivals feed is populated", async () => {
    const res = await api("GET", "/api/products/new");
    expectStatus(res, 200, "new arrivals");
    const items = res.body.products ?? res.body;
    expect(Array.isArray(items) && items.length > 0, "no new arrivals");
    return `${items.length} launches`;
  });

  await step("Product detail loads", async () => {
    const res = await api("GET", `/api/products/${ctx.product.id}`);
    expectStatus(res, 200, "product detail");
    const product = res.body.product ?? res.body;
    expect(product.id === ctx.product.id, "wrong product returned");
    return product.name;
  });

  await step("Shipping and payment options are configured", async () => {
    const [shipping, payment] = await Promise.all([
      api("GET", "/api/shipping-options"),
      api("GET", "/api/payment-methods"),
    ]);
    expectStatus(shipping, 200, "shipping options");
    expectStatus(payment, 200, "payment methods");
    const methods = payment.body.paymentMethods ?? payment.body;
    ctx.shipping = (shipping.body.shippingOptions ?? shipping.body)[0];
    ctx.payment = methods.find((m) => m.provider !== "stripe") ?? methods[0];
    ctx.stripeMethod = methods.find((m) => m.provider === "stripe");
    expect(ctx.shipping && ctx.payment, "checkout cannot be completed without both");
    return `${ctx.shipping.name} ${rupiah(ctx.shipping.price)} / ${ctx.payment.name}`;
  });

  await step("Brand spotlight and review feed render", async () => {
    const [brands, feed] = await Promise.all([
      api("GET", "/api/brands/spotlight"),
      api("GET", "/api/reviews/feed"),
    ]);
    expectStatus(brands, 200, "spotlight");
    expectStatus(feed, 200, "review feed");
    const brandList = brands.body.brands ?? brands.body;
    const reviews = feed.body.reviews ?? feed.body;
    return `${brandList.length} brands, ${reviews.length} reviews`;
  });

  await step("Protected route rejects anonymous callers", async () => {
    const res = await api("GET", "/api/cart");
    expectStatus(res, 401, "anonymous cart");
    return res.body?.error?.code ?? "";
  });

  // --- Shopper journey ----------------------------------------------------

  await step("Register a new shopper", async () => {
    const res = await api("POST", "/api/auth/register", {
      body: { name: "Smoke Shopper", ...shopper },
    });
    expectStatus(res, 201, "register");
    ctx.token = res.body.token;
    expect(ctx.token, "no token issued");
    return shopper.email;
  });

  await step("Login returns a working session", async () => {
    const login = await api("POST", "/api/auth/login", { body: shopper });
    expectStatus(login, 200, "login");
    const me = await api("GET", "/api/auth/me", { token: login.body.token });
    expectStatus(me, 200, "me");
    const user = me.body.user ?? me.body;
    expect(user.email === shopper.email, "session belongs to the wrong user");
    ctx.token = login.body.token;
    return `${user.name} (${user.points ?? 0} poin)`;
  });

  await step("Wrong password is refused", async () => {
    const res = await api("POST", "/api/auth/login", {
      body: { email: shopper.email, password: "not-the-password" },
    });
    expectStatus(res, 401, "bad password");
    return res.body?.error?.code ?? "";
  });

  await step("Wishlist add and read back", async () => {
    const add = await api("POST", `/api/wishlist/${ctx.product.id}`, { token: ctx.token });
    expect([200, 201].includes(add.status), `wishlist add: ${add.status}`);
    const list = await api("GET", "/api/wishlist", { token: ctx.token });
    expectStatus(list, 200, "wishlist");
    const ids = list.body.productIds ?? (list.body.products ?? list.body).map((p) => p.id ?? p);
    expect(ids.includes(ctx.product.id), "saved product is missing from the wishlist");
    return `${ids.length} item`;
  });

  await step("Cart holds quantity and totals correctly", async () => {
    await api("POST", `/api/cart/${ctx.product.id}`, { token: ctx.token });
    await api("POST", `/api/cart/${ctx.product.id}`, { token: ctx.token });
    const cart = await api("GET", "/api/cart", { token: ctx.token });
    expectStatus(cart, 200, "cart");
    const items = cart.body.items ?? cart.body;
    const line = items.find((i) => (i.productId ?? i.product?.id) === ctx.product.id);
    expect(line, "product missing from cart");
    expect(line.quantity === 2, `expected quantity 2, got ${line.quantity}`);
    ctx.subtotal = ctx.product.price * 2;
    return `2 x ${rupiah(ctx.product.price)} = ${rupiah(ctx.subtotal)}`;
  });

  await step("Create a shipping address", async () => {
    const res = await api("POST", "/api/addresses", {
      token: ctx.token,
      body: {
        label: "Rumah",
        recipient: "Smoke Shopper",
        phone: "081234567890",
        fullAddress: "Jl. Merdeka No. 17, Bandung, Jawa Barat 40115",
        isDefault: true,
      },
    });
    expect([200, 201].includes(res.status), `address: ${res.status}`);
    ctx.address = res.body.address ?? res.body;
    expect(ctx.address.id, "address has no id");
    return ctx.address.label;
  });

  await step("Checkout arithmetic is correct", async () => {
    const res = await api("POST", "/api/orders", {
      token: ctx.token,
      body: {
        addressId: ctx.address.id,
        shippingOptionId: ctx.shipping.id,
        paymentMethodId: ctx.payment.id,
      },
    });
    expect([200, 201].includes(res.status), `checkout: ${res.status} ${JSON.stringify(res.body)?.slice(0, 160)}`);
    const order = res.body.order ?? res.body;
    ctx.order = order;
    expect(order.subtotal === ctx.subtotal, `subtotal ${order.subtotal} != ${ctx.subtotal}`);
    expect(
      order.total === order.subtotal + order.shippingFee - (order.discount ?? 0),
      `total ${order.total} does not equal subtotal + ongkir - diskon`,
    );
    return `${order.orderNumber}: ${rupiah(order.subtotal)} + ${rupiah(order.shippingFee)} = ${rupiah(order.total)}`;
  });

  await step("Cart is emptied by checkout", async () => {
    const cart = await api("GET", "/api/cart", { token: ctx.token });
    const items = cart.body.items ?? cart.body;
    expect(items.length === 0, `${items.length} items left in the cart after checkout`);
    return "kosong";
  });

  await step("Order history shows the new order", async () => {
    const list = await api("GET", "/api/orders", { token: ctx.token });
    expectStatus(list, 200, "orders");
    const orders = list.body.orders ?? list.body;
    expect(orders.some((o) => o.id === ctx.order.id), "order missing from history");
    const detail = await api("GET", `/api/orders/${ctx.order.id}`, { token: ctx.token });
    expectStatus(detail, 200, "order detail");
    return `${orders.length} pesanan`;
  });

  await step("Another account cannot read this order", async () => {
    const other = await api("POST", "/api/auth/register", {
      body: { name: "Smoke Intruder", email: `smoke-intruder+${stamp}@aura.id`, password: "password123" },
    });
    expectStatus(other, 201, "intruder register");
    const res = await api("GET", `/api/orders/${ctx.order.id}`, { token: other.body.token });
    expect([403, 404].includes(res.status), `expected 403/404, got ${res.status}`);
    return `${res.status} ${res.body?.error?.code ?? ""}`;
  });

  // --- Quiz, subscription, reviews ---------------------------------------

  await step("Beauty quiz returns questions and a kit", async () => {
    const quiz = await api("GET", "/api/quiz");
    expectStatus(quiz, 200, "quiz");
    const questions = quiz.body.questions ?? quiz.body;
    expect(questions.length > 0, "quiz has no questions");
    const answers = {};
    for (const q of questions) {
      const first = (q.options ?? [])[0];
      if (first) answers[q.id] = [first.id ?? first.value ?? first];
    }
    const submit = await api("POST", "/api/quiz/submit", { token: ctx.token, body: { answers } });
    expect([200, 201].includes(submit.status), `quiz submit: ${submit.status}`);
    return `${questions.length} pertanyaan terjawab`;
  });

  // Kits are personalised, so this endpoint is per-user rather than a catalogue.
  await step("Quiz produces a personalised trial kit", async () => {
    const res = await api("GET", "/api/quiz/kits", { token: ctx.token });
    expectStatus(res, 200, "kits");
    const kits = res.body.kits ?? res.body;
    expect(Array.isArray(kits), "kits response is not a list");
    expect(kits.length > 0, "answering the quiz produced no kit");
    return `${kits.length} kit`;
  });

  await step("Subscribe then cancel AURA+", async () => {
    const plans = await api("GET", "/api/subscription/plans");
    expectStatus(plans, 200, "plans");
    const plan = (plans.body.plans ?? plans.body)[0];
    expect(plan, "no subscription plans");
    const sub = await api("POST", "/api/subscription/subscribe", {
      token: ctx.token,
      body: { planId: plan.id },
    });
    expect([200, 201].includes(sub.status), `subscribe: ${sub.status}`);
    const active = await api("GET", "/api/subscription", { token: ctx.token });
    expectStatus(active, 200, "subscription");
    const cancel = await api("POST", "/api/subscription/cancel", { token: ctx.token });
    expect([200, 204].includes(cancel.status), `cancel: ${cancel.status}`);
    return plan.name ?? plan.id;
  });

  // The points balance lives on the user record, so read it from /me rather
  // than from the reviewer-stats endpoint, which reports counts and the badge.
  const myPoints = async () => {
    const me = await api("GET", "/api/auth/me", { token: ctx.token });
    expectStatus(me, 200, "me");
    return (me.body.user ?? me.body).points ?? 0;
  };

  await step("Writing a review awards points", async () => {
    const pointsBefore = await myPoints();

    const review = await api("POST", `/api/products/${ctx.product.id}/reviews`, {
      token: ctx.token,
      body: { rating: 5, text: "Teksturnya ringan dan cepat meresap, cocok buat kulit berminyak." },
    });
    expect([200, 201].includes(review.status), `review: ${review.status} ${JSON.stringify(review.body)?.slice(0, 160)}`);
    ctx.reviewId = (review.body.review ?? review.body).id;

    const pointsAfter = await myPoints();
    expect(
      pointsAfter === pointsBefore + (review.body.pointsAwarded ?? 10),
      `points did not move as promised: ${pointsBefore} -> ${pointsAfter}`,
    );
    ctx.points = pointsAfter;
    return `${pointsBefore} -> ${pointsAfter} poin (+${review.body.pointsAwarded})`;
  });

  await step("Reviewing the same product twice is refused", async () => {
    const res = await api("POST", `/api/products/${ctx.product.id}/reviews`, {
      token: ctx.token,
      body: { rating: 4, text: "Mencoba mengulas produk yang sama untuk kedua kalinya." },
    });
    expectStatus(res, 409, "duplicate review");
    return res.body?.error?.code ?? "";
  });

  await step("Reviewer stats reflect the new review", async () => {
    const res = await api("GET", "/api/users/me/reviewer-stats", { token: ctx.token });
    expectStatus(res, 200, "reviewer stats");
    const stats = res.body.stats ?? res.body;
    expect(stats.reviewCount >= 1, `reviewCount is ${stats.reviewCount}`);
    expect(stats.badge, "no badge returned");
    return `${stats.reviewCount} ulasan, badge ${stats.badge.name ?? stats.badge}`;
  });

  await step("Review shows up on the product and the feed", async () => {
    const [onProduct, onFeed] = await Promise.all([
      api("GET", `/api/products/${ctx.product.id}/reviews`),
      api("GET", "/api/reviews/feed"),
    ]);
    expectStatus(onProduct, 200, "product reviews");
    expectStatus(onFeed, 200, "feed");
    const productReviews = onProduct.body.reviews ?? onProduct.body;
    expect(
      productReviews.some((r) => r.id === ctx.reviewId),
      "the new review is not listed on the product",
    );
    const feed = onFeed.body.reviews ?? onFeed.body;
    expect(feed.some((r) => r.id === ctx.reviewId), "the new review is not in the community feed");
    return `${productReviews.length} ulasan di produk, ${feed.length} di feed`;
  });

  // --- Vouchers -----------------------------------------------------------

  await step("Voucher catalogue is priced", async () => {
    const res = await api("GET", "/api/vouchers", { token: ctx.token });
    expectStatus(res, 200, "vouchers");
    const vouchers = res.body.vouchers ?? res.body;
    expect(vouchers.length > 0, "no vouchers configured");
    ctx.voucher = [...vouchers].sort((a, b) => a.pointsCost - b.pointsCost)[0];
    return vouchers.map((v) => `${v.pointsCost}p`).join(" / ");
  });

  await step("Redeeming without enough points is refused", async () => {
    expect(
      ctx.points < ctx.voucher.pointsCost,
      `test assumes one review cannot afford the cheapest voucher (has ${ctx.points})`,
    );
    const res = await api("POST", `/api/vouchers/${ctx.voucher.id}/redeem`, { token: ctx.token });
    expect([400, 402, 409].includes(res.status), `expected a refusal, got ${res.status}`);
    return `${res.status} ${res.body?.error?.code ?? ""}`;
  });

  // Earn the voucher the way a real reviewer does, rather than editing the
  // balance behind the API's back - that is the only way the loop is proven.
  await step("Reviewing enough products earns the voucher", async () => {
    const catalogue = await api("GET", "/api/products");
    const others = (catalogue.body.products ?? catalogue.body).filter(
      (p) => p.id !== ctx.product.id,
    );
    for (const product of others) {
      if (ctx.points >= ctx.voucher.pointsCost) break;
      const res = await api("POST", `/api/products/${product.id}/reviews`, {
        token: ctx.token,
        body: {
          rating: 4,
          text: `Sudah dipakai dua minggu, hasilnya konsisten dan wanginya tidak mengganggu.`,
        },
      });
      if ([200, 201].includes(res.status)) ctx.points += res.body.pointsAwarded ?? 10;
    }
    expect(
      ctx.points >= ctx.voucher.pointsCost,
      `only reached ${ctx.points} of ${ctx.voucher.pointsCost} points`,
    );
    expect(await myPoints() === ctx.points, "the server balance drifted from the awarded points");
    return `${ctx.points} poin terkumpul`;
  });

  await step("Redeem a voucher and spend the points", async () => {
    const res = await api("POST", `/api/vouchers/${ctx.voucher.id}/redeem`, { token: ctx.token });
    expect([200, 201].includes(res.status), `redeem: ${res.status} ${JSON.stringify(res.body)?.slice(0, 160)}`);
    ctx.userVoucher = res.body.userVoucher ?? res.body.voucher ?? res.body;
    expect(ctx.userVoucher.id, "no redeemed voucher returned");
    const after = await myPoints();
    expect(
      after === ctx.points - ctx.voucher.pointsCost,
      `balance should drop by ${ctx.voucher.pointsCost}: ${ctx.points} -> ${after}`,
    );
    ctx.points = after;
    return `-${ctx.voucher.pointsCost} poin, sisa ${after}`;
  });

  await step("Voucher discounts the next order", async () => {
    await api("POST", `/api/cart/${ctx.product.id}`, { token: ctx.token });
    const res = await api("POST", "/api/orders", {
      token: ctx.token,
      body: {
        addressId: ctx.address.id,
        shippingOptionId: ctx.shipping.id,
        paymentMethodId: ctx.payment.id,
        userVoucherId: ctx.userVoucher.id,
      },
    });
    expect([200, 201].includes(res.status), `discounted checkout: ${res.status} ${JSON.stringify(res.body)?.slice(0, 160)}`);
    const order = res.body.order ?? res.body;
    ctx.discountedOrder = order;
    expect(order.discount > 0, "no discount was applied");
    expect(
      order.total === order.subtotal + order.shippingFee - order.discount,
      "the discount is not reflected in the total",
    );
    return `${rupiah(order.subtotal)} + ${rupiah(order.shippingFee)} - ${rupiah(order.discount)} = ${rupiah(order.total)}`;
  });

  await step("The same voucher cannot be spent twice", async () => {
    await api("POST", `/api/cart/${ctx.product.id}`, { token: ctx.token });
    const res = await api("POST", "/api/orders", {
      token: ctx.token,
      body: {
        addressId: ctx.address.id,
        shippingOptionId: ctx.shipping.id,
        paymentMethodId: ctx.payment.id,
        userVoucherId: ctx.userVoucher.id,
      },
    });
    expect([400, 409].includes(res.status), `expected a refusal, got ${res.status}`);
    await api("DELETE", "/api/cart", { token: ctx.token });
    return `${res.status} ${res.body?.error?.code ?? ""}`;
  });

  await step("A voucher belonging to someone else is refused", async () => {
    const other = await api("POST", "/api/auth/register", {
      body: { name: "Smoke Voucher Thief", email: `smoke-thief+${stamp}@aura.id`, password: "password123" },
    });
    const address = await api("POST", "/api/addresses", {
      token: other.body.token,
      body: {
        label: "Kos",
        recipient: "Smoke Voucher Thief",
        phone: "081200000000",
        fullAddress: "Jl. Cihampelas No. 5, Bandung, Jawa Barat 40131",
      },
    });
    await api("POST", `/api/cart/${ctx.product.id}`, { token: other.body.token });
    const res = await api("POST", "/api/orders", {
      token: other.body.token,
      body: {
        addressId: (address.body.address ?? address.body).id,
        shippingOptionId: ctx.shipping.id,
        paymentMethodId: ctx.payment.id,
        userVoucherId: ctx.userVoucher.id,
      },
    });
    expect([400, 403, 404, 409].includes(res.status), `expected a refusal, got ${res.status}`);
    return `${res.status} ${res.body?.error?.code ?? ""}`;
  });

  // --- Seller journey -----------------------------------------------------

  await step("Register a seller account", async () => {
    const res = await api("POST", "/api/auth/register", {
      body: { name: "Smoke Seller", ...seller },
    });
    expectStatus(res, 201, "seller register");
    ctx.sellerToken = res.body.token;
    return seller.email;
  });

  await step("Anonymous brand application is refused", async () => {
    const res = await api("POST", "/api/brands/apply", {
      body: { name: "Anon Brand" },
    });
    expectStatus(res, 401, "anonymous apply");
    return res.body?.error?.code ?? "";
  });

  await step("Apply as a brand", async () => {
    ctx.brandName = `Smoke Brand ${stamp}`;
    const res = await api("POST", "/api/brands/apply", {
      token: ctx.sellerToken,
      body: {
        name: ctx.brandName,
        tagline: "Perawatan kulit lokal dari bahan rempah Nusantara",
        story:
          "Brand percobaan yang dibuat oleh smoke test untuk memastikan alur on-boarding penjual berjalan dari awal sampai akhir.",
        city: "Bandung",
        contactName: "Smoke Seller",
        contactEmail: seller.email,
      },
    });
    if (res.status === 429) throw new Error("rate limited - lower the ceiling or wait an hour");
    expect([200, 201].includes(res.status), `apply: ${res.status} ${JSON.stringify(res.body)?.slice(0, 160)}`);
    const application = res.body.application ?? res.body.store ?? res.body;
    ctx.storeId = application.id;
    expect(ctx.storeId, "no application id returned");
    expect(application.status === "PENDING", `new store should be PENDING, got ${application.status}`);
    return `${ctx.brandName} -> PENDING`;
  });

  await step("Pending seller sees a dashboard", async () => {
    const res = await api("GET", "/api/seller/store", { token: ctx.sellerToken });
    expectStatus(res, 200, "seller store");
    const store = res.body.store ?? res.body;
    expect(store?.status === "PENDING", "dashboard does not show the pending status");
    return "status terlihat sambil menunggu";
  });

  await step("Pending seller cannot list products", async () => {
    const res = await api("POST", "/api/seller/products", {
      token: ctx.sellerToken,
      body: {
        name: "Serum Percobaan",
        price: 89000,
        category: "SKINCARE",
        description: "Serum percobaan dari smoke test untuk memastikan guard persetujuan admin bekerja.",
        concerns: ["acne"],
      },
    });
    expectStatus(res, 403, "unapproved listing");
    expect(
      res.body?.error?.code === "STORE_NOT_APPROVED",
      `expected STORE_NOT_APPROVED, got ${res.body?.error?.code}`,
    );
    return "403 STORE_NOT_APPROVED";
  });

  await step("A second brand from the same account is refused", async () => {
    const res = await api("POST", "/api/brands/apply", {
      token: ctx.sellerToken,
      body: {
        name: `Smoke Brand Kedua ${stamp}`,
        tagline: "Percobaan brand kedua dari akun yang sama",
        story:
          "Satu akun hanya boleh punya satu brand supaya Seller Center tidak ambigu menampilkan toko yang mana.",
        city: "Bandung",
        contactName: "Smoke Seller",
        contactEmail: seller.email,
      },
    });
    expectStatus(res, 409, "second brand");
    return res.body?.error?.code ?? "";
  });

  // --- Admin journey ------------------------------------------------------

  await step("Shopper cannot reach admin endpoints", async () => {
    const res = await api("GET", "/api/admin/summary", { token: ctx.token });
    expectStatus(res, 403, "non-admin");
    return res.body?.error?.code ?? "";
  });

  await step("Admin signs in", async () => {
    const res = await api("POST", "/api/auth/login", {
      body: { email: "admin@aura.id", password: "admin12345" },
    });
    expectStatus(res, 200, "admin login");
    ctx.adminToken = res.body.token;
    const summary = await api("GET", "/api/admin/summary", { token: ctx.adminToken });
    expectStatus(summary, 200, "admin summary");
    const s = summary.body.summary ?? summary.body;
    return Object.entries(s)
      .filter(([, v]) => typeof v === "number")
      .map(([k, v]) => `${k}=${v}`)
      .join(" ");
  });

  await step("Pending brand is in the admin queue", async () => {
    const res = await api("GET", "/api/admin/brands?status=PENDING", { token: ctx.adminToken });
    expectStatus(res, 200, "admin brands");
    const queue = res.body.applications ?? res.body.stores ?? res.body.brands ?? res.body;
    expect(Array.isArray(queue), `unexpected queue shape: ${Object.keys(res.body).join(",")}`);
    expect(queue.some((b) => b.id === ctx.storeId), "the new application is not queued");
    return `${queue.length} menunggu review`;
  });

  await step("Admin approves the brand", async () => {
    const res = await api("POST", `/api/admin/brands/${ctx.storeId}/approve`, {
      token: ctx.adminToken,
    });
    expect([200, 201].includes(res.status), `approve: ${res.status}`);
    const again = await api("POST", `/api/admin/brands/${ctx.storeId}/approve`, {
      token: ctx.adminToken,
    });
    expectStatus(again, 409, "double approval");
    return "disetujui, approve kedua ditolak 409";
  });

  await step("Approved seller can list a product", async () => {
    const res = await api("POST", "/api/seller/products", {
      token: ctx.sellerToken,
      body: {
        name: `Serum Smoke ${stamp}`,
        price: 89000,
        category: "SKINCARE",
        description: "Serum percobaan dari smoke test untuk memastikan produk penjual masuk katalog publik.",
        concerns: ["acne", "dark_spots"],
        halal: true,
      },
    });
    expect([200, 201].includes(res.status), `listing: ${res.status} ${JSON.stringify(res.body)?.slice(0, 160)}`);
    ctx.sellerProduct = res.body.product ?? res.body;
    return ctx.sellerProduct.name;
  });

  await step("Seller product reaches the public catalogue and new arrivals", async () => {
    const [detail, arrivals] = await Promise.all([
      api("GET", `/api/products/${ctx.sellerProduct.id}`),
      api("GET", "/api/products/new"),
    ]);
    expectStatus(detail, 200, "seller product detail");
    const items = arrivals.body.products ?? arrivals.body;
    expect(
      items.some((p) => p.id === ctx.sellerProduct.id),
      "the new listing did not reach Baru Rilis",
    );
    return "terbit di katalog dan Baru Rilis";
  });

  await step("Seller dashboard reports the listing", async () => {
    const res = await api("GET", "/api/seller/products", { token: ctx.sellerToken });
    expectStatus(res, 200, "seller products");
    const items = res.body.products ?? res.body;
    expect(items.some((p) => p.id === ctx.sellerProduct.id), "listing missing from the dashboard");
    return `${items.length} produk`;
  });

  // --- Third-party integrations: readiness only ---------------------------

  // Deliberately does not POST a scan: a real analysis costs Gemini quota that
  // the accuracy evaluation needs, so this only proves the key is wired up.
  await step("AI scan is enabled (no quota spent)", async () => {
    const res = await api("GET", "/api/scan/status");
    expectStatus(res, 200, "scan status");
    const s = res.body.status ?? res.body;
    expect(s.enabled === true, `scan reports enabled=${s.enabled} - GEMINI_API_KEY missing?`);
    return "kunci Gemini terpasang";
  });

  await step("Scan history is readable", async () => {
    const res = await api("GET", "/api/scan/history", { token: ctx.token });
    expectStatus(res, 200, "scan history");
    const items = res.body.scans ?? res.body.history ?? res.body;
    return `${items.length} riwayat`;
  });

  await step("Stripe is enabled", async () => {
    const res = await api("GET", "/api/payments/status");
    expectStatus(res, 200, "payments status");
    const s = res.body.status ?? res.body;
    expect(s.enabled === true, `payments report enabled=${s.enabled} - STRIPE_SECRET_KEY missing?`);
    return "kunci Stripe terpasang";
  });

  // A PaymentIntent is free to create and is never confirmed here, so this
  // proves the Stripe round trip works without moving any money.
  await step("Stripe issues a PaymentIntent", async () => {
    const card = ctx.stripeMethod;
    expect(card, "no Stripe-backed payment method is configured");
    await api("POST", `/api/cart/${ctx.product.id}`, { token: ctx.token });
    const res = await api("POST", "/api/payments/intent", {
      token: ctx.token,
      body: {
        addressId: ctx.address.id,
        shippingOptionId: ctx.shipping.id,
        paymentMethodId: card.id,
      },
    });
    expect([200, 201].includes(res.status), `intent: ${res.status} ${JSON.stringify(res.body)?.slice(0, 200)}`);
    expect(
      typeof res.body.clientSecret === "string" && res.body.clientSecret.startsWith("pi_"),
      "no usable client secret",
    );
    expect(
      res.body.amount === ctx.product.price + ctx.shipping.price,
      `intent amount ${res.body.amount} does not match cart + ongkir`,
    );
    ctx.pendingOrderId = res.body.orderId;
    return `${res.body.orderNumber} ${rupiah(res.body.amount)} ${res.body.currency}`;
  });

  await step("An unconfirmed payment leaves the order PENDING and the cart intact", async () => {
    const order = await api("GET", `/api/payments/orders/${ctx.pendingOrderId}`, {
      token: ctx.token,
    });
    expectStatus(order, 200, "payment order status");
    const status = (order.body.order ?? order.body).status;
    expect(status === "PENDING", `unpaid order should stay PENDING, got ${status}`);
    const cart = await api("GET", "/api/cart", { token: ctx.token });
    const items = cart.body.items ?? cart.body;
    expect(items.length > 0, "an abandoned checkout emptied the cart");
    await api("DELETE", "/api/cart", { token: ctx.token });
    return "PENDING, keranjang tidak hilang";
  });

  await step("Earn and redeem a second voucher", async () => {
    const catalogue = await api("GET", "/api/products");
    const others = (catalogue.body.products ?? catalogue.body).filter(
      (p) => p.id !== ctx.product.id,
    );
    let points = await myPoints();
    for (const product of others) {
      if (points >= ctx.voucher.pointsCost) break;
      const res = await api("POST", `/api/products/${product.id}/reviews`, {
        token: ctx.token,
        body: { rating: 5, text: "Repurchase ketiga, teksturnya masih sama enaknya." },
      });
      if ([200, 201].includes(res.status)) points += res.body.pointsAwarded ?? 10;
    }
    expect(points >= ctx.voucher.pointsCost, `only reached ${points} points`);
    const res = await api("POST", `/api/vouchers/${ctx.voucher.id}/redeem`, { token: ctx.token });
    expect([200, 201].includes(res.status), `redeem: ${res.status}`);
    ctx.cardVoucher = res.body.userVoucher ?? res.body.voucher ?? res.body;
    return `voucher kedua siap (${points} poin terkumpul)`;
  });

  await step("Card checkout applies the voucher", async () => {
    await api("POST", `/api/cart/${ctx.product.id}`, { token: ctx.token });
    const res = await api("POST", "/api/payments/intent", {
      token: ctx.token,
      body: {
        addressId: ctx.address.id,
        shippingOptionId: ctx.shipping.id,
        paymentMethodId: ctx.stripeMethod.id,
        userVoucherId: ctx.cardVoucher.id,
      },
    });
    expect([200, 201].includes(res.status), `intent: ${res.status} ${JSON.stringify(res.body)?.slice(0, 200)}`);
    expect(res.body.discount > 0, "the card path ignored the voucher");
    expect(
      res.body.amount === res.body.subtotal + res.body.shippingFee - res.body.discount,
      "the discount is not reflected in the amount Stripe will charge",
    );
    ctx.voucherOrderId = res.body.orderId;
    return `${rupiah(res.body.subtotal)} + ${rupiah(res.body.shippingFee)} - ${rupiah(res.body.discount)} = ${rupiah(res.body.amount)}`;
  });

  await step("The reserved voucher cannot be spent elsewhere", async () => {
    const mine = await api("GET", "/api/vouchers/mine", { token: ctx.token });
    const held = (mine.body.vouchers ?? mine.body).find((v) => v.id === ctx.cardVoucher.id);
    expect(held && held.usable === false, "an unpaid card checkout left the voucher spendable");
    await api("POST", `/api/cart/${ctx.product.id}`, { token: ctx.token });
    const res = await api("POST", "/api/orders", {
      token: ctx.token,
      body: {
        addressId: ctx.address.id,
        shippingOptionId: ctx.shipping.id,
        paymentMethodId: ctx.payment.id,
        userVoucherId: ctx.cardVoucher.id,
      },
    });
    expect([400, 409].includes(res.status), `expected a refusal, got ${res.status}`);
    return `${res.status} ${res.body?.error?.code ?? ""}`;
  });

  // Reserving is only acceptable if walking away gives the voucher back.
  await step("Abandoning the card checkout returns the voucher", async () => {
    const res = await api("POST", "/api/payments/intent", {
      token: ctx.token,
      body: {
        addressId: ctx.address.id,
        shippingOptionId: ctx.shipping.id,
        paymentMethodId: ctx.stripeMethod.id,
        userVoucherId: ctx.cardVoucher.id,
      },
    });
    expect([200, 201].includes(res.status), `retry intent: ${res.status} ${JSON.stringify(res.body)?.slice(0, 200)}`);
    expect(res.body.discount > 0, "the voucher was not returned in time for the retry");
    expect(res.body.orderId !== ctx.voucherOrderId, "the retry reused the abandoned order");

    const stale = await api("GET", `/api/payments/orders/${ctx.voucherOrderId}`, {
      token: ctx.token,
    });
    const status = (stale.body.order ?? stale.body).status;
    expect(status === "CANCELLED", `the superseded order should be CANCELLED, got ${status}`);
    await api("DELETE", "/api/cart", { token: ctx.token });
    return "voucher kembali, pesanan lama dibatalkan";
  });

  // --- Report -------------------------------------------------------------

  const width = Math.max(...results.map((r) => r.name.length));
  console.log("");
  for (const r of results) {
    const mark = r.ok ? "PASS" : "FAIL";
    console.log(`  ${mark}  ${r.name.padEnd(width)}  ${String(r.ms).padStart(5)}ms  ${r.note}`);
  }
  console.log(
    `\n  ${results.length - failed}/${results.length} steps passed` +
      (failed ? ` - ${failed} FAILED\n` : "\n"),
  );
  process.exit(failed ? 1 : 0);
}

main().catch((error) => {
  console.error("\nSmoke test crashed:", error);
  process.exit(1);
});

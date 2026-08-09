# Laporan Pengujian

Lima lapis pengujian, masing-masing menjawab pertanyaan yang berbeda:

| Lapis | Pertanyaan yang dijawab | Hasil |
| --- | --- | --- |
| Smoke test | Apakah alur pengguna sungguhan masih bisa diselesaikan? | 53/53 lokal |
| Postman / Newman | Apakah setiap endpoint menepati kontrak dan batas aksesnya? | 310/310 lokal |
| Lighthouse | Apakah halamannya cepat, bisa diakses, dan sehat? | 94 / 100 / 100 / 100 (desktop, produksi) |
| Evaluasi akurasi AI | Seberapa benar analisis kulitnya? | 80,0% top-1 (n=20, CI 95% 58–92%) |
| Keamanan siber | Tahan brute-force, banjir permintaan, dan celah umum? | Lihat §5 — semua terkonfirmasi bekerja |

Tanggal jalan: 7 Agustus 2026 (retest kedua di hari yang sama, setelah tab
navigasi Brand Baru dan perbaikan checkout voucher).

---

## 1. Smoke test

`node server/scripts/smoke.mjs [baseUrl]` — juga tersedia sebagai
`npm run test:smoke` di dalam `server/`.

Bedanya dengan koleksi Postman: smoke test **mendaftar akun baru lalu benar-benar
belanja dengan akun itu**. Yang diuji bukan satu endpoint, melainkan apakah
rangkaian langkahnya masih nyambung — keranjang terisi, pesanan terbentuk,
poin bertambah, voucher terpakai, produk penjual terbit.

53 langkah, dijalankan berurutan, **53/53 lulus** pada retest ini. Cakupannya:

**Permukaan publik.** Health, katalog, Baru Rilis, detail produk, opsi kirim &
bayar, Brand Spotlight, feed ulasan, dan penolakan 401 untuk endpoint tertutup.

**Alur pembeli.** Daftar → login → wishlist → keranjang (kuantitas benar) →
alamat → checkout. Aritmetikanya diperiksa: `total = subtotal + ongkir − diskon`.
Setelah checkout keranjang harus kosong dan pesanan muncul di riwayat. Akun lain
yang menebak id pesanan harus ditolak.

**Kuis, langganan, ulasan.** Kuis dijawab sampai menghasilkan trial kit; AURA+
dilanggan lalu dibatalkan; ulasan ditulis dan poinnya diperiksa naik persis
sebanyak `pointsAwarded`. Mengulas produk yang sama dua kali harus 409.

**Voucher, termasuk jalur kartu.** Ditukar dari poin yang dikumpulkan lewat
jalur normal (menulis ulasan, bukan disuntik ke database), lalu dibelanjakan
dua kali — sekali di checkout COD/transfer, sekali lagi di jalur pembayaran
kartu:

1. Redeem tanpa poin cukup → `INSUFFICIENT_POINTS`.
2. Voucher ditukar, saldo turun tepat sebesar `pointsCost`.
3. Checkout: Rp99.000 + Rp8.000 − Rp10.000 = **Rp97.000**.
4. Voucher yang sama dipakai lagi → `VOUCHER_USED`. Voucher orang lain →
   `INVALID_VOUCHER`.
5. **Jalur kartu**: voucher kedua ditukar, `POST /api/payments/intent` diberi
   `userVoucherId` dan diskonnya benar-benar mengurangi jumlah yang ditagih
   Stripe. Voucher itu langsung terkunci (`VOUCHER_USED` jika dicoba di tempat
   lain) selama PaymentIntent hidup.
6. Checkout kartu yang **ditinggalkan** (tidak pernah dikonfirmasi) harus
   mengembalikan voucher ke akun dan membatalkan pesanan lama begitu sesi
   checkout berikutnya dimulai — supaya pembeli tidak kehilangan voucher hanya
   karena berubah pikiran soal metode bayar.

**Alur penjual dan admin.** Daftar penjual → pendaftaran brand anonim ditolak
401 → daftar brand (PENDING) → dashboard tetap terlihat saat menunggu →
tambah produk ditolak **403 STORE_NOT_APPROVED** → brand kedua dari akun yang
sama ditolak 409 → pembeli biasa ditolak dari endpoint admin → admin menyetujui
→ persetujuan kedua ditolak 409 → penjual menambah produk → produk itu muncul
di katalog publik, di Baru Rilis, dan di dashboard penjual.

**Integrasi pihak ketiga.** Stripe membuat PaymentIntent sungguhan (gratis,
tidak pernah dikonfirmasi) dan pesanannya harus tetap `PENDING` dengan keranjang
utuh. Untuk Gemini hanya status kunci yang dicek, supaya tidak memakan kuota
yang dibutuhkan evaluasi akurasi.

---

## 2. Koleksi Postman

`npm run test:api` di `server/`, dijalankan dengan Newman terhadap API lokal.

**94 request, 310 assertion, 0 gagal.** Termasuk folder khusus:

**Seller Center.** Dashboard butuh akun (401 tanpa token); akun tanpa brand
mendapat `store: null` dan bukan 404; nama produk terlalu pendek ditolak 400;
`concerns` di luar kosakata AI Scan ditolak 400; produk baru ditandai `umkm`
dan bertanggal sehingga masuk Baru Rilis tanpa langkah tambahan; penjual yang
sengaja dibiarkan PENDING membuktikan guard 403 masih hidup.

**Vouchers.** Katalog bisa dibuka tanpa akun (saldo `null`, bukan 0); urutan
termurah dulu; setiap voucher wajib punya `minSpend ≥ discountAmount`; `/mine`
dan `redeem` butuh token; voucher tak dikenal 404; akun baru yang mencoba
menukar mendapat `INSUFFICIENT_POINTS`.

**Security headers** (folder tersendiri). Memeriksa langsung lewat HTTP: header
`X-Powered-By` disembunyikan, `Content-Security-Policy` terpasang,
`X-Content-Type-Options` terpasang, dan header `RateLimit-*` benar-benar
terekspos ke pemanggil — bukan cuma diklaim di kode.

Suite penuh tidak dijalankan ulang terhadap produksi pada retest ini (itu akan
membuat puluhan akun uji baru di database Supabase yang sama setiap kali
dijalankan tanpa menambah sinyal baru, karena kodenya identik). Sebagai
gantinya produksi diverifikasi dengan pemeriksaan header langsung — lihat §5.5.

---

## 3. Lighthouse

Diaudit terhadap `https://aura-marketplace-eta.vercel.app` (build produksi
yang sudah memuat robots.txt, lihat §6) dengan Lighthouse CLI.

| Kategori | Desktop | Mobile |
| --- | --- | --- |
| Performance | **94** | **94** |
| Accessibility | **100** | **100** |
| Best Practices | **100** | **100** |
| SEO | **100** | **100** |
| Agentic browsing¹ | **100** | **100** |

Core Web Vitals: FCP 1,0 s / LCP 1,4 s / TBT 0 ms / CLS 0 (desktop);
FCP 1,5 s / LCP 3,0 s / TBT 0 ms / CLS 0 (mobile). Laporan lengkap ada di
`docs/lighthouse/*.report.html`.

¹ Kategori baru di Lighthouse yang menilai seberapa mudah agen berbasis LLM
mem-parsing halaman (nama tautan, struktur, metadata) — bukan salah satu dari
empat kategori inti, dicatat karena muncul di laporan.

**Satu temuan pada retest ini: `robots.txt` tidak ada** (skor SEO sempat 91).
File statis ditambahkan (`public/robots.txt`, mengizinkan semua crawler) dan
dites lagi — SEO naik ke 100 di kedua preset. Ditangani langsung karena ini
perubahan tanpa risiko: file statis baru, tidak menyentuh perilaku apa pun.

Tiga temuan dari putaran sebelumnya (Stripe.js yang termuat di halaman depan,
landmark `<main>` yang hilang, meta description yang hilang) tetap terjaga —
tidak ada regresi.

---

## 4. Evaluasi akurasi AI Scan

Tidak diulang pada retest ini — masih di 20/150 sampel karena kuota gratis
Gemini (±20 request/hari/model). Angka dari evaluasi terakhir:

```
Accuracy (top-1) : 80,0%  (16/20)   CI 95%: 58,4% - 91,9%
Accuracy (top-2) : 90,0%
Macro F1         : 76,7%
mAP              : 81,8%
Baseline acak    : 20,0%
```

`blackheads` tetap kelas terlemah (recall 25%, tertukar `pores`). Detail
metode dan interpretasi lengkap ada di riwayat laporan ini per 6 Agustus 2026;
tidak diubah di sini karena tidak ada data baru.

---

## 5. Uji keamanan siber

Empat sudut: brute-force kredensial, banjir permintaan (DDoS-adjacent), audit
kode statis, dan audit dependency. Semua dijalankan terhadap **API lokal**
kecuali disebutkan lain — bukan produksi, dan alasannya dijelaskan di §5.2.

### 5.1 Simulasi brute-force

Skrip menembak `/api/auth/login` dan `/api/auth/register` secepat mungkin,
persis pola yang dipakai alat credential-stuffing sungguhan.

| Target | Batas yang diklaim kode | Hasil simulasi |
| --- | --- | --- |
| `POST /api/auth/register` (flood 45x) | 40/jam, semua percobaan dihitung | **201 tepat 40 kali**, percobaan ke-41 dan seterusnya `429 RATE_LIMITED` |
| `POST /api/auth/login`, password salah (flood 25x) | 20/15 menit, hanya kegagalan dihitung | **401 tepat 20 kali**, percobaan ke-21 dan seterusnya `429 RATE_LIMITED` |
| Login dengan password **benar**, dilakukan tepat setelah limiter di atas penuh | — | **429** — ditolak juga |

Baris terakhir bukan bug. Limiter bekerja per-IP, bukan per-akun: begitu
kuota IP itu habis karena 20 kegagalan, panggilan berikutnya ditolak sebelum
sempat memeriksa password-nya sama sekali — termasuk yang benar. Ini
konsekuensi yang disengaja dari desainnya (lihat komentar di
`auth.routes.ts`), dan simulasi ini membuktikan perilakunya persis seperti
yang diklaim kode, bukan cuma di atas kertas.

Efek samping yang perlu diketahui: menjalankan skrip ini membuat login dan
registrasi dari mesin lokal benar-benar dibatasi selama sisa jendela waktunya
(±15 menit untuk login, ±1 jam untuk registrasi, dihitung dari 07:58 WIB).
Ini murni akibat menembak API lokal sendiri (mulai ±19:58 WIB); tidak
menyentuh produksi.

### 5.2 Uji beban / ketahanan DDoS

**Batasan yang sengaja dijaga: tidak ada banjir permintaan sungguhan ke
`aura-marketplace-api.vercel.app`.** Tiga alasan — Vercel melarang load-testing
tanpa pemberitahuan lebih dulu di kebijakan penggunaannya; setiap request
serverless yang dipakai bisa berbiaya nyata; dan ketahanan terhadap DDoS
volumetrik sungguhan (jutaan request dari banyak IP) adalah tanggung jawab
lapisan edge/CDN Vercel, bukan sesuatu yang bisa dibuktikan atau digagalkan
oleh kode aplikasi. Yang **bisa** diuji secara bertanggung jawab dari kode
aplikasi adalah: apakah pembatas permintaannya benar-benar menyala saat
kebanjiran, dan apakah prosesnya tetap hidup sesudahnya.

Simulasi lokal: 500 permintaan `GET /api/products` ditembakkan **bersamaan**
(bukan berurutan) ke API lokal.

```
500 permintaan bersamaan -> selesai dalam 1.356 ms
200 OK  : 300  (persis di batas 300/menit yang dikonfigurasi apiLimiter)
429     : 200  (sisanya ditolak, bukan di-antre atau membuat server ngadat)
error koneksi: 0
latensi 2xx: p50 1.109 ms | p95 1.222 ms | p99 1.227 ms
cek kesehatan setelah banjir: 200 OK dalam 9 ms
```

Pembatas global (`apiLimiter`, 300/menit per IP di `app.ts`) memotong tepat di
angka yang dikonfigurasi, tidak lebih tidak kurang, dan server tetap responsif
(9 ms) begitu banjirnya selesai — tidak ada proses yang macet atau memori yang
menumpuk. Terhadap serangan "slow request" (slowloris), server bergantung pada
batas waktu bawaan Node.js 20 (`headersTimeout` 60 dtk, `requestTimeout` 5
menit) karena tidak ada konfigurasi timeout khusus — cukup untuk kasus umum,
tapi dicatat sebagai area penguatan lanjutan kalau suatu saat trafiknya makin
besar.

### 5.3 Audit kode statis

Diperiksa manual + agen terpisah untuk delapan sudut, mencakup seluruh modul
backend (`orders`, `cart`, `addresses`, `wishlist`, `seller`, `admin`,
`vouchers`, `payments`, `brands`, `reviews`, `subscription`, `scan`) dan
bagian relevan dari frontend.

**Bersih, terverifikasi:**
- **IDOR** — setiap query yang membaca/mengubah data milik pengguna (pesanan,
  alamat, keranjang, voucher, toko) memfilter berdasarkan `userId` dari token,
  bukan cuma `id` dari URL. Endpoint admin dijaga `requireAdmin`, yang membaca
  ulang role dari database di setiap request — bukan dari isi token — supaya
  akses admin yang dicabut langsung berhenti berlaku.
- **Injeksi SQL** — nol pemakaian `$queryRaw`/`$executeRaw` mentah di seluruh
  backend; semua akses lewat query builder Prisma yang sudah terparameterisasi.
- **XSS** — nol `dangerouslySetInnerHTML` atau `innerHTML` di frontend; teks
  dari pengguna (ulasan, cerita brand) selalu lewat JSX yang di-escape React
  secara default.
- **Verifikasi webhook Stripe** — signature diperiksa (`stripe.webhooks.
  constructEvent`) sebelum payload dipercaya sama sekali; route-nya dipasang
  sebelum parser JSON supaya byte mentahnya tidak berubah.
- **Kepercayaan harga** — total, ongkir, dan diskon selalu dihitung ulang dari
  database di server; permintaan dari klien cuma boleh mengirim ID (alamat,
  opsi kirim, voucher), tidak pernah angka harga.
- **Rahasia** — nol API key atau secret yang ditulis langsung di kode; semua
  lewat `env.ts` yang divalidasi zod.

**Ditemukan dan langsung diperbaiki:**
- `jwt.verify()` tidak mengunci daftar algoritma yang diterima. Default
  `jsonwebtoken` sudah cukup aman untuk kasus ini (secret berupa string, tidak
  ada kunci RSA yang bisa dikacaukan), tapi mengunci ke `["HS256"]` secara
  eksplisit adalah praktik standar OWASP untuk menutup celah *algorithm
  confusion* — perubahan satu baris, nol risiko perilaku (lihat §6).

**Ditemukan, dicatat, sengaja belum diperbaiki:**
- Endpoint AI Scan memvalidasi tipe MIME dari header yang diklaim klien dan
  membatasi ukuran hasil decode ke 6MB, tapi tidak memeriksa byte asli file
  untuk memastikan isinya benar-benar gambar. Risikonya rendah — server tidak
  punya library decode gambar (`sharp`/`jimp` dsb.) sehingga tidak ada
  permukaan *decompression bomb* di sisi server; skenario terburuknya cuma
  kuota Gemini terbuang untuk file bukan-gambar berlabel gambar. Menunda
  perbaikan karena solusinya (pemeriksaan magic bytes) butuh dependency baru
  untuk risiko yang saat ini kecil.

### 5.4 Audit dependency (`npm audit`)

| Paket | Dependency produksi | Dependency dev |
| --- | --- | --- |
| Frontend (root) | **0 kerentanan** | 0 kerentanan |
| Backend (`server/`) | **0 kerentanan** | 19 (8 sedang, 10 tinggi, 1 kritis) |

Ke-19 temuan backend semuanya berasal dari satu rantai: `newman` +
`newman-reporter-htmlextra` (alat penjalan koleksi Postman) dan dependency
transitifnya (`handlebars`, `lodash`, `node-forge`, `postman-runtime`,
`postman-sandbox`). Ini alat pengujian yang **tidak pernah ikut ter-deploy** —
`tsc` hanya mengompilasi `src/`, bukan `devDependencies` — dan hanya berjalan
di mesin developer sendiri terhadap koleksi Postman yang juga ditulis sendiri,
bukan memproses input dari internet. Karena `--omit=dev` menunjukkan nol
kerentanan, permukaan yang benar-benar berjalan di produksi bersih. Tidak
dipaksa `npm audit fix --force` karena itu akan mengganti Newman ke versi yang
punya breaking changes, demi kerentanan yang tidak menyentuh risiko produksi.

### 5.5 Verifikasi header di produksi

Setelah redeploy (§6), dicek langsung dengan satu permintaan tunggal ke
`aura-marketplace-api.vercel.app` — bukan flood, cuma konfirmasi bahwa yang
berjalan lokal juga menyala di lingkungan sungguhan:

```
Content-Security-Policy: default-src 'self'; ...
X-Content-Type-Options: nosniff
Ratelimit-Limit: 300
Ratelimit-Policy: 300;w=60
Ratelimit-Remaining: 299
```

Header `X-Powered-By` tidak ada di respons (disembunyikan lewat
`app.disable("x-powered-by")`).

---

## 6. Perubahan yang lahir dari pengujian ini

**`public/robots.txt` ditambahkan.** Tidak ada sebelumnya, membuat skor SEO
Lighthouse mentok di 91. Perubahan statis, nol risiko.

**`jwt.verify()` dikunci ke algoritma `HS256`.** Ditemukan saat audit kode
statis (§5.3). Tidak mengubah token mana pun yang saat ini valid — semua
token yang pernah diterbitkan aplikasi ini sudah ditandatangani `HS256` lewat
`jwt.sign()` yang juga tidak menyebut algoritma lain — jadi ini murni menutup
celah teoretis, bukan mengubah perilaku untuk pengguna sah mana pun.

Keduanya sudah di-build, diverifikasi lokal, dan di-deploy ke produksi
(`npx vercel --prod --yes` di `server/` lalu di root) sebelum audit Lighthouse
§3 dan verifikasi header §5.5 dijalankan — supaya angka yang dilaporkan di
kedua bagian itu mencerminkan kondisi produksi yang sudah diperbaiki, bukan
kondisi lama.

**Rate limiter login/registrasi (dari retest sebelumnya, lihat commit
"Fix the checkout voucher bug and split login into buyer/seller") diuji ulang
di bawah simulasi serangan sungguhan (§5.1) dan terbukti berperilaku persis
seperti yang diklaim kodenya** — bukan cuma lulus review kode.

---

## 7. Retest dengan toolchain standar — Postman, Selenium, JMeter (9 Agustus 2026)

Tiga alat berbeda, tiga lapis yang tidak saling menggantikan: Postman menguji
*kontrak* API secara langsung, Selenium menguji *pengalaman* lewat UI
sungguhan di browser, JMeter menguji *ketahanan* di bawah beban bersamaan.
Semua dijalankan terhadap stack lokal (`localhost:4000` + `localhost:5173`).

### 7.1 Postman / Newman

`npm run test:api` — koleksi sudah tumbuh sejak §2: **94 request, 188
test-script, 321 assertion, 0 gagal**, selesai dalam 13,5 detik.

### 7.2 Selenium (otomasi web)

*(Appium tidak dipakai — AURA adalah web app, bukan aplikasi mobile native,
jadi tidak ada target yang relevan untuknya.)*

Skrip Python (`selenium` 4.46) mengemudikan Chrome headless persis seperti
pengguna sungguhan — klik tombol, isi form, baca hasil dari DOM — bukan
memanggil API langsung. Dua persona baru dari nol:

**Pembeli baru** — landing → login → daftar → filter kategori "Skincare"
(27 produk) → cari "serum" → buka detail produk → toggle wishlist → tambah ke
keranjang → verifikasi keranjang berisi 1 item. **10/10 langkah lulus.**

**Penjual/brand baru** — reset sesi (localStorage dikosongkan, simulasi
browser baru) → daftar sebagai Penjual → Seller Center kosong → "Daftarkan
brand" → isi form lengkap → submit → "Pendaftaran terkirim". **4/4 langkah
lulus.**

Percobaan pertama sempat menunjukkan 3 langkah gagal (filter kategori,
pencarian, buka detail produk) — setelah ditelusuri lewat log console
browser dan screenshot, penyebabnya adalah skrip pengujian yang tidak
menunggu cukup lama untuk fetch async React selesai, bukan bug aplikasi.
Setelah skrip diperbaiki (menunggu kondisi DOM yang jelas, bukan jeda waktu
tetap), percobaan kedua **lulus 14/14** — konsisten dengan hasil Postman
yang dari awal sudah 0 gagal di jalur yang sama.

### 7.3 JMeter (uji performa)

Rencana uji (`aura-loadtest.jmx`): 15 pengguna virtual, ramp-up 15 detik,
masing-masing 8 iterasi × 4 permintaan (`GET /api/products`,
`GET /api/products/new`, `GET /api/products/:id`, `POST /api/auth/login`
dengan kredensial sah) — total **480 permintaan** ke API lokal.

| Sampler | Jumlah | Error | Rata-rata | p95 | p99 |
| --- | --- | --- | --- | --- | --- |
| GET /api/products | 120 | 25,8% | 385 ms | 1.056 ms | 1.412 ms |
| GET /api/products/new | 120 | 29,2% | 305 ms | 930 ms | 1.052 ms |
| GET /api/products/:id | 120 | 25,8% | 355 ms | 945 ms | 1.062 ms |
| POST /api/auth/login | 120 | 26,7% | 1.735 ms | 3.501 ms | 3.898 ms |
| **Total** | **480** | **26,9%** | **695 ms** | **3.114 ms** | **3.513 ms** |

**Semua 129 error adalah `429 Too Many Requests` — nol `500`, nol koneksi
gagal.** Diperiksa langsung dari `responseCode` di hasil mentah, bukan
diasumsikan. Ini `apiLimiter` global (300/menit/IP, §5.2) yang menyala persis
seperti dirancang begitu 15 pengguna bersamaan mendorong lebih dari 300
permintaan gabungan dalam satu jendela menit — bukan server yang goyah.
Responsnya pun cepat (rata-rata 18 ms untuk setiap 429, karena limiter
menolak sebelum menyentuh database) dibanding 944 ms rata-rata untuk yang
lolos (200).

**Temuan yang lebih menarik: login adalah titik paling lambat di bawah
beban bersamaan** (p99 3,9 detik vs ~1,0–1,4 detik untuk endpoint baca
murni), padahal secara terpisah (Postman, satu permintaan pada satu waktu)
login biasa selesai dalam puluhan milidetik. Penyebabnya bukan database —
`bcrypt.compare()` yang memverifikasi password bersifat CPU-bound dan
sinkron; dengan 15 login diproses hampir bersamaan di satu proses Node
(tidak di-cluster), semuanya berebut event loop yang sama. Ini bukan bug,
tapi batas skalabilitas yang nyata dan spesifik: kalau lonjakan login
sungguhan pernah terjadi (mis. jam ramai promo), inilah endpoint yang akan
melambat lebih dulu. Dicatat sebagai area penguatan lanjutan (opsi:
`worker_threads` untuk bcrypt, atau menurunkan cost factor-nya), bukan
diperbaiki sekarang karena di luar cakupan permintaan pengujian ini.

Rencana uji ada di `docs/jmeter/aura-loadtest.jmx` (bisa dibuka ulang di GUI
JMeter atau dijalankan lagi via `jmeter -n -t aura-loadtest.jmx -l
results.jtl`); data mentah per-request di `docs/jmeter/results.jtl` dan
ringkasan angka di `docs/jmeter/statistics.json`. Dashboard HTML interaktif
sengaja tidak disertakan di repo — isinya menyeret seluruh library vendor
JMeter (Bootstrap, Font Awesome, dst., ±3 MB) yang tidak spesifik ke proyek
ini; bisa dibuat ulang kapan saja dengan
`jmeter -g results.jtl -o report/`.

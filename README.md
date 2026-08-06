# AURA Marketplace

Marketplace kecantikan dengan rekomendasi AI dari analisis wajah. Frontend React + backend Express/Prisma/PostgreSQL.

## Struktur proyek

```
apps aura/
├── src/            frontend (React + Vite + TypeScript)
├── server/         backend API (Express + Prisma + PostgreSQL)
├── docker-compose.yml   Postgres untuk development lokal
└── .env.example    VITE_API_URL untuk frontend
```

## Fitur

- Landing page, login/register (JWT auth)
- Beranda: pencarian, filter kategori, sort & filter (Halal/UMKM), grid produk
- **Brand Baru**: section di Beranda yang menonjolkan brand UMKM yang baru gabung, biar dapat exposure & review pertama
- **AI Scan Studio**: unggah selfie / buka kamera → foto dianalisa **Gemini VLM** dalam satu kali panggilan. Memberi skor 0-100 untuk 5 kondisi sesuai taksonomi dataset berlabel (jerawat, komedo, noda hitam, pori besar, garis halus) plus tipe kulit dan undertone, lalu dipetakan ke produk di katalog — skincare sesuai keluhan, makeup sesuai undertone
- **Beauty Quiz**: jawab beberapa pertanyaan, AI (rule-based scoring) menyusun trial kit personal termasuk produk dari brand baru
- Detail produk, wishlist, keranjang
- **Ulasan produk**: tulis ulasan (+10 poin), tandai ulasan orang lain "membantu" (+2 poin ke penulis), badge reviewer (Pemula/Aktif/Terpercaya) berdasar jumlah & kualitas ulasan
- Checkout penuh: alamat, metode pengiriman, metode pembayaran, ringkasan, riwayat pesanan
- **Pembayaran Stripe**: pilih "Kartu / E-Wallet" di checkout → halaman pembayaran dengan Stripe Payment Element (kartu + wallet sesuai perangkat). Data kartu diproses langsung oleh Stripe, tidak pernah menyentuh server (PCI-compliant). Metode lain tetap settle offline
- Akun: profil, poin, reviewer stats, dark mode
- **AURA+**: langganan bulanan yang mengirim trial kit (sample produk dari brand partner) tiap bulan

## Menjalankan secara lokal

### 1. Database

Dengan Docker:

```bash
docker compose up -d
```

Tanpa Docker (PostgreSQL native), buat role & database yang cocok dengan `server/.env.example`:

```sql
CREATE USER aura WITH PASSWORD 'aura_dev_password' CREATEDB;
CREATE DATABASE aura OWNER aura;
```

(atau pakai instance PostgreSQL lain — sesuaikan `DATABASE_URL` di `server/.env`)

### 2. Backend

```bash
cd server
cp .env.example .env
npm install
npm run prisma:migrate
npm run seed
npm run dev
```

API berjalan di `http://localhost:4000`. Detail lengkap endpoint ada di [server/README.md](server/README.md).

Login demo setelah seeding: **demo@aura.id** / **password123**

Untuk mengaktifkan AI Scan, isi `GEMINI_API_KEY` di `server/.env` — ambil gratis
di [Google AI Studio](https://aistudio.google.com/apikey). Tanpa key, aplikasi
tetap jalan penuh kecuali endpoint `/api/scan/*`.

Untuk pembayaran, isi `STRIPE_SECRET_KEY` di `server/.env` dan
`VITE_STRIPE_PUBLISHABLE_KEY` di `.env` root — ambil test key di
[Stripe Dashboard](https://dashboard.stripe.com/test/apikeys). Kartu uji:
`4242 4242 4242 4242`, expiry apa saja di masa depan, CVC apa saja.

### 3. Frontend

Dari root folder:

```bash
cp .env.example .env
npm install
npm run dev
```

Buka `http://localhost:5173`.

## Build production

```bash
# frontend
npm run build

# backend
cd server && npm run build && npm start
```

Backend juga punya `Dockerfile` untuk deploy sebagai container (lihat `server/README.md`).

## Stack

| Layer | Teknologi |
| --- | --- |
| Frontend | React 19, TypeScript, Vite |
| Backend | Express, TypeScript, Prisma ORM |
| Database | PostgreSQL |
| Auth | JWT + bcrypt |

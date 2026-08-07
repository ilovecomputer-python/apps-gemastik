# Laporan Pengujian

Empat lapis pengujian, masing-masing menjawab pertanyaan yang berbeda:

| Lapis | Pertanyaan yang dijawab | Hasil |
| --- | --- | --- |
| Smoke test | Apakah alur pengguna sungguhan masih bisa diselesaikan? | 49/49 lokal, 49/49 produksi |
| Postman / Newman | Apakah setiap endpoint menepati kontrak dan batas aksesnya? | 305/305 lokal, 302/302 produksi |
| Lighthouse | Apakah halamannya cepat, bisa diakses, dan sehat? | 93 / 100 / 100 / 100 (desktop) |
| Evaluasi akurasi AI | Seberapa benar analisis kulitnya? | 80,0% top-1 (n=20, CI 95% 58–92%) |

Tanggal jalan: 7 Agustus 2026.

---

## 1. Smoke test

`node server/scripts/smoke.mjs [baseUrl]` — juga tersedia sebagai
`npm run test:smoke` di dalam `server/`.

Bedanya dengan koleksi Postman: smoke test **mendaftar akun baru lalu benar-benar
belanja dengan akun itu**. Yang diuji bukan satu endpoint, melainkan apakah
rangkaian langkahnya masih nyambung — keranjang terisi, pesanan terbentuk,
poin bertambah, voucher terpakai, produk penjual terbit.

Empat puluh sembilan langkah, dijalankan berurutan:

**Permukaan publik.** Health, katalog, Baru Rilis, detail produk, opsi kirim &
bayar, Brand Spotlight, feed ulasan, dan penolakan 401 untuk endpoint tertutup.

**Alur pembeli.** Daftar → login → wishlist → keranjang (kuantitas benar) →
alamat → checkout. Aritmetikanya diperiksa: `total = subtotal + ongkir − diskon`.
Setelah checkout keranjang harus kosong dan pesanan muncul di riwayat. Akun lain
yang menebak id pesanan harus ditolak.

**Kuis, langganan, ulasan.** Kuis dijawab sampai menghasilkan trial kit; AURA+
dilanggan lalu dibatalkan; ulasan ditulis dan poinnya diperiksa naik persis
sebanyak `pointsAwarded`. Mengulas produk yang sama dua kali harus 409.

**Voucher.** Ini bagian yang paling banyak menahan regresi:

1. Akun baru mencoba menukar voucher termurah → ditolak `INSUFFICIENT_POINTS`.
2. Poin **dikumpulkan lewat jalur normal** — menulis ulasan sampai 50 poin.
   Tidak ada penyuntikan saldo langsung ke database, karena kalau saldonya
   disuntik, yang teruji bukan lagi loop-nya.
3. Voucher ditukar; saldo harus turun tepat sebesar `pointsCost`.
4. Checkout berikutnya: Rp99.000 + Rp8.000 − Rp10.000 = **Rp97.000**.
5. Voucher yang sama dipakai lagi → `VOUCHER_USED`.
6. Voucher milik orang lain dipakai → `INVALID_VOUCHER`.

**Alur penjual dan admin.** Daftar penjual → pendaftaran brand anonim ditolak
401 → daftar brand (PENDING) → dashboard tetap terlihat saat menunggu →
tambah produk ditolak **403 STORE_NOT_APPROVED** → brand kedua dari akun yang
sama ditolak 409 → pembeli biasa ditolak dari endpoint admin → admin menyetujui
→ persetujuan kedua ditolak 409 → penjual menambah produk → produk itu muncul
di katalog publik, di Baru Rilis, dan di dashboard penjual.

**Integrasi pihak ketiga.** Stripe membuat PaymentIntent sungguhan (gratis,
tidak pernah dikonfirmasi) dan pesanannya harus tetap `PENDING` dengan keranjang
utuh — checkout yang ditinggalkan tidak boleh menghapus keranjang. Untuk Gemini
hanya status kunci yang dicek; satu scan sungguhan memakan kuota yang dibutuhkan
evaluasi akurasi.

---

## 2. Koleksi Postman

`npm run test:api` (lokal) dan `npm run test:api:prod` (produksi), dijalankan
dengan Newman.

94 request, 305 assertion. Pembagian tugasnya sengaja dipisah dari smoke test:
koleksi ini memeriksa **kontrak dan batas akses per endpoint** — bentuk respons,
kode error, siapa yang boleh memanggil — sementara smoke test memeriksa
rangkaian langkahnya.

Dua folder baru ditambahkan pada putaran ini:

**14 Seller Center.** Dashboard butuh akun (401 tanpa token); akun tanpa brand
mendapat `store: null` dan bukan 404, karena tidak punya toko itu keadaan normal;
nama produk terlalu pendek ditolak 400; `concerns` di luar kosakata AI Scan
ditolak 400 — kalau kosakatanya bebas, produk penjual tidak akan pernah
terjaring rekomendasi hasil scan; produk baru ditandai `umkm` dan bertanggal
sehingga masuk Baru Rilis tanpa langkah tambahan; dan penjual kedua yang sengaja
dibiarkan PENDING membuktikan guard 403 masih hidup.

**15 Vouchers.** Katalog bisa dibuka tanpa akun (saldo `null`, bukan 0, karena
tidak ada yang bisa diklaim tentang saldo orang anonim); urutannya termurah dulu;
setiap voucher wajib punya `minSpend ≥ discountAmount` supaya tidak ada pesanan
yang lunas oleh diskon saja; `/mine` dan `redeem` butuh token; voucher tak
dikenal 404; akun baru yang mencoba menukar mendapat `INSUFFICIENT_POINTS`.

Selisih 3 assertion antara lokal (305) dan produksi (302) berasal dari
pemeriksaan yang bergantung konfigurasi lingkungan, bukan dari kegagalan.

---

## 3. Lighthouse

Diaudit terhadap `https://aura-marketplace-eta.vercel.app` dengan Lighthouse
13.4.1. Laporan lengkap ada di `docs/lighthouse/`.

| Kategori | Desktop | Mobile |
| --- | --- | --- |
| Performance | **93** | **94** |
| Accessibility | **100** | **100** |
| Best Practices | **100** | **100** |
| SEO | **100** | **100** |

Sebelum perbaikan: 88 / 98 / 77 / 90 (desktop) dan 87 / 98 / 77 / 90 (mobile).

Tiga temuan dan penanganannya:

**Stripe.js dimuat di halaman depan.** Entry point bawaan `@stripe/stripe-js`
menyuntikkan script Stripe begitu modulnya di-*import*, bukan saat `loadStripe()`
dipanggil. Akibatnya setiap pengunjung mengunduh 252 KB untuk script yang hanya
dipakai layar pembayaran. Diganti ke entry `@stripe/stripe-js/pure`, yang menunda
penyuntikan sampai `loadStripe()` benar-benar dipanggil. Sudah diverifikasi di
peramban: nol script Stripe di beranda, keranjang, dan checkout; script baru
muncul — bersama iframe Elements-nya — ketika halaman pembayaran dibuka.

**Tidak ada landmark `<main>`.** Pembaca layar jadi harus menyusuri seluruh
halaman untuk sampai ke isinya. Shell aplikasi dan shell landing kini memakai
`<main>`.

**Tidak ada meta description.** Ditambahkan, beserta `theme-color`.

Yang sengaja **tidak** diperbaiki: `unused-javascript` yang tersisa dan umur
cache pendek pada `js.stripe.com` — keduanya milik script Stripe sendiri, dan
mengganti Stripe Elements dengan form kartu sendiri berarti memindahkan data
kartu ke server kami, yang justru melanggar PCI-DSS.

---

## 4. Evaluasi akurasi AI Scan

`server/scripts/eval/` — sampel berimbang dari dataset **Skin v2** (lima kelas:
`acne`, `blackheads`, `dark_spots`, `pores`, `wrinkles`), diskor memakai system
instruction, prompt, schema, dan temperature yang **persis sama** dengan yang
dipakai `scan.vision.ts` di produksi.

### Angka

```
Samples evaluated: 20

CONFUSION MATRIX (baris = label, kolom = prediksi)
                    acne blackheads dark_spots      pores   wrinkles   total
acne                   4          0          0          0          0       4
blackheads             1          1          0          2          0       4
dark_spots             0          0          4          0          0       4
pores                  0          0          0          4          0       4
wrinkles               0          0          1          0          3       4

PER-CLASS
class          precision   recall      F1      AP  support
acne               80,0%   100,0%   88,9%  100,0%        4
blackheads        100,0%    25,0%   40,0%   68,1%        4
dark_spots         80,0%   100,0%   88,9%   87,5%        4
pores              66,7%   100,0%   80,0%   65,8%        4
wrinkles          100,0%    75,0%   85,7%   87,5%        4

OVERALL
  Accuracy (top-1) : 80,0%  (16/20)   CI 95%: 58,4% - 91,9%
  Accuracy (top-2) : 90,0%
  Macro F1         : 76,7%
  mAP              : 81,8%
  Baseline acak    : 20,0%
```

### Bagaimana metriknya didefinisikan

Model mengembalikan lima skor keparahan 0–100 per gambar, sedangkan dataset
memberi satu label per gambar. Karena itu dipakai dua sudut pandang:

- **Klasifikasi label tunggal** — `argmax` dari kelima skor dianggap prediksi.
  Menghasilkan confusion matrix, precision/recall/F1, dan akurasi top-1/top-2.
- **Peringkat** — skor tiap kelas diperlakukan sebagai keyakinan, lalu semua
  gambar diurutkan berdasarkan skor itu. Menghasilkan Average Precision per
  kelas (interpolasi semua titik, seperti scikit-learn/COCO); **mAP** adalah
  rata-ratanya.

Sudut pandang peringkat penting karena kondisi kulit saling tumpang tindih:
wajah berlabel `acne` sering betul-betul punya `dark_spots` juga. Argmax
menghukum itu, AP tidak.

### Apa yang boleh disimpulkan — dan apa yang tidak

**Boleh:** empat kali lipat baseline acak, dan pola kesalahannya masuk akal
secara kosmetik, bukan acak.

**Tidak boleh:** menyebut "80% akurat" tanpa kualifikasi. Dengan n=20, selang
kepercayaan 95%-nya membentang **58%–92%**. Angka tengahnya tidak cukup untuk
mengklaim performa tertentu, dan tiap kelas hanya diwakili 4 gambar — satu
gambar salah menggeser recall satu kelas sebesar 25 poin.

**Kelemahan yang paling jelas:** `blackheads`, recall 25%. Tiga dari empat
tertukar, dua di antaranya menjadi `pores`. Secara visual keduanya memang
bertetangga — komedo menyumbat pori, dan pada foto beresolusi sedang keduanya
tampil sebagai titik gelap di hidung. Ini kelemahan nyata, bukan artefak sampel
kecil, dan patut jadi target perbaikan prompt berikutnya.

### Kenapa hanya 20 gambar

Kuota gratis Gemini membatasi **±20 request per hari per model**. Sampelnya
sudah disiapkan 150 gambar dan berimbang antar kelas, dan `run.cjs` menulis
JSONL secara bertambah sehingga bisa dilanjutkan keesokan harinya ke berkas yang
sama. Untuk menyelesaikan 150 gambar dibutuhkan billing aktif di project Google
Cloud, atau beberapa hari jalan bertahap.

Angka di atas dilaporkan apa adanya, tanpa dibulatkan ke atas dan tanpa
menghilangkan selang kepercayaannya.

---

## Perubahan yang lahir dari pengujian ini

**Rate limit login dipisah dari rate limit pendaftaran.** Sebelumnya keduanya
berbagi satu penghitung 20 percobaan / 15 menit. Jaringan seluler Indonesia
menempatkan sangat banyak pelanggan di balik satu alamat CGNAT, jadi penghitung
yang ikut menghitung login **berhasil** akan mengunci satu sel dari akunnya
sendiri begitu dua puluh tetangganya masuk. Sekarang login hanya menghitung
kegagalan (`skipSuccessfulRequests`), sementara pendaftaran tetap menghitung
semua percobaan — sebab pendaftaran yang berhasil justru yang diincar penyalah
guna — dengan jendela per jam.

**Bug yang ditemukan dan masih terbuka:** halaman checkout belum punya pemilih
voucher. Backend-nya sudah menerima `userVoucherId` dan sudah terbukti benar
lewat smoke test, tapi `CheckoutPage.tsx` tidak pernah mengirimkannya, dan jalur
pembayaran kartu (`POST /api/payments/intent`) belum menerima voucher sama
sekali. Artinya poin bisa ditukar jadi voucher, tapi voucher itu belum bisa
dipakai dari antarmuka.

# Rasionalisasi Fitur & Sumber Data

Setiap fitur di AURA Marketplace harus bisa menjawab dua pertanyaan:

1. **Masalah apa yang diselesaikan?** — kalau tidak ada masalahnya, fitur itu
   hanya menambah beban antarmuka.
2. **Dari mana datanya?** — apa yang menjadi dasar output-nya, dan seberapa
   kuat dasar itu.

Dokumen ini menjawab keduanya, terutama untuk ketiga analisis AI.

---

## Bagian 1 — Analisis AI

Ketiganya berjalan dari **satu foto, satu panggilan Gemini**. Memisahnya jadi
tiga panggilan akan melipattigakan latensi dan kuota tanpa menambah informasi:
ketiga analisis membaca sinyal dari foto wajah yang sama.

Ketiganya disimpan terpisah di tabel `scan_results`, sehingga bisa ditelusuri
per pengguna dan dipakai untuk personalisasi berikutnya.

### 1.1 Analisis Kondisi Kulit

**Masalah.** Pembeli tidak tahu produk mana yang relevan dengan keluhan
kulitnya. Katalog diurutkan berdasarkan popularitas, bukan kecocokan.

**Output.** Skor 0–100 untuk lima kondisi: `acne`, `blackheads`, `dark_spots`,
`pores`, `wrinkles`. Plus tipe kulit (oily/dry/combination/normal/sensitive).

**Sumber data — kuat (dataset berlabel).**
Taksonomi lima kelas ini **diambil langsung dari dataset "Skin v2"** yang
disediakan pengguna: 9.770 foto wajah, satu folder per kelas
(`acne` 2.060, `blackheades` 1.970, `dark spots` 2.126, `pores` 1.632,
`wrinkles` 1.982). Model dibatasi hanya boleh mengeluarkan kelas-kelas itu,
sehingga output-nya sebanding langsung dengan label dataset.

**Validasi.** Diuji pada sampel acak berstrata dari dataset yang sama.
Hasil terbesar sejauh ini: **87,5% akurasi top-1, mAP 82,7% pada n=16**
(95% CI 64–97% — belum konklusif, terhambat kuota free tier).
Detail: [`server/scripts/eval/`](../server/scripts/eval/).

**Cara dipakai.** Setiap produk punya kolom `concerns[]` dengan kosakata yang
sama persis. Produk diperingkat dari jumlah severity keluhan yang ditanganinya
— jadi keluhan terberat pengguna yang paling menentukan urutan.

---

### 1.2 Analisis Personal Colour

**Masalah.** Warna lipstik/blush/eyeshadow yang "bagus" di orang lain sering
tidak cocok di kulit sendiri. Pembeli menebak, lalu kecewa dan produk tidak
terpakai.

**Output.** Satu dari **12 musim** (Light/True/Clear Spring, Light/True/Soft
Summer, Soft/True/Deep Autumn, Deep/True/Clear Winter), beserta palet warna
yang disarankan dan dihindari.

**Sumber data — sedang (teori terdokumentasi, bukan dataset berlabel).**
Ini penting untuk dinyatakan jujur: **tidak ada dataset berlabel personal
colour** dalam proyek ini. Dasarnya adalah *seasonal colour analysis*, kerangka
baku di industri kecantikan yang berakar pada teori warna Johannes Itten,
dikembangkan Suzanne Caygill, dan dipopulerkan Carole Jackson lewat
*Color Me Beautiful* (1980); sistem 12 musim adalah perluasan dari 4 musim asli.

**Cara menjaga agar tidak jadi kotak hitam.** Model **tidak diminta menebak
nama musim**. Model hanya menilai tiga atribut perseptual yang memang terlihat
di foto, dan kode kami yang menurunkan musimnya lewat aturan tetap:

| Sumbu | Nilai | Yang dinilai model |
| --- | --- | --- |
| Hue (undertone) | warm / neutral / cool | dasar warna kulit — kuning-keemasan vs pink-kebiruan |
| Value | light / medium / deep | terang-gelapnya kulit, rambut, mata secara keseluruhan |
| Chroma | soft / medium / clear | pekat-lembutnya warna alami; kontras antar fitur |

Musim diturunkan dari kombinasi ketiganya (lihat `scan.colour.ts`). Artinya
klasifikasinya **auditable** — kalau hasilnya terasa salah, bisa ditelusuri
atribut mana yang meleset, bukan sekadar "AI-nya bilang begitu".

**Batasannya.** Akurasi warna dari foto sangat bergantung pencahayaan dan white
balance kamera. Hasil diberi label "perkiraan" di UI, bukan vonis.

---

### 1.3 Analisis Skin Shade (pencocokan foundation)

**Masalah.** Salah shade foundation adalah salah satu penyebab retur dan
produk mangkrak terbesar di penjualan kosmetik online, karena pembeli tidak
bisa swatch di toko.

**Output.** Kedalaman kulit (skala 1–6) + undertone → **kode shade konkret
yang benar-benar ada di katalog**, misal `W20`.

**Sumber data — campuran; targetnya konkret.**

- **Kedalaman kulit** memakai **skala fototipe Fitzpatrick (I–VI)**,
  klasifikasi dermatologis dari T.B. Fitzpatrick (1975) yang masih jadi rujukan
  standar. Ini memberi skala yang punya dasar, bukan angka karangan.
- **Undertone** dari sumbu hue di §1.2.
- **Targetnya adalah data katalog kami sendiri.** Produk foundation memakai
  konvensi kode `N`/`W`/`C` + angka kedalaman (contoh nyata di katalog: Make
  Over Powerstay `N02`, `W20`, `C30`, `N40`). Huruf = undertone
  (Neutral/Warm/Cool), angka = kedalaman. Sistem mencocokkan undertone ke huruf
  lalu memilih angka terdekat — jadi rekomendasinya **shade yang benar-benar
  bisa dibeli**, bukan deskripsi abstrak.

**Batasannya.** Hanya berlaku untuk produk yang memakai konvensi kode tersebut.
Produk dengan nama shade deskriptif ("Rosy Nude") dicocokkan lewat palet musim
di §1.2, bukan lewat kode.

---

## Bagian 2 — Fitur Marketplace

### 2.1 New Product Launching

**Masalah — cold start.** Produk baru punya 0 penjualan dan 0 ulasan. Semua
pengurutan default (populer, rating, terlaris) menempatkannya di paling bawah,
jadi produk baru tidak pernah terlihat, jadi tidak pernah terjual — lingkaran
yang tidak bisa diputus sendiri.

**Sumber data.** `Product.createdAt` dan `Product.launchDate`. Tidak butuh
sinyal baru; masalahnya memang bukan kekurangan data, melainkan pengurutan
yang secara struktural menghukum produk baru.

**Cara dipakai.** Kanal terpisah yang diurutkan **kebalikannya** — terbaru di
atas — sehingga produk baru punya jalur penemuan yang tidak bersaing dengan
riwayat penjualan.

### 2.2 New Brand On-boarding

**Masalah.** `Store.isNewBrand` saat ini hanya bisa diisi lewat seed. Tidak ada
jalan bagi UMKM untuk benar-benar masuk ke marketplace — fitur "Brand Baru"
memajang brand yang tidak bisa bertambah.

**Sumber data.** Formulir pendaftaran → record `Store` berstatus menunggu
tinjauan. Datanya berasal dari brand itu sendiri (nama, cerita, kategori,
kontak), bukan turunan dari mana-mana.

**Kenapa penting.** Ini yang membuat klaim "Hub UMKM Digital" di Beranda benar
secara operasional, bukan sekadar label.

### 2.3 Community Review

**Masalah.** Ulasan hanya hidup di halaman produk masing-masing. Pengguna yang
sedang menjelajah tidak punya cara menemukan ulasan bagus, sehingga sistem poin
reviewer yang sudah ada tidak punya panggung — menulis ulasan bagus tidak
terlihat siapa-siapa.

**Sumber data.** Tabel `reviews` dan `review_helpful_votes` yang sudah ada.
Diurutkan dari jumlah "membantu" dan kebaruan. Tidak ada data baru yang
dikumpulkan.

**Kenapa penting.** Menutup lingkaran insentif yang sudah dibangun: ulasan
berkualitas → terlihat di feed → lebih banyak yang menandai "membantu" → poin
dan badge penulisnya naik → makin banyak ulasan organik. Ini juga yang memberi
brand baru (§2.2) ulasan pertamanya.

---

## Catatan kejujuran metodologis

Dari ketiga analisis, **hanya analisis kondisi kulit yang punya dasar dataset
berlabel dan angka validasi**. Personal colour bersandar pada teori warna yang
terdokumentasi, dan pencocokan shade bersandar pada skala Fitzpatrick plus
konvensi kode katalog kami sendiri.

Perbedaan ini disengaja untuk dinyatakan terbuka. Mengklaim ketiganya
"terlatih dari dataset" akan menyesatkan, dan akan runtuh saat ditanya juri.

# Rasionalisasi Fitur & Sumber Data

Setiap fitur di AURA Marketplace harus bisa menjawab dua pertanyaan:

1. **Masalah apa yang diselesaikan?** — kalau tidak ada masalahnya, fitur itu
   hanya menambah beban antarmuka.
2. **Dari mana datanya?** — apa yang menjadi dasar output-nya, dan seberapa
   kuat dasar itu.

Dokumen ini menjawab keduanya, terutama untuk ketiga analisis kulit/warna —
dua di antaranya AI (foto), satu survei (lihat Bagian 1).

---

## Bagian 1 — Analisis AI

Sampai versi sebelumnya, satu panggilan Gemini menilai *tiga* hal sekaligus:
kondisi kulit, tipe kulit, dan empat atribut warna — semuanya sebagai
tebakan/opini model dari sebuah foto. Itu masalah ganda: (a) kondisi kulit
dari foto tunggal secara metodologis lemah — Fitzpatrick asli bahkan
kuesioner reaksi-matahari, bukan sesuatu yang bisa dibaca dari foto — dan
(b) warna/undertone yang **ditebak** model sama sekali tidak bisa dihitung
akurasinya: tidak ada angka yang bisa diaudit, hanya opini model.

Arsitektur sekarang memisah keduanya menurut sumber data yang paling tepat
untuk masing-masing:

- **Kondisi & tipe kulit → survei (Beauty Quiz).** Ini yang paling jujur
  didapat dari laporan pengguna sendiri, bukan satu foto statis. Lihat §1.1.
- **Warna & shade → foto, tapi DIUKUR bukan ditebak.** Gemini hanya dipakai
  untuk satu tugas yang memang bisa diandalkan dari model vision: menunjuk
  **lokasi** sepetak kulit polos di foto. Dari situ, kode kami membaca pixel
  sungguhan di lokasi itu dan menghitung warnanya lewat colorimetry standar
  (CIE-Lab, ITA°) — bukan meminta model menilai "warm atau cool". Lihat
  §1.2–1.3.

### 1.1 Analisis Kondisi & Tipe Kulit

**Masalah.** Pembeli tidak tahu produk mana yang relevan dengan keluhan
kulitnya. Katalog diurutkan berdasarkan popularitas, bukan kecocokan.

**Output.** Kondisi yang dilaporkan dari lima kelas: `acne`, `blackheads`,
`dark_spots`, `pores`, `wrinkles`. Plus tipe kulit
(oily/dry/combination/normal/sensitive).

**Sumber data — laporan mandiri pengguna, lewat Beauty Quiz.**
Taksonomi lima kelas ini sama persis dengan kolom `Product.concerns[]` di
katalog (lihat `quiz.scoring.ts`), jadi keluhan yang dipilih pengguna
langsung cocok dengan produk yang benar-benar menanganinya — tanpa pencarian
kata kunci yang kabur.

Kami sebelumnya mencoba mendeteksi ini dari foto lewat Gemini, dibatasi ke
lima kelas yang sama persis dari dataset berlabel **"Skin v2"** (9.770 foto,
satu folder per kelas). Hasil ujinya **87,5% akurasi top-1, mAP 82,7%**,
tapi hanya pada **n=16 dari target 150** (95% CI 64–97%, tidak konklusif) —
terhambat kuota Gemini free tier, dan tidak pernah selesai divalidasi.
Karena kondisi kulit itu sendiri **bisa langsung ditanya ke pemiliknya**
(dan tipe kulit lebih soal perilaku dari waktu ke waktu daripada tampilan di
satu foto), kami memilih laporan mandiri: lebih akurat by definition, dan
tidak butuh validasi akurasi karena bukan prediksi — pengguna adalah ground
truth-nya sendiri. Catatan uji coba foto tetap disimpan sebagai rekaman
jujur, bukan dihapus: [`server/scripts/eval/README.md`](../server/scripts/eval/README.md).

**Cara dipakai.** Setiap produk punya kolom `concerns[]` dengan kosakata yang
sama persis. Produk diperingkat dari jumlah keluhan yang cocok, bukan
pencarian teks bebas.

---

### 1.2 Analisis Personal Colour

**Masalah.** Warna lipstik/blush/eyeshadow yang "bagus" di orang lain sering
tidak cocok di kulit sendiri. Pembeli menebak, lalu kecewa dan produk tidak
terpakai.

**Output.** Satu dari **12 musim** (Light/True/Clear Spring, Light/True/Soft
Summer, Soft/True/Deep Autumn, Deep/True/Clear Winter), beserta palet warna
yang disarankan dan dihindari.

**Sumber data — sedang untuk sistem musimnya (teori terdokumentasi, bukan
dataset berlabel); kuat untuk pengukuran warnanya (colorimetry, bukan
tebakan).**

*Sistem 12-musimnya sendiri* tetap *seasonal colour analysis*, kerangka baku
di industri kecantikan yang berakar pada teori warna Johannes Itten,
dikembangkan Suzanne Caygill, dan dipopulerkan Carole Jackson lewat
*Color Me Beautiful* (1980). Ini tetap jujur dinyatakan sebagai teori
terdokumentasi, bukan classifier berdataset — tidak ada dataset berlabel
"musim warna yang benar" di dunia ini untuk dilatih.

Yang berubah adalah **input ke sistem itu**. Gemini tidak lagi diminta
menilai hue/value/chroma dari foto — itu opini tanpa dasar terukur. Sekarang:

1. Gemini hanya menunjuk kotak lokasi (`skinPatch`) di sekitar kulit polos
   yang bersih di foto — tugas *deteksi lokasi*, bukan *penilaian warna*.
2. Kode kami membaca pixel sungguhan di kotak itu (`scan.pixels.ts`), rata-
   rata dengan trimming sederhana supaya satu titik pantulan cahaya atau
   bayangan kecil tidak mendominasi.
3. RGB itu dikonversi ke **CIE-Lab (D65)** — konversi ruang warna standar,
   independen dan bisa diverifikasi (`scan.colour.ts`,
   [`scripts/eval/colour-validate.ts`](../server/scripts/eval/colour-validate.ts)).
4. Value dan chroma di tabel di bawah **secara harfiah adalah** L* dan
   C\*ab = √(a\*²+b\*²) dari Lab — bukan kebetulan namanya mirip, memang
   itu definisinya, tinggal dikelompokkan jadi 3 pita.

| Sumbu | Nilai | Diukur dari |
| --- | --- | --- |
| Hue (undertone) | warm / neutral / cool | sudut hue di bidang a\*-b\* (Lab) — ambang batas untuk kulit dijelaskan di kode, bukan konstanta baku tunggal |
| Value | light / medium / deep | L\* (lightness), langsung dari Lab |
| Chroma | soft / medium / clear | C\*ab = √(a\*²+b\*²), langsung dari Lab |

Musim diturunkan dari kombinasi ketiganya lewat tabel tetap yang tidak
berubah (lihat `scan.colour.ts`). Rantai penuhnya tetap **auditable**: setiap
hasil akhir bisa ditelusuri balik sampai ke angka L\*/a\*/b\* mentahnya —
angka itu sendiri ditampilkan di hasil scan, bukan disembunyikan.

**Batasannya.** Akurasi warna dari foto tetap bergantung pencahayaan dan white
balance kamera — itu tidak berubah. Yang berubah adalah lapisan
ketidakpastian di ATAS itu: sebelumnya foto-yang-terpengaruh-cahaya
ditambah lagi opini subjektif model; sekarang foto-yang-terpengaruh-cahaya
diukur langsung dengan rumus yang sama setiap kali. Hasil tetap diberi label
"perkiraan" di UI, bukan vonis.

---

### 1.3 Analisis Skin Shade (pencocokan foundation)

**Masalah.** Salah shade foundation adalah salah satu penyebab retur dan
produk mangkrak terbesar di penjualan kosmetik online, karena pembeli tidak
bisa swatch di toko.

**Output.** Kedalaman kulit (skala 1–6) + undertone → **kode shade konkret
yang benar-benar ada di katalog**, misal `W20`.

**Sumber data — campuran; targetnya konkret; sekarang terukur.**

- **Kedalaman kulit** memakai penomoran **skala fototipe Fitzpatrick
  (I–VI)** dari T.B. Fitzpatrick (1975) untuk konsistensi dengan tabel
  pencocokan shade — tapi skala Fitzpatrick ASLI adalah kuesioner reaksi-
  matahari (self-report), bukan sesuatu yang bisa difoto. Yang benar-benar
  diukur dari foto adalah **ITA° (Individual Typology Angle)**, rumus
  dermatologi/cosmetic science standar dari Chardon, Cretois & Hourseau
  (1991): `ITA° = atan2(L*-50, b*) × 180/π`, dihitung dari L\*/b\* yang sama
  di §1.2. Pita ITA° yang dipublikasikan (Very Light/Light/Intermediate/
  Tan/Brown/Dark) dipetakan ke penomoran I-VI supaya satu skala kedalaman
  saja yang dipakai di seluruh sistem — lihat `itaToFitzpatrick` di
  `scan.colour.ts`.
- **Undertone** dari sumbu hue di §1.2 — sama-sama terukur, bukan ditebak.
- **Targetnya adalah data katalog kami sendiri.** Produk foundation memakai
  konvensi kode `N`/`W`/`C` + angka kedalaman (contoh nyata di katalog: Make
  Over Powerstay `N02`, `W20`, `C30`, `N40`). Huruf = undertone
  (Neutral/Warm/Cool), angka = kedalaman. Sistem mencocokkan undertone ke huruf
  lalu memilih angka terdekat — jadi rekomendasinya **shade yang benar-benar
  bisa dibeli**, bukan deskripsi abstrak.

**"Akurasi yang bisa dihitung" untuk formula deterministik.** ITA° dan
konversi Lab bukan model prediksi, jadi "akurasi" di sini bukan "seberapa
sering cocok dengan penilaian manusia" (seperti §1.1), tapi "apakah
rumusnya benar-benar dihitung dengan tepat". `colour-validate.ts` menguji
implementasi asli yang jalan di production terhadap sifat matematis yang
harus selalu benar — putih murni → L\*100, hitam murni → L\*0, abu-abu apa
pun → a\*=b\*=0, lightness naik monoton, sampel kulit terang-ke-gelap tidak
pernah melompat ke pita Fitzpatrick yang lebih terang. Semua PASS; lihat
[`scripts/eval/colour-validate.ts`](../server/scripts/eval/colour-validate.ts).

**Batasannya.** Hanya berlaku untuk produk yang memakai konvensi kode
tersebut. Produk dengan nama shade deskriptif ("Rosy Nude") dicocokkan lewat
palet musim di §1.2, bukan lewat kode. Sama seperti §1.2, hasil tetap
dipengaruhi pencahayaan foto — pengukurannya presisi, fotonya tidak selalu.

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

Tiga analisis, tiga dasar yang berbeda — dan sekarang tiga *jenis* dasar yang
berbeda pula, dipilih sesuai apa yang benar-benar bisa dipertanggungjawabkan
untuk masing-masing:

- **Kondisi & tipe kulit**: laporan mandiri pengguna lewat Beauty Quiz. Bukan
  prediksi, jadi tidak butuh "akurasi" dalam arti model — pengguna adalah
  sumber kebenarannya sendiri. Eksperimen deteksi-dari-foto sebelumnya
  (dataset berlabel, tapi validasi tidak konklusif di n=16/150) didokumentasikan
  jujur di `scripts/eval/README.md`, bukan diklaim sebagai yang sedang jalan.
- **Personal colour**: sistem 12-musimnya bersandar pada teori warna
  terdokumentasi (bukan dataset berlabel — memang tidak ada dataset seperti
  itu). Tapi *input* ke sistem itu sekarang diukur langsung dari pixel foto
  lewat CIE-Lab, bukan ditebak model.
- **Skin shade**: kedalaman dari ITA° (rumus dermatologi terpublikasi,
  dihitung — bukan ditebak) dipetakan ke penomoran Fitzpatrick untuk
  konsistensi, undertone dari sumbu yang sama, shade konkret dari konvensi
  kode katalog kami sendiri.

Mengklaim ketiganya "terlatih dari dataset", atau bahwa warna/shade "dinilai
AI", akan menyesatkan, dan akan runtuh saat ditanya juri. Yang benar dan bisa
dipertanggungjawabkan: kondisi kulit ditanya langsung, warna kulit diukur
langsung — AI hanya dipakai untuk yang memang cocok dipakai AI (menunjuk
lokasi di foto), bukan untuk menebak angka yang seharusnya dihitung.

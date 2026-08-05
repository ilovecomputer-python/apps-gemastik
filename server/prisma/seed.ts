import { PrismaClient, type Category } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

interface SeedProduct {
  slug: string;
  brand: string;
  name: string;
  price: number;
  originalPrice?: number;
  rating: number;
  soldCount: number;
  category: Category;
  halal?: boolean;
  umkm?: boolean;
  storeName: string;
  storeRating: number;
  description: string;
  hashtags: string[];
  shades?: string[];
  color: string;
}

const seedProducts: SeedProduct[] = [
  {
    slug: "wardah-velvet-lip",
    brand: "WARDAH",
    name: "Colorfit Velvet Matte Lip",
    price: 78000,
    originalPrice: 95000,
    rating: 4.8,
    soldCount: 2100,
    category: "MAKEUP",
    halal: true,
    storeName: "Glow Lokal Store",
    storeRating: 4.8,
    description:
      "Rawat kulitmu dengan formula bahan aktif pilihan yang bekerja meratakan warna kulit dan memberi kilau sehat alami. Ringan, cepat menyerap, dan nyaman dipakai sepanjang hari. 100% halal serta aman untuk kulit sensitif.",
    hashtags: ["#SkincareLokal", "#GlowAlami", "#Halal"],
    shades: ["Rosy Nude", "Chili Red", "Cocoa Brown", "Peach Bloom"],
    color: "#D3968C",
  },
  {
    slug: "somethinc-niacinamide",
    brand: "SOMETHINC",
    name: "Niacinamide 10% + Zinc Serum",
    price: 99000,
    originalPrice: 129000,
    rating: 4.9,
    soldCount: 5000,
    category: "SKINCARE",
    halal: true,
    storeName: "Glow Lokal Store",
    storeRating: 4.9,
    description:
      "Serum niacinamide dengan konsentrasi tinggi untuk membantu meratakan tekstur kulit, mengecilkan tampilan pori, dan mengontrol minyak berlebih. Diformulasikan tanpa alkohol dan aman untuk pemakaian harian.",
    hashtags: ["#SerumLokal", "#NiacinamideZinc", "#Halal"],
    color: "#839958",
  },
  {
    slug: "emina-bright-stuff",
    brand: "EMINA",
    name: "Bright Stuff Moisturizer",
    price: 38000,
    rating: 4.7,
    soldCount: 3400,
    category: "SKINCARE",
    storeName: "Beauty Hub ID",
    storeRating: 4.7,
    description:
      "Pelembap ringan dengan kandungan pencerah yang membantu menyamarkan noda hitam dan menjaga kelembapan kulit sepanjang hari. Cocok untuk kulit remaja dan pemula skincare.",
    hashtags: ["#BrightStuff", "#SkincareRemaja"],
    color: "#F2C879",
  },
  {
    slug: "makeover-powerstay",
    brand: "MAKE OVER",
    name: "Powerstay Matte Foundation",
    price: 179000,
    rating: 4.8,
    soldCount: 1200,
    category: "MAKEUP",
    storeName: "Beauty Hub ID",
    storeRating: 4.8,
    description:
      "Foundation matte tahan lama dengan coverage tinggi, dirancang untuk kulit berminyak. Formulanya ringan namun mampu bertahan hingga 12 jam tanpa terasa berat di wajah.",
    hashtags: ["#FullCoverage", "#MatteFoundation"],
    shades: ["N02", "W20", "C30", "N40"],
    color: "#C79A6B",
  },
  {
    slug: "wardah-mineral-blush",
    brand: "WARDAH",
    name: "Colorfit Mineral Blush",
    price: 59000,
    rating: 4.6,
    soldCount: 980,
    category: "MAKEUP",
    halal: true,
    storeName: "Glow Lokal Store",
    storeRating: 4.8,
    description:
      "Blush bertekstur mineral halus yang memberikan warna pipi merona alami. Diformulasikan ringan dan mudah dibaurkan, cocok untuk pemakaian sehari-hari.",
    hashtags: ["#BlushOn", "#Halal"],
    shades: ["Coral Pink", "Peach", "Rose"],
    color: "#E3A6A0",
  },
  {
    slug: "lumira-lip-cheek",
    brand: "LUMIRA",
    name: "Lip dan Cheek Balm Organik",
    price: 45000,
    rating: 4.6,
    soldCount: 320,
    category: "MAKEUP",
    umkm: true,
    storeName: "Lumira Beauty",
    storeRating: 4.6,
    description:
      "Balm multifungsi berbahan organik untuk bibir dan pipi, dibuat oleh UMKM lokal dengan bahan alami pilihan. Memberikan warna natural dan melembapkan sekaligus.",
    hashtags: ["#UMKMLokal", "#Organik"],
    color: "#C97B63",
  },
  {
    slug: "tanahku-face-oil",
    brand: "TANAHKU",
    name: "Face Oil Bunga Telang",
    price: 62000,
    rating: 4.7,
    soldCount: 180,
    category: "SKINCARE",
    umkm: true,
    storeName: "Tanahku Skincare",
    storeRating: 4.7,
    description:
      "Face oil dengan ekstrak bunga telang asli Indonesia yang membantu menutrisi dan menenangkan kulit. Diproduksi secara artisanal oleh UMKM lokal dalam batch kecil.",
    hashtags: ["#UMKMLokal", "#BungaTelang"],
    color: "#6E7FB5",
  },
  {
    slug: "rumi-body-scrub",
    brand: "RUMI",
    name: "Body Scrub Kopi Robusta",
    price: 35000,
    rating: 4.8,
    soldCount: 410,
    category: "BODYCARE",
    umkm: true,
    storeName: "Rumi Bodycare",
    storeRating: 4.8,
    description:
      "Scrub tubuh dengan butiran kopi robusta asli petani lokal, membantu mengangkat sel kulit mati dan melembutkan kulit. Aroma kopi yang menenangkan cocok untuk ritual mandi santai.",
    hashtags: ["#UMKMLokal", "#KopiRobusta"],
    color: "#7A5138",
  },
];

const shippingOptions = [
  { name: "Reguler", eta: "3-4 hari", price: 12000 },
  { name: "Hemat", eta: "5-7 hari", price: 8000 },
  { name: "Instan", eta: "Hari ini", price: 25000 },
];

const paymentMethods = [
  { name: "QRIS", groupName: "E-Wallet & QRIS" },
  { name: "GoPay", groupName: "E-Wallet & QRIS" },
  { name: "OVO", groupName: "E-Wallet & QRIS" },
  { name: "BCA Virtual Account", groupName: "Transfer Bank" },
  { name: "BNI Virtual Account", groupName: "Transfer Bank" },
  { name: "Bayar di Tempat (COD)", groupName: "Lainnya" },
];

const newBrandInfo: Record<
  string,
  { tagline: string; story: string; launchDaysAgo: number }
> = {
  "Lumira Beauty": {
    tagline: "Lip & cheek balm organik dari dapur rumahan Bandung",
    story:
      "Lumira Beauty dimulai dari eksperimen dapur rumahan di Bandung, meracik balm multifungsi dari bahan-bahan organik pilihan. Baru bergabung di AURA bulan ini — bantu mereka dapat review pertama!",
    launchDaysAgo: 12,
  },
  "Tanahku Skincare": {
    tagline: "Face oil artisanal dengan bahan asli Indonesia",
    story:
      "Tanahku Skincare memproduksi face oil dalam batch kecil menggunakan ekstrak bunga telang asli petani lokal. Brand ini baru saja launching dan sedang membangun kepercayaan lewat ulasan jujur dari pembeli pertama.",
    launchDaysAgo: 5,
  },
};

const subscriptionPlans = [
  {
    name: "AURA+ Bulanan",
    price: 49000,
    billingPeriod: "MONTHLY",
    benefits: [
      "Trial kit tiap bulan berisi sample dari brand partner",
      "Bebas ongkir semua pesanan",
      "Voucher eksklusif tiap minggu",
      "Konsultasi kulit dengan AI premium",
    ],
  },
];

const quizQuestions: {
  order: number;
  question: string;
  multiSelect: boolean;
  options: { label: string; tags: string[] }[];
}[] = [
  {
    order: 1,
    question: "Bagaimana tipe kulitmu?",
    multiSelect: false,
    options: [
      { label: "Berminyak", tags: ["oily"] },
      { label: "Kering", tags: ["dry"] },
      { label: "Kombinasi", tags: ["combination"] },
      { label: "Normal", tags: ["normal"] },
      { label: "Sensitif", tags: ["sensitive"] },
    ],
  },
  {
    order: 2,
    question: "Apa masalah kulit utamamu? (boleh pilih lebih dari satu)",
    multiSelect: true,
    options: [
      { label: "Jerawat", tags: ["acne"] },
      { label: "Kusam", tags: ["dull"] },
      { label: "Pori besar", tags: ["pores"] },
      { label: "Tanda penuaan", tags: ["aging"] },
      { label: "Dehidrasi", tags: ["dehydration"] },
    ],
  },
  {
    order: 3,
    question: "Kamu lebih fokus cari produk apa?",
    multiSelect: false,
    options: [
      { label: "Skincare", tags: ["focus-skincare"] },
      { label: "Makeup", tags: ["focus-makeup"] },
      { label: "Keduanya", tags: ["focus-skincare", "focus-makeup"] },
    ],
  },
  {
    order: 4,
    question: "Budget produk yang kamu cari?",
    multiSelect: false,
    options: [
      { label: "Hemat (di bawah Rp60rb)", tags: ["budget-low"] },
      { label: "Menengah", tags: ["budget-mid"] },
      { label: "Premium", tags: ["budget-high"] },
    ],
  },
  {
    order: 5,
    question: "Terbuka coba brand baru/UMKM lokal?",
    multiSelect: false,
    options: [
      { label: "Ya, penasaran!", tags: ["new-brand-ok"] },
      { label: "Lebih suka brand yang sudah dikenal", tags: ["new-brand-no"] },
    ],
  },
];

async function main() {
  console.log("Seeding stores & products...");

  const storeAverages = new Map<string, number[]>();
  for (const p of seedProducts) {
    const ratings = storeAverages.get(p.storeName) ?? [];
    ratings.push(p.storeRating);
    storeAverages.set(p.storeName, ratings);
  }

  const storeIdByName = new Map<string, string>();
  for (const [name, ratings] of storeAverages) {
    const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length;
    const info = newBrandInfo[name];
    const launchDate = info
      ? new Date(Date.now() - info.launchDaysAgo * 24 * 60 * 60 * 1000)
      : undefined;
    const data = {
      rating: Math.round(avg * 10) / 10,
      isNewBrand: !!info,
      tagline: info?.tagline,
      story: info?.story,
      launchDate,
    };
    const existing = await prisma.store.findFirst({ where: { name } });
    const store = existing
      ? await prisma.store.update({ where: { id: existing.id }, data })
      : await prisma.store.create({ data: { name, ...data } });
    storeIdByName.set(name, store.id);
  }

  for (const p of seedProducts) {
    await prisma.product.upsert({
      where: { slug: p.slug },
      create: {
        slug: p.slug,
        brand: p.brand,
        name: p.name,
        price: p.price,
        originalPrice: p.originalPrice,
        rating: p.rating,
        soldCount: p.soldCount,
        category: p.category,
        halal: p.halal ?? false,
        umkm: p.umkm ?? false,
        description: p.description,
        hashtags: p.hashtags,
        shades: p.shades ?? [],
        color: p.color,
        storeId: storeIdByName.get(p.storeName)!,
      },
      update: {},
    });
  }

  console.log("Seeding shipping options & payment methods...");
  for (const s of shippingOptions) {
    const existing = await prisma.shippingOption.findFirst({
      where: { name: s.name },
    });
    if (!existing) await prisma.shippingOption.create({ data: s });
  }
  for (const pm of paymentMethods) {
    const existing = await prisma.paymentMethod.findFirst({
      where: { name: pm.name },
    });
    if (!existing) await prisma.paymentMethod.create({ data: pm });
  }

  console.log("Seeding subscription plans...");
  for (const plan of subscriptionPlans) {
    const existing = await prisma.subscriptionPlan.findFirst({
      where: { name: plan.name },
    });
    if (!existing) await prisma.subscriptionPlan.create({ data: plan });
  }

  console.log("Seeding beauty quiz questions...");
  const existingQuestionCount = await prisma.quizQuestion.count();
  if (existingQuestionCount === 0) {
    for (const q of quizQuestions) {
      await prisma.quizQuestion.create({
        data: {
          order: q.order,
          question: q.question,
          multiSelect: q.multiSelect,
          options: { create: q.options },
        },
      });
    }
  } else {
    console.log("Quiz questions already exist, skipping");
  }

  console.log("Seeding demo user...");
  const demoEmail = "demo@aura.id";
  const existingUser = await prisma.user.findUnique({
    where: { email: demoEmail },
  });
  if (!existingUser) {
    const passwordHash = await bcrypt.hash("password123", 12);
    const user = await prisma.user.create({
      data: {
        email: demoEmail,
        name: "Kekez",
        passwordHash,
        points: 120,
      },
    });
    await prisma.address.createMany({
      data: [
        {
          userId: user.id,
          label: "Rumah",
          recipient: "Kekez",
          phone: "0812-3456-7890",
          fullAddress:
            "Jl. Diponegoro No. 12, RT 03/RW 05, Kutoharjo, Rembang, Jawa Tengah 59217",
          isDefault: true,
        },
        {
          userId: user.id,
          label: "Kantor",
          recipient: "Kekez",
          phone: "0812-3456-7890",
          fullAddress:
            "Jl. Pemuda No. 45, Kabongan Kidul, Rembang, Jawa Tengah 59219",
        },
      ],
    });
    console.log(`Demo user created: ${demoEmail} / password123`);
  } else {
    console.log("Demo user already exists, skipping");
  }

  console.log("Seed complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import { runBin } from "./build-utils.mjs";

/** Runs migrations + seed during the Vercel build. */
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set; skipping migrate + seed.");
  process.exit(1);
}

runBin("prisma", ["migrate", "deploy"]);
runBin("tsx", ["prisma/seed.ts"]);

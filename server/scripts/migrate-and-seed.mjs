import { spawnSync } from "node:child_process";

/**
 * Runs migrations + seed during the Vercel build.
 *
 * Supabase hands out a transaction-pooler URL (port 6543, `pgbouncer=true`).
 * Prisma Migrate cannot use it — it takes advisory locks that pgbouncer's
 * transaction mode does not support, so `migrate deploy` hangs forever. The
 * session pooler on the same host (port 5432) does support them, so derive
 * DIRECT_URL from DATABASE_URL rather than storing a second secret.
 */
function toDirectUrl(databaseUrl) {
  try {
    const url = new URL(databaseUrl);
    if (url.port === "6543") url.port = "5432";
    url.searchParams.delete("pgbouncer");
    url.searchParams.delete("connection_limit");
    return url.toString();
  } catch {
    return databaseUrl;
  }
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is not set; skipping migrate + seed.");
  process.exit(1);
}

const env = {
  ...process.env,
  DIRECT_URL: process.env.DIRECT_URL ?? toDirectUrl(databaseUrl),
};

function run(command, args) {
  console.log(`> ${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, {
    stdio: "inherit",
    env,
    shell: process.platform === "win32",
  });
  if (result.status !== 0) {
    console.error(`${command} failed with exit code ${result.status}`);
    process.exit(result.status ?? 1);
  }
}

run("prisma", ["migrate", "deploy"]);
run("tsx", ["prisma/seed.ts"]);

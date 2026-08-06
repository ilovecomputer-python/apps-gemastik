import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

/**
 * Prisma's `directUrl` needs DIRECT_URL to exist whenever the schema is
 * loaded — including plain `prisma generate` — so derive it from DATABASE_URL
 * when it isn't set explicitly rather than storing a second secret.
 *
 * Supabase hands out a transaction-pooler URL (port 6543, `pgbouncer=true`).
 * Prisma Migrate cannot use it: it takes advisory locks that pgbouncer's
 * transaction mode does not support, so `migrate deploy` hangs forever. The
 * session pooler on the same host (port 5432) does support them.
 */
export function toDirectUrl(databaseUrl) {
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

/** process.env plus a DIRECT_URL that is always present. */
export function envWithDirectUrl() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return { ...process.env };
  return {
    ...process.env,
    DIRECT_URL: process.env.DIRECT_URL ?? toDirectUrl(databaseUrl),
  };
}

function binPath(name) {
  const require = createRequire(import.meta.url);
  // node_modules/<pkg>/package.json -> node_modules/.bin/<name>
  const nodeModules = dirname(dirname(require.resolve(`${name}/package.json`)));
  const exe = process.platform === "win32" ? `${name}.cmd` : name;
  return join(nodeModules, ".bin", exe);
}

/**
 * Run a local CLI from node_modules/.bin. Spawning the bare name only works
 * when npm has put .bin on PATH — true for npm scripts, not for a script
 * invoked directly.
 *
 * Windows needs a shell to run the .cmd shim, and the path must be quoted
 * because the repo path may contain spaces. Node warns that shell args are
 * concatenated rather than escaped; that is safe here because every argument
 * is a hard-coded literal from this repo, never user input.
 */
export function runBin(name, args) {
  const isWindows = process.platform === "win32";
  const bin = binPath(name);

  console.log(`> ${name} ${args.join(" ")}`);
  const result = spawnSync(isWindows ? `"${bin}"` : bin, args, {
    stdio: "inherit",
    env: envWithDirectUrl(),
    shell: isWindows,
  });

  if (result.status !== 0) {
    console.error(`${name} failed with exit code ${result.status}`);
    process.exit(result.status ?? 1);
  }
}

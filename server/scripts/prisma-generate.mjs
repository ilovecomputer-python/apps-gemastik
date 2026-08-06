import { runBin } from "./build-utils.mjs";

/**
 * postinstall wrapper. Runs before any deploy script gets a chance to set
 * DIRECT_URL, and the schema refuses to load without it.
 */
runBin("prisma", ["generate"]);

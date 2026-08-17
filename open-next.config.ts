import { defineCloudflareConfig } from "@opennextjs/cloudflare";

/**
 * OpenNext adapter config.
 *
 * No `incrementalCache` override: every route is dynamic (the root layout reads
 * the theme cookie), so there is nothing for an incremental cache to store.
 * Adding one would mean provisioning an R2 bucket that would sit empty.
 */
export default defineCloudflareConfig();

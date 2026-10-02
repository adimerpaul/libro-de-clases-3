// Adaptador de Next.js para Cloudflare Workers (OpenNext).
// La app es dinámica (sesión en cada página), así que no usamos caché incremental en R2.
import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig({});

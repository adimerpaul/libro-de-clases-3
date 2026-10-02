import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      // Las fotos llegan ya convertidas a WebP (≈ 50–150 KB) desde el navegador.
      bodySizeLimit: "2mb",
    },
  },
};

export default nextConfig;

// En `next dev`, expone los bindings de wrangler.jsonc (D1 `DB`, R2 `PHOTOS`) emulados
// localmente en .wrangler/state, para que getCloudflareContext() funcione igual que en Cloudflare.
initOpenNextCloudflareForDev();

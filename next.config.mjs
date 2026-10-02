/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      // Fotos de estudiantes hasta 5 MB (src/lib/photos.js) + resto del formulario.
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;

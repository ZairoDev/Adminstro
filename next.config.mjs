/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ["vacationsaga.b-cdn.net", "github.com", "lh3.googleusercontent.com", "images.pexels.com"],
  },
  // Allow an isolated output dir so a production build can run without
  // clobbering a concurrent `npm run dev` .next folder.
  distDir: process.env.NEXT_DIST_DIR || ".next",

  experimental: {
    // geoip-lite loads its binary .dat data files relative to its own module
    // path at runtime. If it gets bundled by webpack, those files resolve to
    // .next/server/data/* (which don't exist) and lookups throw ENOENT.
    // Keeping it external makes it require from node_modules normally.
    serverComponentsExternalPackages: ["geoip-lite"],
    serverActions: {
      bodySizeLimit: '100mb',
      // Allow requests coming through VS Code Dev Tunnels (and any *.devtunnels.ms subdomain)
      allowedOrigins: [
        "localhost:3000",
        "*.devtunnels.ms",
        "*.ngrok.io",
        "*.ngrok-free.app",
      ],
      
    },
  },
};

export default nextConfig;

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ["vacationsaga.b-cdn.net", "github.com", "lh3.googleusercontent.com", "images.pexels.com"],
  },
  // Increase body size limit for file uploads (default is 1MB)
  experimental: {
    serverActions: {
      bodySizeLimit: '100mb',
    },
  },
};

export default nextConfig;

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ["vacationsaga.b-cdn.net", "github.com", "lh3.googleusercontent.com", "images.pexels.com"],
  },

  experimental: {
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

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  turbopack: {
    root: __dirname,
  },
  images: {
    // Add remote image domains here when needed
    remotePatterns: [],
  },
};

module.exports = nextConfig;

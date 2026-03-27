/** @type {import('next').NextConfig} */
const nextConfig = {
  // Performance optimizations
  compress: true,
  poweredByHeader: false,
  // Allow unoptimized local images in public folder
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;

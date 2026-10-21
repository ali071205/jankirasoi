/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ['10.103.206.252:3002', '10.103.206.252', 'localhost:3002'],
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: process.env.API_INTERNAL_URL || 'http://127.0.0.1:3000/api/v1/:path*',
      },
    ];
  },
};

module.exports = nextConfig;

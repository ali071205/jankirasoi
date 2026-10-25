/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  swcMinify: true,
  allowedDevOrigins: ['10.103.206.252:3002', '10.103.206.252', 'localhost:3002'],
  async rewrites() {
    const rawApiUrl =
      process.env.API_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      process.env.API_INTERNAL_URL ||
      'http://127.0.0.1:3000';
    const cleanBase = rawApiUrl.replace(/\/api\/v1\/?$/, '').replace(/\/+$/, '');
    return [
      {
        source: '/api/v1/:path*',
        destination: `${cleanBase}/api/v1/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;

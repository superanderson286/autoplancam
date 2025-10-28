/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: '/sign-in',
        destination: '/auth/sign-in',
        permanent: true,
      },
    ]
  },
};

export default nextConfig;

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'nuhirhfevxoonendpfsm.supabase.co',
      },
    ],
  },
};

export default nextConfig;

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Loaded from node_modules at runtime so pdfkit can read its font data files
    serverComponentsExternalPackages: ['pdfmake'],
  },
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

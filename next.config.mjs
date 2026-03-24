/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Global security headers are set via middleware (src/middleware.ts)
  // for finer-grained control. The ones below are a fallback.
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      ],
    },
  ],

  experimental: {
    // Prevent server-only packages from being bundled into the client.
    serverComponentsExternalPackages: ["@prisma/client", "bcryptjs"],
    serverActions: {
      bodySizeLimit: "1mb",
    },
  },
};

export default nextConfig;

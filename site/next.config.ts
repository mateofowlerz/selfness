import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/investigation/*": ["./data/investigation/*.json"],
    "/api/investigation/semantic": ["./data/investigation/semantic.json", "./data/investigation/vectors.f32"],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "upload.wikimedia.org",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;

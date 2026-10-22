import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  outputFileTracingExcludes: {
    "/private/eag/api/*": ["./eag-dev-notes.json*", "./.eag-local/**", "./.eag-secrets.local.json", "./.env*"],
  },
  outputFileTracingIncludes: {
    "/private/eag/api/*": ["./data/eag/guide.enc.json"],
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

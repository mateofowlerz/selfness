import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  // Unlisted static videos in public/swan. Header only — no page, link, or sitemap entry.
  // Keep the files out of function traces so they stay on the static CDN (250 MB function limit).
  async headers() {
    return [
      {
        source: "/swan/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex" }],
      },
    ];
  },
  outputFileTracingExcludes: {
    "/private/eag/api/*": ["./eag-dev-notes.json*", "./.eag-local/**", "./.eag-secrets.local.json", "./.env*"],
    "*": ["./public/swan/**"],
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

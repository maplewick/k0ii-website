import type { NextConfig } from "next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const monorepoRoot = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

const apiUpstream = process.env.API_UPSTREAM_URL?.replace(/\/$/, "");

const nextConfig: NextConfig = {
  transpilePackages: ["@k0ii/schemas"],
  turbopack: {
    root: monorepoRoot,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "ps99.biggamesapi.io" },
      { protocol: "https", hostname: "tr.rbxcdn.com" },
      { protocol: "https", hostname: "thumbnails.roblox.com" },
    ],
  },
  async rewrites() {
    if (!apiUpstream) return [];
    // Browser hits /api/* on the web origin; Next proxies to the API service.
    return [
      {
        source: "/api/:path*",
        destination: `${apiUpstream}/api/:path*`,
      },
    ];
  },
  async redirects() {
    return [
      { source: "/race", destination: "/roster?view=race", permanent: false },
      {
        source: "/leaderboards",
        destination: "/roster?view=clans",
        permanent: false,
      },
      {
        source: "/graphs",
        destination: "/roster?view=charts",
        permanent: false,
      },
      {
        source: "/coverage",
        destination: "/roster?view=charts",
        permanent: false,
      },
      {
        source: "/reports",
        destination: "/history?view=report",
        permanent: false,
      },
      {
        source: "/replay",
        destination: "/history?view=replay",
        permanent: false,
      },
      {
        source: "/join",
        destination: "/community?view=join",
        permanent: false,
      },
      {
        source: "/registry",
        destination: "/community?view=registry",
        permanent: false,
      },
      {
        source: "/altpoints",
        destination: "/roster?view=members",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
